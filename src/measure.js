import {getGridPositionFromPixels} from "./foundry_fixes.js"
import {calculateVisitedSpaces} from "./foundry_imports.js"
import {Arc, calcDistance, Circle, Line, Segment, toRad} from "./geometry.js"
import {DiagonalCostType, DiagonalRule, getMeasurementRules} from "./systems.js"

export function measureDistances(segments, options={}) {
	if (!options.costFunction)
		options.costFunction = terrainRuler.getCost

	if (CONFIG.debug.terrainRuler) {
		if (!canvas.terrainRulerDebug?._geometry) {
			canvas.terrainRulerDebug = canvas.controls.addChild(new PIXI.Graphics())
		}
		canvas.terrainRulerDebug.clear()
	}

	if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid)
		return measureDistancesGridless(segments, options);
	else if (canvas.grid.type === CONST.GRID_TYPES.SQUARE)
		return measureDistancesSquare(segments, options)
	else
		return measureDistancesHex(segments, options)
}

export function getCostEnhancedTerrainlayer(x, y, options={}) {
	return canvas.terrain.cost({x, y}, options);
}

function measureDistancesSquare(segments, options) {
	const costFunction = options.costFunction;
	const measurementRules = getMeasurementRules();
	let noDiagonals = options?.terrainRulerInitialState?.noDiagonals ?? 0;

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
				let cost;
				if (measurementRules.terrainAppliesOnEnter)
					cost = costFunction(current.x, y + direction.y, options);
				else
					cost = costFunction(current.x, y, options);
				distance += cost * canvas.dimensions.distance
				ray.terrainRulerVisitedSpaces.push({x: current.x, y: y + direction.y, distance})
			}
		}
		else {
			// If the ruler is horizontal we skip calculating diagonals
			if (direction.y !== 0) {
				// To handle rulers that are neither horizontal nor vertical we always move along the y axis until the
				// line of the ruler intersects the next vertical grid line. Then we move one step to the right and continue
				const line = Line.fromPoints(pixelsToDecimalGridPosition(ray.A), pixelsToDecimalGridPosition(ray.B));
				let nextXStepAt = calculateNextXStep(current, end, line, direction);
				while (current.y !== end.y) {
					let isDiagonal = false
					const previous = {...current}; // Make a shallow copy
					if (nextXStepAt === current.y) {
						current.x += direction.x
						nextXStepAt = calculateNextXStep(current, end, line, direction);
						// If the next step is going along the y axis this is a diagonal so we're doing that step immediately
						if (nextXStepAt !== current.y) {
							isDiagonal = true
							current.y += direction.y
							// Making a diagonal step forces us to refresh nextXStepAt
							nextXStepAt = calculateNextXStep(current, end, line, direction);
						}
					}
					else {
						current.y += direction.y
					}
					if (CONFIG.debug.terrainRuler)
						debugStep(current.x, current.y, 0x008800)
					let cost;
					if (measurementRules.terrainAppliesOnEnter)
						cost = costFunction(current.x, current.y, options);
					else
						cost = costFunction(previous.x, previous.y, options);
					distance += cost * canvas.dimensions.distance

					// Diagonal Handling
					if (isDiagonal) {
						if (measurementRules.diagonalRule === DiagonalRule.APPROXIMATION) {
							if (measurementRules.diagonalCostType === DiagonalCostType.MULTIPLICATIVE)
								noDiagonals += cost;
							else
								noDiagonals += 1;

							// How many second diagonals do we have?
							const diagonalCost = noDiagonals >> 1; // Integer divison by two

							// Store the remainder
							noDiagonals %= 2;

							// Apply the cost for the diagonals
							distance += diagonalCost * canvas.dimensions.distance
						}
						else if (measurementRules.diagonalRule === DiagonalRule.MANHATTAN) {
							if (measurementRules.diagonalCostType == DiagonalCostType.MULTIPLICATIVE)
								distance += cost * canvas.dimensions.distance;
							else
								distance += canvas.dimensions.distance;
						}
						// If neither of the above match treat diagonals as regular steps (chebyshev rule - diagonalCostType doesn't matter under this rule)
					}
					ray.terrainRulerVisitedSpaces.push({x: current.x, y: current.y, distance})
				}
			}

			// Move along the x axis until the target is reached
			for (let x = current.x;x !== end.x;x += direction.x) {
				let cost;
				if (measurementRules.terrainAppliesOnEnter)
					cost = costFunction(x + direction.x, current.y, options);
				else
					cost = costFunction(x, current.y, options);
				distance += cost * canvas.dimensions.distance
				ray.terrainRulerVisitedSpaces.push({x: x + direction.x, y: current.y, distance})
			}
		}

		ray.terrainRulerFinalState = {noDiagonals};
		return distance
	}))
}

