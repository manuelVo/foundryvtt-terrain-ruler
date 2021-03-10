import {getGridPositionFromPixels} from "./foundry_fixes.js"
import {Line} from "./line.js"
import {calculateVisitedSpaces} from "./foundry_imports.js"

export function measureDistances(segments) {
	if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS)
		throw new Error("Terrain Ruler's measureDistances function cannot be used on gridless scenes")

	if (CONFIG.debug.terrainRuler) {
		if (!canvas.terrainRulerDebug?._geometry) {
			canvas.terrainRulerDebug = canvas.controls.addChild(new PIXI.Graphics())
		}
		canvas.terrainRulerDebug.clear()
	}

	if (canvas.grid.type === CONST.GRID_TYPES.SQUARE)
		return measureDistancesSquare(segments)
	else
		return measureDistancesHex(segments)
}

function measureDistancesSquare(segments) {
	let noDiagonals = 0

	return segments.map((segment => {
		const ray = segment.ray
		ray.terrainRulerVisitedSpaces = []
		const start = pixelsToGridPosition(ray.A)
		const end = pixelsToGridPosition(ray.B)

		// The following code will break if start === end, so we return the trivial result early
		if (start === end)
			return 0

		ray.terrainRulerVisitedSpaces.push({x: start.x, y: start.y, distance: 0})

		const direction = {x: Math.sign(end.x - start.x), y: Math.sign(end.y - start.y)}
		const current = start
		let distance = 0

		// If the ruler is vertical just move along the y axis until we reach our goal
		if (direction.x === 0) {
			for (let y = current.y;y !== end.y;y += direction.y) {
				const cost = canvas.terrain.costGrid[y + direction.y]?.[current.x]?.multiple ?? 1
				distance += cost * canvas.dimensions.distance
				ray.terrainRulerVisitedSpaces.push({x: current.x, y: y + direction.y, distance})
			}
		}
		else {
			// If the ruler is horizontal we skip calculating diagonals
			if (direction.y !== 0) {
				// To handle rulers that are neither horizontal nor vertical we always move along the y axis until the
				// line of the ruler intersects the next vertical grid line. Then we move one step to the right and continue
				const line = new Line(start, end)
				let nextXStepAt = calculateNextXStep(current, line, direction)
				while (current.y !== end.y) {
					let isDiagonal = false
					if (nextXStepAt === current.y) {
						current.x += direction.x
						nextXStepAt = calculateNextXStep(current, line, direction)
						// If the next step is going along the y axis this is a diagonal so we're doing that step immediately
						if (nextXStepAt !== current.y) {
							isDiagonal = true
							current.y += direction.y
							// Making a diagonal step forces us to refresh nextXStepAt
							nextXStepAt = calculateNextXStep(current, line, direction)
						}
					}
					else {
						current.y += direction.y
					}
					if (CONFIG.debug.terrainRuler)
						debugStep(current.x, current.y, 0x008800)
					const cost = canvas.terrain.costGrid[current.y]?.[current.x]?.multiple ?? 1
					distance += cost * canvas.dimensions.distance

					// Diagonal Handling
					if (isDiagonal) {
						// PF2 diagonal rules
						if (game.system.id === "pf2e") {
							distance += noDiagonals * canvas.dimensions.distance
							noDiagonals = noDiagonals === 1 ? 0 : 1
						}
						// Generic 5/10/5 rule
						else if (canvas.grid.diagonalRule === "5105") {
							// Every second diagonal costs twice as much
							noDiagonals += cost

							// How many second diagonals do we have?
							const diagonalCost = noDiagonals >> 1 // Integer divison by two
							// Store the remainder
							noDiagonals %= 2

							// Apply the cost for the diagonals
							distance += diagonalCost * canvas.dimensions.distance
						}
						// If neither of the above match treat diagonals as regular steps (5/5/5 rule)
					}
					ray.terrainRulerVisitedSpaces.push({x: current.x, y: current.y, distance})
				}
			}

			// Move along the x axis until the target is reached
			for (let x = current.x;x !== end.x;x += direction.x) {
				const cost = canvas.terrain.costGrid[current.y]?.[x + direction.x]?.multiple ?? 1
				distance += cost * canvas.dimensions.distance
				ray.terrainRulerVisitedSpaces.push({x: x + direction.x, y: current.y, distance})
			}
		}

		return distance
	}))
}

function measureDistancesHex(segments) {
	return segments.map(segment => {
		const ray = segment.ray
		calculateVisitedSpaces(ray)
		let distance = 0
		for (const space of ray.terrainRulerVisitedSpaces) {
			const cost = canvas.terrain.costGrid[space.y]?.[space.x]?.multiple ?? 1
			distance += cost * canvas.dimensions.distance
			space.distance = distance
		}
		ray.terrainRulerVisitedSpaces.unshift({...pixelsToGridPosition(ray.A), distance: 0})
		return distance
	})
}

// Determines at which y-coordinate we need to make our next step along the x axis
function calculateNextXStep(current, line, direction) {
	const verticalIntersectionY = line.calcY(current.x + direction.x / 2)
	const horizontalIntersectionX = line.calcX(current.y + direction.y / 2)

	// The next step along the x axis is gnerally where the line intersects the next vertical grid line
	let nextXStepAt = Math.round(verticalIntersectionY)
	if (CONFIG.debug.terrainRuler)
		debugStep(current.x + direction.x / 2, nextXStepAt, 0x888800, 9)

	// The next step along the x axis calculated above might be one step too early.
	// This happens because the intersection with the vertial indicates that we must move along the y axis.
	// However most of the line is still in the previous square, so we need to move one additional step along
	// the x axis to more closely match the path of the line.

	// abs(m) > 1 means that the line moves faster along the y axis than along the x axis
	if (Math.abs(line.m) > 1) {
		if ((direction.y > 0 && verticalIntersectionY < nextXStepAt) ||
		    (direction.y < 0 && verticalIntersectionY > nextXStepAt))
				nextXStepAt -= direction.y
	}
	// In the else case the line moves faster along the x axis than along the y axis
	else {
		// If the next step is along the y axis we might need to do some correction
		if (nextXStepAt !== current.y) {
			if ((direction.x > 0 && horizontalIntersectionX > current.x) ||
				(direction.x < 0 && horizontalIntersectionX < current.x))
				nextXStepAt -= direction.y
		}
	}
	if (CONFIG.debug.terrainRuler) {
		debugStep(current.x + direction.x / 2, line.calcY(current.x + direction.x / 2))
		debugStep(current.x + direction.x / 2, nextXStepAt, 0x880000, 9)
	}
	return nextXStepAt
}

function pixelsToGridPosition(pos) {
	const [x, y] = getGridPositionFromPixels(pos.x, pos.y)
	return {x, y}
}

function debugStep(x, y, color=0x000000, radius=5) {
	canvas.terrainRulerDebug.lineStyle(4, color).drawCircle((x + 0.5) * canvas.grid.w, (y + 0.5) * canvas.grid.h, radius)
}
