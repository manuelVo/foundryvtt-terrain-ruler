export class Line {
	constructor(a, b) {
		// Bring line into y=mx+b form
		this.m = (a.y - b.y) / (a.x - b.x)
		this.b = a.y - this.m * a.x
	}

	calcY(x) {
		return this.m * x + this.b
	}

	calcX(y) {
		return (y - this.b) / this.m
	}
}

