import { terrainRulerTool, updateTerrainRulerState } from "./main.js";

export const settingsKey = "terrain-ruler";

export const DefaultToggleState = Object.freeze({
	ON: 0,
	OFF: 1,
	REMEMBER: 2,
});

export function registerSettings() {
	game.settings.register(settingsKey, "defaultToggleState", {
		name: "terrain-ruler.settings.defaultToggleState.name",
		hint: "terrain-ruler.settings.defaultToggleState.hint",
		scope: "client",
		config: true,
		type: Number,
		default: DefaultToggleState.ON,
		choices: {
			0: "terrain-ruler.settings.defaultToggleState.choices.on",
			1: "terrain-ruler.settings.defaultToggleState.choices.off",
			2: "terrain-ruler.settings.defaultToggleState.choices.remember",
		},
		onChange: (value) => {
			if (value === DefaultToggleState.REMEMBER)
				game.settings.set(settingsKey, "lastToggleState", terrainRuler.active);
		},
	});

	game.settings.register(settingsKey, "lastToggleState", {
		scope: "client",
		config: false,
		type: Boolean,
		default: true,
	});

	game.keybindings.register(settingsKey, "toggleTerrainRuler", {
		name: "terrain-ruler.keybinding",
		onDown: toggleTerrainRuler,
		precedence: -1,
	});
}

export function getDefaultToggleState() {
	switch (game.settings.get(settingsKey, "defaultToggleState")) {
		case DefaultToggleState.ON:
			return true;
		case DefaultToggleState.OFF:
			return false;
		case DefaultToggleState.REMEMBER:
			return game.settings.get(settingsKey, "lastToggleState");
	}
}

function toggleTerrainRuler() {
	const newState = !terrainRuler.active;
	terrainRulerTool.active = newState;
	ui.controls.render();
	updateTerrainRulerState(newState);
	const ruler = canvas.controls.ruler;
	if (ruler.terrainRulerIsCandidate) {
		ruler.isTerrainRuler = newState;
		if (ruler._state === Ruler.STATES.MEASURING) {
			const mousePosition = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.tokens);
			ruler.measure(mousePosition);
		}
	}
}
