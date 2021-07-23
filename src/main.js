import {getCostEnhancedTerrainlayer} from "./measure.js";
import {registerRuler} from "./patching.js";
import {registerSettings} from "./settings.js";

CONFIG.debug.terrainRuler = false

let terrainRulerTool

Hooks.once("init", () => {
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

Hooks.once('setup', async function() {
  registerSettings();
});

Hooks.once("ready", () => {
	window.terrainRuler.getCost = getCostEnhancedTerrainlayer;
})

Hooks.once('libRulerReady', async function() {
  registerRuler();
});


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

