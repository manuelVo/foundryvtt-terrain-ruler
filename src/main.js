import {measureDistancesSquare} from "./measure.js"

// Patch the function as early as possible to decrease the chance of anyone having hooked it already
patchRulerMeasure()

CONFIG.debug.terrainRuler = false

let terrainRulerTool

Hooks.once("init", () => {
	hookFunctions()
})

// Inject Terrain Ruler into
Hooks.on("getSceneControlButtons", controls => {
	if (!terrainRulerTool) {
		terrainRulerTool = {
			name: "terrainRuler",
			title: "terrain-ruler.terrainRuler",
			icon: "fas fa-hiking",
			visible: false,
		}
	}
	const tokenControls = controls.find(group => group.name === "token").tools
	tokenControls.splice(tokenControls.findIndex(tool => tool.name === "ruler") + 1, 0, terrainRulerTool)
})

Hooks.on("canvasReady", (canvas) => {
	terrainRulerTool.visible = canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS
	ui.controls.render()
})

function hookFunctions () {
	const originalCanvasOnDragLeftStartHandler = Canvas.prototype._onDragLeftStart
	Canvas.prototype._onDragLeftStart = function (event) {
		if (game.activeTool === "terrainRuler") {
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

	const originalGridLayerMeasureDistances = GridLayer.prototype.measureDistances
	GridLayer.prototype.measureDistances = function (segments, options={}) {
		if (!options.enableTerrainRuler)
			return originalGridLayerMeasureDistances.call(this, segments, options)
		return measureDistances(segments)
	}
}

function measureDistances(segments) {
	if (CONFIG.debug.terrainRuler) {
		if (!canvas.terrainRulerDebug?._geometry) {
			canvas.terrainRulerDebug = canvas.controls.addChild(new PIXI.Graphics())
		}
		canvas.terrainRulerDebug.clear()
	}

	return measureDistancesSquare(segments)
}

function highlightMeasurement(ray) {
	for (const square of ray.terrainRulerSquares) {
		const [x, y] = getPixelsFromGridPosition(square.x, square.y);
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

// Wrapper to fix a FoundryVTT bug that causes the return values of canvas.grid.grid.getPixelsFromGridPosition to be ordered inconsistently
// https://gitlab.com/foundrynet/foundryvtt/-/issues/4705
function getPixelsFromGridPosition(xGrid, yGrid) {
	const [x, y] = canvas.grid.grid.getPixelsFromGridPosition(xGrid, yGrid)
	if (canvas.grid.type === CONST.GRID_TYPES.SQUARE)
		return [y, x]
	return [x, y]
}
