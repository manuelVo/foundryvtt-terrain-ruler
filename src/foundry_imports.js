// This is a modified version of Ruler._highlightMeasurement from 0.7.9
export function calculateVisitedSpaces(ray) {
	ray.terrainRulerVisitedSpaces = []
	const spacer = canvas.scene.data.gridType === CONST.GRID_TYPES.SQUARE ? 1.41 : 1;
	const nMax = Math.max(Math.floor(ray.distance / (spacer * Math.min(canvas.grid.w, canvas.grid.h))), 1);
	const tMax = Array.fromRange(nMax + 1).map(t => t / nMax);

	// Track prior position
	let prior = null;

	// Iterate over ray portions
	for (let [i, t] of tMax.entries()) {
		let { x, y } = ray.project(t);

		// Get grid position
		let [x0, y0] = (i === 0) ? [null, null] : prior;
		let [x1, y1] = canvas.grid.grid.getGridPositionFromPixels(x, y);
		if (x0 === x1 && y0 === y1) continue;

		// Highlight the grid position
		const currentSpace = {x: y1, y: x1}

		// Skip the first one
		prior = [x1, y1];
		if (i === 0) continue;

		// If the positions are not neighbors, also highlight their halfway point
		if (!canvas.grid.isNeighbor(x0, y0, x1, y1)) {
			let th = tMax[i - 1] + (0.5 / nMax);
			let { x, y } = ray.project(th);
			let [x1h, y1h] = canvas.grid.grid.getGridPositionFromPixels(x, y);
			ray.terrainRulerVisitedSpaces.push({x: y1h, y: x1h})
		}
		ray.terrainRulerVisitedSpaces.push(currentSpace)
	}
}
