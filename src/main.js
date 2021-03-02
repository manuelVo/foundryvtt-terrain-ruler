import {Line} from "./line.js"

// Patch the function as early as possible to decrease the chance of anyone having hooked it already
patchRulerMeasure()

CONFIG.debug.terrainRuler = false
let debugGraphics = null

Hooks.once("init", () => {
	hookFunctions()
})

// Inject Terrain Ruler into
Hooks.on("getSceneControlButtons", controls => {
	const terrainRuler = {
		name: "terrainRuler",
		title: "terrain-ruler.terrainRuler",
		icon: "fas fa-hiking",
	}
	const tokenControls = controls.find(group => group.name === "token").tools
	tokenControls.splice(tokenControls.findIndex(tool => tool.name === "ruler") + 1, 0, terrainRuler)
})

function hookFunctions () {
	const originalCanvasOnClickLeftHandler = Canvas.prototype._onClickLeft
	Canvas.prototype._onClickLeft = function (event) {
		if (game.activeTool === "terrainRuler") {
			return this.controls.ruler._onClickLeft(event)
		}
		return originalCanvasOnClickLeftHandler.call(this, event)
	}

	const originalCanvasOnDragLeftStartHandler = Canvas.prototype._onDragLeftStart
	Canvas.prototype._onDragLeftStart = function (event) {
		if (game.activeTool === "terrainRuler") {
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
		if (this.isTerrainRuler)
			highlightMeasurement.call(this, ray)
		else
			originalRulerHighlightMeasurement.call(this, ray)
	}

	const originalGridLayerMeasureDistances = GridLayer.prototype.measureDistances
	GridLayer.prototype.measureDistances = function (segments, options={}) {
		if (!options.enableTerrainRuler)
			return originalGridLayerMeasureDistances.call(this, segments, options)
		return measureDistances(segments)
	}
}

function measureDistances(segments) {
	if (CONFIG.debug.terrainRuler) {
		if (!debugGraphics) {
			debugGraphics = canvas.controls.addChild(new PIXI.Graphics())
		}
		debugGraphics.clear()
	}

	let noDiagonals = 0

	return segments.map((segment => {
		// TODO Hex support
		const ray = segment.ray
		ray.terrainRulerSquares = []
		const start = pixelsToGridPosition(ray.A)
		const end = pixelsToGridPosition(ray.B)

		// The following code will break if start === end, so we return the trivial result early
		if (start === end)
			return 0

		ray.terrainRulerSquares.push({x: start.x, y: start.y, distance: 0})

		const direction = {x: Math.sign(end.x - start.x), y: Math.sign(end.y - start.y)}
		const current = start
		let distance = 0

		// If the ruler is vertical just move along the y axis until we reach our goal
		if (direction.x === 0) {
			for (let y = current.y;y !== end.y;y += direction.y) {
				const cost = canvas.terrain.costGrid[y + direction.y]?.[current.x]?.multiple ?? 1
				distance += cost * canvas.dimensions.distance
				ray.terrainRulerSquares.push({x: current.x, y: y + direction.y, distance})
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
					// Handle 5/10/5 rule if enabled
					if (isDiagonal && canvas.grid.diagonalRule === "5105") {
						// Every second diagonal costs twice as much
						noDiagonals += cost

						// How many second diagonals do we have?
						const diagonalCost = noDiagonals >> 1 // Integer divison by two
						// Store the remainder
						noDiagonals %= 2

						// Apply the cost for the diagonals
						distance += diagonalCost * canvas.dimensions.distance
					}
					ray.terrainRulerSquares.push({x: current.x, y: current.y, distance})
				}
			}

			// Move along the x axis until the target is reached
			for (let x = current.x;x !== end.x;x += direction.x) {
				const cost = canvas.terrain.costGrid[current.y]?.[x + direction.x]?.multiple ?? 1
				distance += cost * canvas.dimensions.distance
				ray.terrainRulerSquares.push({x: x + direction.x, y: current.y, distance})
			}
		}

		return distance
	}))
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
	pos = canvas.grid.grid.getGridPositionFromPixels(pos.x, pos.y)
	// canvas.grid.grid.getGridPositionFromPixels returns [y, x] for SquareGrid and HexGrid
	return {x: pos[1], y: pos[0]}
}

function highlightMeasurement(ray) {
	for (const square of ray.terrainRulerSquares) {
		const [y, x] = canvas.grid.grid.getPixelsFromGridPosition(square.x, square.y);
		canvas.grid.highlightPosition(this.name, {x, y, color: this.color})
	}
}

function debugStep(x, y, color=0x000000, radius=5) {
	debugGraphics.lineStyle(4, color).drawCircle((x + 0.5) * canvas.grid.size, (y + 0.5) * canvas.grid.size, radius)
}

function strInsertAfter(haystack, needle, strToInsert) {
	const pos = haystack.indexOf(needle) + needle.length
	return haystack.slice(0, pos) + strToInsert + haystack.slice(pos)
}

function patchRulerMeasure() {
	let code = Ruler.prototype.measure.toString()
	// Replace CRLF with LF in case foundry.js has CRLF for some reason
	code = code.replace(/\r\n/g, "\n")
	// Remove function signature and closing curly bracket (those are on the first and last line)
	code = code.slice(code.indexOf("\n"), code.lastIndexOf("\n"))

	code = strInsertAfter(code, "segments, {gridSpaces", ", enableTerrainRuler: this.isTerrainRuler")
	Ruler.prototype.measure = new Function("destination", "{gridSpaces=true}={}", code)
}