function measureDistancesHex(segments, options) {
	const costFunction = options.costFunction;
	const measurementRules = getMeasurementRules();
	return segments.map(segment => {
		const ray = segment.ray
		calculateVisitedSpaces(ray)
		const startSpace = pixelsToGridPosition(ray.A);
		let previousSpace = startSpace;
		let distance = 0
		for (const space of ray.terrainRulerVisitedSpaces) {
			let cost;
			if (measurementRules.terrainAppliesOnEnter)
				cost = costFunction(space.x, space.y, options);
			else
				cost = costFunction(previousSpace.x, previousSpace.y, options);
			distance += cost * canvas.dimensions.distance
			space.distance = distance
			previousSpace = space;
		}
		ray.terrainRulerVisitedSpaces.unshift({...startSpace, distance: 0})
		return distance
	})
}

function measureDistancesGridless(segments, options) {
	const costFunction = options.costFunction;
	const pinpointDistances = options.pinpointDistances ?? new Map();

	const terrainEdges = collectTerrainEdges();
	if (CONFIG.debug.terrainRuler)
		debugEdges(terrainEdges);

	let lastSegmentDistance = 0;
	return segments.map(segment => {
		const ray = segment.ray;
		const rulerSegment = Segment.fromPoints(ray.A, ray.B);
		const intersections = terrainEdges.map(edge => edge.intersection(rulerSegment)).flat().filter(point => point !== null);
		intersections.push(ray.A);
		intersections.push(ray.B);
		if (rulerSegment.isVertical) {
			intersections.sort((a, b) => Math.abs(a.y - ray.A.y) - Math.abs(b.y - ray.A.y));
		}
		else {
			intersections.sort((a, b) => Math.abs(a.x - ray.A.x) - Math.abs(b.x - ray.A.x));
		}
		if (CONFIG.debug.terrainRuler)
			intersections.forEach(intersection => debugStep(intersection.x, intersection.y));
		const distance = Array.from(iteratePairs(intersections)).reduce((distance, [start, end]) => {
			const deltaX = end.x - start.x;
			const deltaY = end.y - start.y;
			let segmentLength;
			if (start.x === end.x)
				segmentLength = Math.abs(deltaY);
			else if (start.y === end.y)
				segmentLength = Math.abs(deltaX);
			else
				segmentLength = calcDistance(start, end);
			const cost = costFunction((start.x + end.x) / 2, (start.y + end.y) / 2, options);
			if (CONFIG.debug.terrainRuler)
				canvas.terrainRulerDebug.lineStyle(2, cost === 1 ? 0x009900 : 0x990000).drawPolygon([start.x, start.y, end.x, end.y]);
			const segmentDistance = segmentLength * cost / canvas.dimensions.size * canvas.dimensions.distance;

			for (const pinpointDistance of pinpointDistances.keys()) {
				if (pinpointDistance >= distance + lastSegmentDistance && pinpointDistance < distance + segmentDistance + lastSegmentDistance) {
					const targetLen = pinpointDistance - distance - lastSegmentDistance;
					const pinpointX = start.x + deltaX * targetLen / segmentDistance;
					const pinpointY = start.y + deltaY * targetLen / segmentDistance;
					pinpointDistances.set(pinpointDistance, {x: pinpointX, y: pinpointY});
				}
			}

			return distance + segmentDistance;
		}, 0);

		lastSegmentDistance += distance;
		return distance;
	});
}

