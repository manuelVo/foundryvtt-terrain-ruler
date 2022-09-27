import {libWrapper} from "../lib/libwrapper_shim.js";
import {getPixelsFromGridPosition} from "./foundry_fixes.js"
import {measureDistances, getCostEnhancedTerrainlayer} from "./measure.js"
import {DefaultToggleState, getDefaultToggleState, registerSettings, settingsKey} from "./settings.js";

CONFIG.debug.terrainRuler = false

export let terrainRulerTool;

Hooks.once("init", () => {
	registerSettings();
	hookFunctions()
	window.terrainRuler = {
		active: getDefaultToggleState(),
		measureDistances,
	};
})

Hooks.once("ready", () => {
	window.terrainRuler.getCost = getCostEnhancedTerrainlayer;
})

// Inject Terrain Ruler into the scene control buttons
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
	libWrapper.register("terrain-ruler", "Ruler.prototype._computeDistance", computeDistance, "MIXED");
	libWrapper.register("terrain-ruler", "Ruler.prototype._endMeasurement", endMeasurement, "WRAPPER");
	libWrapper.register("terrain-ruler", "Ruler.prototype._highlightMeasurementSegment", highlightMeasurementSegment, "MIXED");
	libWrapper.register("terrain-ruler", "Ruler.prototype.toJSON", toJSON, "WRAPPER");
	libWrapper.register("terrain-ruler", "Ruler.prototype.update", rulerUpdate, "WRAPPER");
}

function onDragLeftStart(wrapped, event) {
	const layer = this.activeLayer;
	const isRuler = game.activeTool === "ruler";
	const isCtrlRuler = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL) && (layer instanceof TokenLayer);
	if (isRuler || isCtrlRuler) {
		const ruler = this.controls.ruler;
		ruler.terrainRulerIsCandidate = true;
		if (terrainRuler.active) {
			// Show terrain if the show on drag setting is enabled
			canvas.terrain._tokenDrag = true; 
			canvas.terrain.refreshVisibility();

			// Start measuring
			ruler.isTerrainRuler = true;
			return ruler._onDragStart(event);
		}
	}
	return wrapped(event);
}

function computeDistance(wrapped, gridSpaces) {
	if (this.isTerrainRuler) {
		const distances = measureDistances(this.segments, {gridSpaces});
		let totalDistance = 0;
		for (let [i, d] of distances.entries()) {
			totalDistance += d;
			let s = this.segments[i];
			s.last = i === (this.segments.length - 1);
			s.distance = d;
			s.text = this._getSegmentLabel(s, totalDistance);
		}
	}
	else {
		wrapped(gridSpaces);
	}
}

function endMeasurement(wrapped, event) {
	// Reset terrain visiblility to default state
	canvas.terrain._tokenDrag = false; 
	canvas.terrain.refreshVisibility();

	this.isTerrainRuler = false;
	this.terrainRulerIsCandidate = false;
	return wrapped(event);
}

function highlightMeasurementSegment(wrapped, segment) {
	const ray = segment.ray;
	if (!ray.terrainRulerVisitedSpaces) {
		return wrapped(segment);
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
