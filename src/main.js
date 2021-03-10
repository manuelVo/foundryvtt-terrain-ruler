import {getPixelsFromGridPosition} from "./foundry_fixes.js"
import {measureDistances} from "./measure.js"

// Patch the function as early as possible to decrease the chance of anyone having hooked it already
patchRulerMeasure()

CONFIG.debug.terrainRuler = false

let terrainRulerTool

Hooks.once("init", () => {
	hookFunctions()
	game.terrainRuler = {
		active: true,
		measureDistances,
	}
})

// Inject Terrain Ruler into
Hooks.on("getSceneControlButtons", controls => {
	if (!terrainRulerTool) {
		terrainRulerTool = {
			name: "terrainRuler",
			title: "terrain-ruler.terrainRuler",
			icon: "fas fa-hiking",
			toggle: true,
			active: game.terrainRuler?.active,
			onClick: toggled => game.terrainRuler.active = toggled,
			visible: false,
		}
	}
	const tokenControls = controls.find(group => group.name === "token").tools
	tokenControls.splice(tokenControls.findIndex(tool => tool.name === "ruler") + 1, 0, terrainRulerTool)
})

function hookFunctions () {
	const originalCanvasOnDragLeftStartHandler = Canvas.prototype._onDragLeftStart
	Canvas.prototype._onDragLeftStart = function (event) {
		const layer = this.activeLayer
		const isRuler = game.activeTool === "ruler"
		const isCtrlRuler = game.keyboard.isCtrl(event) && (layer.name === "TokenLayer")
		if (game.terrainRuler.active && (isRuler || isCtrlRuler)) {
			const ruler = this.controls.ruler
			ruler.isTerrainRuler = true
			return ruler._onDragStart(event)
		}
		return originalCanvasOnDragLeftStartHandler.call(this, event)
	}

	const originalEndMeasurementHandler = Ruler.prototype._endMeasurement
	Ruler.prototype._endMeasurement = function (event) {
		this.isTerrainRuler = false
		return originalEndMeasurementHandler.call(this)
	}

	const originalRulerHighlightMeasurement = Ruler.prototype._highlightMeasurement
	Ruler.prototype._highlightMeasurement = function (ray) {
		if (this.isTerrainRuler)
			highlightMeasurement.call(this, ray)
		else
			originalRulerHighlightMeasurement.call(this, ray)
	}

	const originalRulerToJSON = Ruler.prototype.toJSON
	Ruler.prototype.toJSON = function () {
		const json = originalRulerToJSON.call(this)
		json["isTerrainRuler"] = this.isTerrainRuler
		return json
	}

	const originalRulerUpdate = Ruler.prototype.update
	Ruler.prototype.update = function (data) {
		this.isTerrainRuler = data.isTerrainRuler
		originalRulerUpdate.call(this, data)
	}

	const originalGridLayerMeasureDistances = GridLayer.prototype.measureDistances
	GridLayer.prototype.measureDistances = function (segments, options={}) {
		if (this.type === CONST.GRID_TYPES.GRIDLESS || !options.enableTerrainRuler)
			return originalGridLayerMeasureDistances.call(this, segments, options)
		return measureDistances(segments)
	}

	const originalSceneControlsGetData = SceneControls.prototype.getData
	SceneControls.prototype.getData = function (options) {
		if (canvas?.grid?.type !== undefined)
			terrainRulerTool.visible = canvas?.grid.type !== CONST.GRID_TYPES.GRIDLESS
		return originalSceneControlsGetData.call(this, options)
	}
}

function highlightMeasurement(ray) {
	for (const space of ray.terrainRulerVisitedSpaces) {
		const [x, y] = getPixelsFromGridPosition(space.x, space.y);
		canvas.grid.highlightPosition(this.name, {x, y, color: this.color})
	}
}

function strInsertAfter(haystack, needle, strToInsert) {
	const pos = haystack.indexOf(needle) + needle.length
	return haystack.slice(0, pos) + strToInsert + haystack.slice(pos)
}

function patchRulerMeasure() {
	let code = Ruler.prototype.measure.toString()
	// Replace CRLF with LF in case foundry.js has CRLF for some reason
	code = code.replace(/\r\n/g, "\n")
	// Remove function signature and closing curly bracket (those are on the first and last line)
	code = code.slice(code.indexOf("\n"), code.lastIndexOf("\n"))

	code = strInsertAfter(code, "segments, {gridSpaces", ", enableTerrainRuler: this.isTerrainRuler")
	Ruler.prototype.measure = new Function("destination", "{gridSpaces=true}={}", code)
}
