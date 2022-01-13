export const DiagonalRule = {
	CHEBYSHEV: 0, // distance = max(distanceX, distanceY)
	APPROXIMATION: 1, // Every second diagonal costs double
	MANHATTAN: 2 // distance = distanceX + distanceY
};

export const DiagonalCostType = {
	MULTIPLICATIVE: 0,
	ADDITIVE: 1
}

export function getMeasurementRules() {
	let rules = {};
	switch (game.system.id) {
		case "pf2e":
			rules.diagonalRule = DiagonalRule.APPROXIMATION;
			rules.diagonalCostType = DiagonalCostType.ADDITIVE;
			break;
		case "l5r5e":
			rules.diagonalRule = DiagonalRule.MANHATTAN;
			rules.diagonalCostType = DiagonalCostType.ADDITIVE;
			rules.terrainAppliesOnEnter = false;
			break;
	}
	if (canvas.grid.diagonalRule === "5105")
		rules.diagonalRule = DiagonalRule.APPROXIMATION;

	rules.diagonalRule = rules.diagonalRule ?? DiagonalRule.CHEBYSHEV;
	rules.diagonalCostType = rules.diagonalCostType ?? DiagonalCostType.MULTIPLICATIVE;
	rules.terrainAppliesOnEnter = rules.terrainAppliesOnEnter ?? true;

	return rules;
}
