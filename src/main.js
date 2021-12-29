import {getPixelsFromGridPosition} from "./foundry_fixes.js"
import {measureDistances, getCostEnhancedTerrainlayer} from "./measure.js"

// Patch the function as early as possible to decrease the chance of anyone having hooked it already
patchRulerMeasure()

CONFIG.debug.terrainRuler = false

let terrainRulerTool

Hooks.once("init", () => {
	hookFunctions()
	window.terrainRuler = {
		active: true,
		measureDistances,
	};
	Object.defineProperty(game, "terrainRuler", {
		get: function() {
			console.warn("Terrain Ruler | `game.terrainRuler` is deprecated and will be removed in a future version. Use `terrainRuler` or `window.terrainRuler` instead.");
			return window.terrainRuler;
		}
	});
})

Hooks.once("ready", () => {
	window.terrainRuler.getCost = getCostEnhancedTerrainlayer;
})

// Inject Terrain Ruler into
Hooks.on("getSceneControlButtons", controls => {
	if (!terrainRulerTool) {
		terrainRulerTool = {
			name: "terrainRuler",
			title: "terrain-ruler.terrainRuler",
			icon: "fas fa-hiking",
			toggle: true,
			active: terrainRuler?.active,
			onClick: toggled => terrainRuler.active = toggled,
			visible: true,
		}
	}
	const tokenControls = controls.find(group => group.name === "token").tools
	tokenControls.splice(tokenControls.findIndex(tool => tool.name === "ruler") + 1, 0, terrainRulerTool)
})

function hookFunctions() {
	const originalCanvasOnDragLeftStartHandler = Canvas.prototype._onDragLeftStart
	Canvas.prototype._onDragLeftStart = function (event) {
		const layer = this.activeLayer
		const isRuler = game.activeTool === "ruler"
		const isCtrlRuler = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL) && (layer.name === "TokenLayer")
		if (terrainRuler.active && (isRuler || isCtrlRuler)) {
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
		if (ray.terrainRulerVisitedSpaces)
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
		if (!options.enableTerrainRuler)
			return originalGridLayerMeasureDistances.call(this, segments, options)
		return measureDistances(segments)
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

function strInsertBefore(haystack, needle, strToInsert) {
	const pos = haystack.indexOf(needle);
	if (pos === -1)
		return haystack
	return haystack.slice(0, pos) + strToInsert + haystack.slice(pos);
}

function patchRulerMeasure() {
	let code = Ruler.prototype.measure.toString()
	// Replace CRLF with LF in case foundry.js has CRLF for some reason
	code = code.replace(/\r\n/g, "\n")
	// Remove function signature and closing curly bracket (those are on the first and last line)
	code = code.slice(code.indexOf("\n"), code.lastIndexOf("\n"))

	code = strInsertAfter(code, "segments, {gridSpaces", ", enableTerrainRuler: this.isTerrainRuler")

	// "Hex Token Size Support" support
	code = strInsertBefore(code, "findMovementToken", "CONFIG.hexSizeSupport.");
	code = strInsertBefore(code, "getEvenSnappingFlag", "CONFIG.hexSizeSupport.");
	code = strInsertBefore(code, "findVertexSnapPoint", "CONFIG.hexSizeSupport.");

	Ruler.prototype.measure = new Function("destination", "{gridSpaces=true}={}", code)
}
