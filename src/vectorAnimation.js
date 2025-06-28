// vectorAnimation.js
// Utility for animating vectors in Three.js scenes
import { showLatexFormula } from './latexBox.js';

/**
 * Animate a vector from start to end over a given duration.
 * @param {THREE.Scene} scene - The Three.js scene.
 * @param {THREE.Vector3} from - Start point.
 * @param {THREE.Vector3} to - End point.
 * @param {Object} [opts] - { color, linewidth, duration, onComplete }
 * @returns {THREE.Line} The animated line object.
 */
export function animateVector(scene, from, to, opts = {}) {
    const color = opts.color || 0x00ff00;
    const linewidth = opts.linewidth || 3;
    const duration = opts.duration || 800;
    const onComplete = opts.onComplete;
    const geometry = new THREE.BufferGeometry().setFromPoints([from.clone(), from.clone()]);
    const material = new THREE.LineBasicMaterial({ color, linewidth });
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // Arrow helper for the animated vector
    let arrowHelper = null;
    function updateArrow(from, to) {
        if (arrowHelper) scene.remove(arrowHelper);
        const dirVec = to.clone().sub(from);
        const len = dirVec.length();
        if (len > 1e-6) {
            arrowHelper = new THREE.ArrowHelper(
                dirVec.clone().normalize(),
                from,
                len,
                color,
                0.2, // arrowhead length
                0.07 // arrowhead width (was 0.12)
            );
            arrowHelper.line.material.linewidth = linewidth;
            scene.add(arrowHelper);
        }
    }

    let start = null;
    function animateStep(ts) {
        if (!start) start = ts;
        const elapsed = ts - start;
        const t = Math.min(elapsed / duration, 1);
        const current = from.clone().lerp(to, t);
        line.geometry.setFromPoints([from, current]);
        updateArrow(from, current);
        if (t < 1) {
            requestAnimationFrame(animateStep);
        } else {
            line.geometry.setFromPoints([from, to]);
            if (onComplete) onComplete(line);
            // Remove arrow after animation
            if (arrowHelper) {
                scene.remove(arrowHelper);
                arrowHelper = null;
            }
        }
    }
    requestAnimationFrame(animateStep);
    return line;
}

/**
 * Animate a line between pt1 and pt2, growing from pt1 to pt2, or in a given direction if pt1 == pt2.
 * @param {THREE.Scene} scene - The Three.js scene.
 * @param {THREE.Vector3} pt1 - Start point of the line.
 * @param {THREE.Vector3} pt2 - End point of the line (for reference, not necessarily the animation end).
 * @param {number} [targetLength] - The length to animate to (if omitted, uses |pt2-pt1|).
 * @param {THREE.Vector3} [direction] - Optional direction vector (used only if pt1 == pt2 or |pt2-pt1| == 0).
 * @param {Object} [opts] - { color, linewidth, duration, onComplete }
 * @returns {THREE.Line} The animated line object.
 */
export function animateVectorScalingTo(scene, pt1, pt2, targetLength, direction, opts = {}) {
    const color = opts && opts.color || 0xff8800;
    const linewidth = opts && opts.linewidth || 3;
    const duration = opts && opts.duration || 800;
    const onComplete = opts && opts.onComplete;
    const formula = opts && opts.formula;
    let dir;
    let usePt2AsEnd = false;
    // If pt1 != pt2, deduce direction from them
    if (!pt1.equals(pt2)) {
        dir = pt2.clone().sub(pt1);
        // If direction is provided and is opposite to (pt2-pt1), use pt2 as the geometry end for scaling down
        if (typeof direction !== 'undefined' && direction && typeof direction.lengthSq === 'function' && direction.lengthSq() > 0) {
            const dot = dir.clone().normalize().dot(direction.clone().normalize());
            if (dot < -0.999) { // nearly opposite
                dir = direction.clone();
                usePt2AsEnd = true;
            }
        }
    } else if (typeof direction !== 'undefined' && direction && typeof direction.lengthSq === 'function' && direction.lengthSq() > 0) {
        dir = direction.clone();
    } else {
        dir = new THREE.Vector3(1, 0, 0); // Default to x-axis
    }
    if (typeof targetLength !== 'number' || isNaN(targetLength)) {
        targetLength = dir.length();
    }
    if (dir.lengthSq() === 0 || targetLength === 0) {
        dir.set(1, 0, 0); // Default to x-axis if zero
    }
    dir.normalize();
    // If scaling down from pt2 to pt1, set geometry from pt1 to pt2
    let geometry;
    if (usePt2AsEnd) {
        geometry = new THREE.BufferGeometry().setFromPoints([pt1.clone(), pt2.clone()]);
    } else {
        geometry = new THREE.BufferGeometry().setFromPoints([pt1.clone(), pt1.clone()]);
    }
    const material = new THREE.LineBasicMaterial({ color, linewidth });
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // Show formula if provided
    if (typeof formula === 'string' && formula.trim().length > 0) {
        showLatexFormula(formula, duration);
    }

    // Arrow helper for the animated vector
    let arrowHelper = null;
    function updateArrow(from, to) {
        if (arrowHelper) scene.remove(arrowHelper);
        const dirVec = to.clone().sub(from);
        const len = dirVec.length();
        if (len > 1e-6) {
            arrowHelper = new THREE.ArrowHelper(
                dirVec.clone().normalize(),
                from,
                len,
                color,
                0.2, // arrowhead length
                0.07 // arrowhead width (was 0.12)
            );
            arrowHelper.line.material.linewidth = linewidth;
            scene.add(arrowHelper);
        }
    }

    let start = null;
    function animateStep(ts) {
        if (!start) start = ts;
        const elapsed = ts - start;
        // Use a cubic ease-in-out for t (slow start, fast middle, slow end)
        let t = Math.min(elapsed / duration, 1);
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // cubic
        let currentTo;
        if (usePt2AsEnd) {
            // Animate endpoint from pt2 back to pt1 (scaling down)
            currentTo = pt2.clone().lerp(pt1, t);
        } else {
            const currentLength = t * targetLength;
            currentTo = pt1.clone().add(dir.clone().multiplyScalar(currentLength));
        }
        line.geometry.setFromPoints([pt1, currentTo]);
        updateArrow(pt1, currentTo);
        if (elapsed < duration) {
            requestAnimationFrame(animateStep);
        } else {
            if (usePt2AsEnd) {
                line.geometry.setFromPoints([pt1, pt1.clone()]);
                updateArrow(pt1, pt1.clone());
            } else {
                line.geometry.setFromPoints([pt1, pt1.clone().add(dir.clone().multiplyScalar(targetLength))]);
                updateArrow(pt1, pt1.clone().add(dir.clone().multiplyScalar(targetLength)));
            }
            if (onComplete) onComplete(line);
            // Remove arrow after animation
            if (arrowHelper) {
                scene.remove(arrowHelper);
                arrowHelper = null;
            }
        }
    }
    requestAnimationFrame(animateStep);
    return line;
}