// Collects the edges of all sources of terrain in one array
function collectTerrainEdges() {
	const terrainEdges = canvas.terrain.placeables.reduce((edges, terrain) => edges.concat(getEdgesFromPolygon(terrain)), []);
	const templateEdges = canvas.templates.placeables.reduce((edges, template) => {
		const shape = template.shape;
		if (template.data.t === "cone") {
			const radius = template.data.distance * canvas.dimensions.size / canvas.dimensions.distance;
			const direction = toRad(template.data.direction + 180);
			const angle = toRad(template.data.angle);
			const startDirection = direction - angle / 2;
			const endDirection = direction + angle / 2;
			edges = edges.concat([
				new Arc({x: template.data.x, y: template.data.y}, radius, direction, angle),
				Segment.fromPoints({x: template.data.x, y: template.data.y}, {x: template.data.x - Math.cos(startDirection) * radius, y: template.data.y - Math.sin(startDirection) * radius}),
				Segment.fromPoints({x: template.data.x, y: template.data.y}, {x: template.data.x - Math.cos(endDirection) * radius, y: template.data.y - Math.sin(endDirection) * radius}),
			]);
		}
		else if (shape instanceof PIXI.Polygon) {
			edges = edges.concat(getEdgesFromPolygon(template));
		}
		else if (shape instanceof PIXI.Circle) {
			edges.push(new Circle({x: template.x + shape.x, y: template.y + shape.y}, shape.radius));
		}
		else if (shape instanceof NormalizedRectangle) {
			const points = [
				{x: template.x + shape.x, y: template.y + shape.y},
				{x: template.x + shape.x + shape.width, y: template.y + shape.y},
				{x: template.x + shape.x + shape.width, y: template.y + shape.y + shape.height},
				{x: template.x + shape.x, y: template.y + shape.y + shape.height},
			];
			edges = edges.concat([
				Segment.fromPoints(points[0], points[1]),
				Segment.fromPoints(points[1], points[2]),
				Segment.fromPoints(points[2], points[3]),
				Segment.fromPoints(points[3], points[0]),
			]);
		}
		else {
			console.warn("Terrain Ruler | Unkown measurement template shape ignored", shape);
		}
		return edges;
	}, []);
	return terrainEdges.concat(templateEdges);
}

function getEdgesFromPolygon(poly) {
	const points = poly.shape.points;
	const edges = [];
	for (let i = 0;i * 2 < poly.shape.points.length - 2;i++) {
		edges.push(Segment.fromPoints({x: poly.x + points[i * 2], y: poly.y + points[i * 2 + 1]}, {x: poly.x + points[i * 2 + 2], y: poly.y + points[i * 2 + 3]}));
	}
	return edges;
}

// Determines at which y-coordinate we need to make our next step along the x axis
function calculateNextXStep(current, end, line, direction) {
	if (current.x === end.x) {
		return end.y;
	}
	const verticalIntersectionY = line.calcY(current.x + direction.x / 2)
	const horizontalIntersectionX = line.calcX(current.y + direction.y / 2)

	// The next step along the x axis is gnerally where the line intersects the next vertical grid line
	let nextXStepAt = Math.round(verticalIntersectionY)
	if (CONFIG.debug.terrainRuler)
		debugStep(current.x + direction.x / 2, nextXStepAt, 0x888800, 9)

	// The next step along the x axis calculated above might be one step too late.
	// This happens because the intersection with the vertial indicates that we must move along the y axis.
	// However most of the line is still in the previous square, so we need to move one additional step along
	// the x axis to more closely match the path of the line.

	// abs(m) > 1 means that the line moves faster along the y axis than along the x axis
	if (Math.abs(line.m) > 1) {
		// If the last step is along the x axis, force it to become a diagonal
		if (nextXStepAt === end.y && current.x + direction.x === end.x) {
			nextXStepAt -= direction.y;
		}
		else if ((direction.y > 0 && verticalIntersectionY < nextXStepAt && nextXStepAt - direction.y >= current.y) ||
		    (direction.y < 0 && verticalIntersectionY > nextXStepAt && nextXStepAt - direction.y <= current.y))
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

function pixelsToDecimalGridPosition(pos) {
	return {x: pos.x / canvas.grid.w - 0.5, y: pos.y / canvas.grid.h - 0.5};
}

function* iteratePairs(arr) {
	for (let i = 0;i < arr.length - 1;i++) {
		yield [arr[i], arr[i + 1]];
	}
}

function debugStep(x, y, color=0x000000, radius=5) {
	if (canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS) {
		x = (x + 0.5) * canvas.grid.w;
		y = (y + 0.5) * canvas.grid.h;
	}
	canvas.terrainRulerDebug.lineStyle(4, color).drawCircle(x, y, radius);
}

function debugEdges(edges) {
	for (const edge of edges) {
		const painter = canvas.terrainRulerDebug;
		painter.lineStyle(2, 0x000099)
		if (edge instanceof Arc) {
			painter.arc(edge.center.x, edge.center.y, edge.radius, edge.direction - edge.angle / 2 + Math.PI, edge.direction + edge.angle / 2 + Math.PI);
		}
		else if (edge instanceof Circle) {
			painter.drawCircle(edge.center.x, edge.center.y, edge.radius);
		}
		else {
			painter.drawPolygon([edge.p1.x, edge.p1.y, edge.p2.x, edge.p2.y]);
		}
	}
}
