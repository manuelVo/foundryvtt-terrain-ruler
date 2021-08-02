export class Line {
	constructor(m, b, p1) {
		this.m = m;
		this.b = b;
		this.p1 = p1;
	}

	static fromPoints(p1, p2) {
		// Bring line into y=mx+b form
		const m = (p1.y - p2.y) / (p1.x - p2.x);
		const b = p1.y - m * p1.x;
		return new Line(m, b, p1);
	}

	get isVertical() {
		return !isFinite(this.m);
	}

	calcY(x) {
		return this.m * x + this.b;
	}

	calcX(y) {
		return (y - this.b) / this.m;
	}

	// Assumes 'other' is a line as well
	intersection(other) {
		// Are both lines vertical?
		if (this.isVertical && other.isVertical) {
			// Paralell lines never intersect, for our purposes, since we don't count overlapping lines as intersection
			return [];
		}

		// Are the lines paralell?
		if (Math.abs(this.m - other.m) < 0.005) {
			// Paralell lines never intersect, for our purposes, since we don't count overlapping lines as intersection
			return [];
		}

		// Is one of the segments vertical?
		if (this.isVertical || other.isVertical) {
			let vertical, regular;
			if (this.isVertical) {
				vertical = this;
				regular = other;
			}
			else {
				vertical = other;
				regular = this;
			}
			const intersectionX = vertical.p1.x;
			const intersectionY = regular.calcY(intersectionX);
			return [{x: intersectionX, y: intersectionY, vertical, regular}];
		}

		// Calculate x coordinate of intersection point between both lines
		// Find intersection point: x * m1 + b1 = x * m2 + b2
		// Solve for x: x = (b1 - b2) / (m2 - 1)
		const intersectionX = (this.b - other.b) / (other.m - this.m);
		return [{x: intersectionX, y: this.calcY(intersectionX)}];
	}

	getPerpendicularThroughPoint(p) {
		const m = -1 / this.m;
		const b = p.y - m * p.x;
		return new Line(m, b, p);
	}
}

export class Segment extends Line {
	constructor(p1, p2, m, b) {
		super(m, b, p1);
		this.p2 = p2;
	}

	static fromPoints(p1, p2) {
		// Bring line into y=mx+b form
		const m = (p1.y - p2.y) / (p1.x - p2.x);
		const b = p1.y - m * p1.x;
		return new Segment(p1, p2, m, b);
	}

	// Assumes 'other' is a segment
	intersection(other) {
		const intersection = super.intersection(other);
		if (intersection.length === 0)
			return intersection;
		const intersectionX = intersection[0].x;
		if (intersection[0].vertical) {
			const vertical = intersection[0].vertical;
			const regular = intersection[0].regular;
			const intersectionY = intersection[0].y;
			// We check y for the vertical line because x doesn't change on vertical lines.
			// We check x for the regular line, becuase it *could* be horizontal (it cannot be vertical, we checked this before)
			// and for horizontal lines y doesn't change
			if (isBetween(intersectionY, vertical.p1.y, vertical.p2.y) && isBetween(intersectionX, regular.p1.x, regular.p2.x))
				return intersection;
			else
				return [];
		}
		else {
			// The segments intersect if the intersection point of the lines lies within both segments
			if (isBetween(intersectionX, this.p1.x, this.p2.x) && isBetween(intersectionX, other.p1.x, other.p2.x))
				return intersection;
			else
				return [];
		}
	}
}

export class Circle {
	constructor(center, radius) {
		this.center = center;
		this.radius = radius;
	}

	// Assumes 'other' is a segment
	intersection(other) {
		// To start out, we treat the segment as a line. Later we'll filter out any intersections that are not on the segment.

		// We first seach for the closest point of the line to the center.
		// If intersections exist, that is the halfway point between both intersections
		const perpendicular = other.getPerpendicularThroughPoint(this.center);
		const closestPoint = perpendicular.intersection(other)[0];

		// Calculate how far the closest point on the line is away from the circles center
		const closestDistance = calcDistance(this.center, closestPoint);

		// closestDistance > radius means 0 intersections
		// closestDistance == radius the line is a tangent
		// closestDistance < radius means 2 intersections
		// We only care about the intersections, so we filter the other cases out
		if (closestDistance >= this.radius)
			return [];

		// Calculate the angle of the perpendicular relative to the global coordiante system
		const perpendicularAngle = Math.atan2(this.center.y - closestPoint.y, this.center.x - closestPoint.x);

		// Calculate the angle between the perpendicular and the first intersection
		const intersectionToPerpendicularAngle = Math.acos(closestDistance / this.radius);

		// Calculate the angle between the intersection an the global coordinate system
		const intersectionAngle = perpendicularAngle + intersectionToPerpendicularAngle;

		// The first intersection point an now be determined
		const intersection1 = {x: this.center.x - Math.cos(intersectionAngle) * this.radius, y: this.center.y - Math.sin(intersectionAngle) * this.radius};

		// Mirror intersection 1 along the perpendicular to find intersection 2
		const intersection2 = {x: closestPoint.x - (intersection1.x - closestPoint.x), y: closestPoint.y - (intersection1.y - closestPoint.y)};

		// Now we stop pretending that we're looking for intersections on a line
		// Filter out all the intersections that aren't on the segment
		return [intersection1, intersection2].filter(point => {
			// If the segment is vertical the x coordinate doesn't tell us anything, so we use y instead
			if (other.isVertical) {
				return isBetween(point.y, other.p1.y, other.p2.y);
			}
			else {
				return isBetween(point.x, other.p1.x, other.p2.x);
			}
		});
	}
}

export class Arc extends Circle {
	constructor(center, radius, direction, angle) {
		super(center, radius);
		this.direction = direction;
		this.angle = angle;
	}

	// Assumes 'other' is a segment
	intersection(other) {
		// Calculate the intersections between the segment and this arcs base circle. Then filter out all points that aren't on the arc
		return super.intersection(other).filter(point => {
			// The angle on the circle where the intersection was found
			let angle = Math.atan2(this.center.y - point.y, this.center.x - point.x);
			if (angle < 0)
				angle += 2 * Math.PI;
			// How often do we need to turn the arc to get to the base orientation? (0-359°)
			const noSpins = Math.floor((this.direction - this.angle / 2) / (2 * Math.PI));

			// The angle on the circle where the arc starts
			const arcStart = (this.direction - this.angle / 2) - 2 * Math.PI * noSpins;
			// The angle on the circle where the arc ends
			const arcEnd = (this.direction + this.angle / 2) - 2 * Math.PI * noSpins;
			return isBetween(angle, arcStart, arcEnd) || isBetween(angle + 2 * Math.PI, arcStart, arcEnd);
		});
	}
}

export function toRad(deg) {
	return deg * 2 * Math.PI / 360;
}

export function calcDistance(p1, p2) {
	return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function isBetween(val, bound1, bound2, tolerance=0.000001) {
	return val + tolerance >= Math.min(bound1, bound2) && val - tolerance <= Math.max(bound1, bound2);
}
