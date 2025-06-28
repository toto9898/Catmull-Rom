/**
 * Performs de Casteljau's algorithm for a given set of control points and parameter t.
 * @param {THREE.Vector3[]} controlPoints - Array of control points.
 * @param {number} t - Interpolation parameter [0, 1].
 * @returns {THREE.Vector3} The interpolated point.
 */
export function deCasteljau(controlPoints, t) {
    if (!controlPoints || controlPoints.length === 0) return null;
    let points = controlPoints.map((point) => point.clone());
    while (points.length > 1) {
        const nextPoints = [];
        for (let i = 0; i < points.length - 1; i++) {
            const interpolatedPoint = points[i].clone().lerp(points[i + 1], t);
            nextPoints.push(interpolatedPoint);
        }
        points = nextPoints;
    }
    return points[0];
}

/**
 * Generates a Bezier curve using de Casteljau's algorithm.
 * @param {THREE.Vector3[]} controlPoints - Array of control points.
 * @param {number} [steps=50] - Number of segments.
 * @returns {THREE.Vector3[]} Array of points on the curve.
 */
export function createBezierCurve(controlPoints, steps = 50) {
    if (!controlPoints || controlPoints.length < 2) return [];
    const bezierPoints = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        bezierPoints.push(deCasteljau(controlPoints, t));
    }
    return bezierPoints;
}

/**
 * Converts Catmull-Rom segment to Bezier control points.
 * @param {THREE.Vector3} P0 
 * @param {THREE.Vector3} P1 
 * @param {THREE.Vector3} P2 
 * @param {THREE.Vector3} P3 
 * @returns {THREE.Vector3[]} Array of 4 Bezier control points.
 */
export function catmullRomInterpolate(P0, P1, P2, P3) {
    return [
        P1.clone(),
        P1.clone().add(P2.clone().sub(P0).multiplyScalar(1 / 6)),
        P2.clone().sub(P3.clone().sub(P1).multiplyScalar(1 / 6)),
        P2.clone()
    ];
}

/**
 * Generates a Catmull-Rom spline as a series of points.
 * @param {THREE.Vector3[]} controlPoints - Array of control points.
 * @param {number} [steps=50] - Number of segments per segment.
 * @returns {THREE.Vector3[]} Array of points on the spline.
 */
export function createCatmullRomCurve(controlPoints, steps = 50) {
    if (!controlPoints || controlPoints.length < 2) return [];
    const points = [];
    const extended = [
        controlPoints[0].clone(),
        ...controlPoints,
        controlPoints[controlPoints.length - 1].clone()
    ];
    for (let i = 0; i < controlPoints.length - 1; i++) {
        const P0 = extended[i];
        const P1 = extended[i + 1];
        const P2 = extended[i + 2];
        const P3 = extended[i + 3];
        const bezierCPs = catmullRomInterpolate(P0, P1, P2, P3);
        for (let j = 0; j < steps; j++) {
            const t = j / steps;
            points.push(deCasteljau(bezierCPs, t));
        }
    }
    points.push(controlPoints[controlPoints.length - 1].clone());
    return points;
}