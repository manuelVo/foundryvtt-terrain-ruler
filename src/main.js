import {libWrapper} from "../lib/libwrapper_shim.js";
import {getPixelsFromGridPosition} from "./foundry_fixes.js"
import {measureDistances, getCostEnhancedTerrainlayer} from "./measure.js"
import {DefaultToggleState, getDefaultToggleState, registerSettings, settingsKey} from "./settings.js";

// Patch the function as early as possible to decrease the chance of anyone having hooked it already
patchRulerMeasure()

CONFIG.debug.terrainRuler = false

export let terrainRulerTool;

Hooks.once("init", () => {
	registerSettings();
	hookFunctions()
	window.terrainRuler = {
		active: getDefaultToggleState(),
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
			onClick: updateTerrainRulerState,
			visible: true,
		}
	}
	const tokenControls = controls.find(group => group.name === "token").tools
	tokenControls.splice(tokenControls.findIndex(tool => tool.name === "ruler") + 1, 0, terrainRulerTool)
})

export function updateTerrainRulerState(newState) {
	terrainRuler.active = newState;
	if (game.settings.get(settingsKey, "defaultToggleState") === DefaultToggleState.REMEMBER)
		game.settings.set(settingsKey, "lastToggleState", newState);
}

function hookFunctions() {
	libWrapper.register("terrain-ruler", "Canvas.prototype._onDragLeftStart", onDragLeftStart, "MIXED");
	libWrapper.register("terrain-ruler", "Ruler.prototype._endMeasurement", endMeasurement, "WRAPPER");
	libWrapper.register("terrain-ruler", "Ruler.prototype._highlightMeasurement", highlightMeasurement, "MIXED");
	libWrapper.register("terrain-ruler", "Ruler.prototype.toJSON", toJSON, "WRAPPER");
	libWrapper.register("terrain-ruler", "Ruler.prototype.update", rulerUpdate, "WRAPPER");
	libWrapper.register("terrain-ruler", "GridLayer.prototype.measureDistances", gridLayerMeasureDistances, "MIXED");
}

function onDragLeftStart(wrapped, event) {
	const layer = this.activeLayer;
	const isRuler = game.activeTool === "ruler";
	const isCtrlRuler = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL) && (layer.name === "TokenLayer");
	if (isRuler || isCtrlRuler) {
		const ruler = this.controls.ruler;
		ruler.terrainRulerIsCandidate = true;
		if (terrainRuler.active) {
			// Show Terrain
			if (game.settings.get("enhanced-terrain-layer", "show-on-drag"))
				canvas.terrain.visible = true;

			// Start measuring
			ruler.isTerrainRuler = true;
			return ruler._onDragStart(event);
		}
	}
	return wrapped(event);
}

function endMeasurement(wrapped, event) {
	// Reset terrain visiblility to default state
	canvas.terrain.visible = (canvas.terrain.showterrain || ui.controls.activeControl == "terrain");

	this.isTerrainRuler = false;
	this.terrainRulerIsCandidate = false;
	return wrapped(event);
}

function highlightMeasurement(wrapped, ray) {
	if (!ray.terrainRulerVisitedSpaces) {
		return wrapped(ray);
	}
	for (const space of ray.terrainRulerVisitedSpaces) {
		const [x, y] = getPixelsFromGridPosition(space.x, space.y);
		canvas.grid.highlightPosition(this.name, {x, y, color: this.color});
	}
}

function toJSON(wrapped) {
	const json = wrapped();
	json["isTerrainRuler"] = this.isTerrainRuler;
	return json;
}

function rulerUpdate(wrapped, data) {
	this.isTerrainRuler = data.isTerrainRuler;
	wrapped(data);
}

function gridLayerMeasureDistances(wrapped, segments, options={}) {
	if (!options.enableTerrainRuler)
		return wrapped(segments, options);
	return measureDistances(segments);
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
