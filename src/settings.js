// ----- SETTINGS -----
export function registerSettings() {
  // register switch to measure 5-10-5 costs differently
	game.settings.register("terrain-ruler", "15-15-15", {
			name: 'Average 5-10-5 cost',
			hint: 'If using the dnd5e 5-10-5 system setting, measure terrain cost such that doubling the cost results in 15-15-15 on a diagonal move instead of 10-20-10. Ignored otherwise.',
			scope: "world",
			config: true,
			default: false,
			type: Boolean
		});

	game.settings.register("terrain-ruler", "use-elevation", {
			name: 'Use Elevation',
			hint: 'If Elevation Ruler module is installed, consider elevation information from that ruler when moving through terrain. Will take average elevation between two points for intermediate positions. If Elevation Ruler module is not present, consider starting token elevation, if any.',
			scope: "world",
			config: true,
			default: game.modules.get("elevationruler")?.active,
			type: Boolean
		});

	game.settings.register("terrain-ruler", "count-tokens", {
			name: 'Count Tokens as Difficult Terrain (Gridless)',
			hint: 'If Use Elevation is selected, count movement through token spaces on gridless terrain as difficult (x2) terrain. Ignored otherwise',
			scope: "world",
			config: true,
			default: game.modules.get("elevationruler")?.active,
			type: Boolean
		});
}
