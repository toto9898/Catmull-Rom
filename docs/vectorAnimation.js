/**
 * Animate translating a vector (line) by a translation vector, keeping its direction and length fixed.
 * @param {THREE.Scene} scene - The Three.js scene.
 * @param {THREE.Line} line - The Three.js line object to animate (must be in the scene).
 * @param {THREE.Vector3} translationVector - The vector by which to translate the line (from start to end position).
 * @param {Object} [opts] - { color, linewidth, duration, onComplete }
 * @returns {THREE.Line} The animated line object.
 */
/**
 * Animate translating a vector (line) by a translation vector, keeping its direction and length fixed.
 * @param {THREE.Scene} scene - The Three.js scene.
 * @param {THREE.Line} line - The Three.js line object to animate (must be in the scene).
 * @param {THREE.Vector3} translationVector - The vector by which to translate the line (from start to end position).
 * @param {Object} [opts] - { color, linewidth, duration, onComplete }
 * @returns {THREE.Line} The animated line object.
 */
export function animateVectorTranslation(scene, line, translationVector, opts = {}) {
    const color = opts.color || 0x00ff00;
    const linewidth = opts.linewidth || 3;
    const duration = opts.duration || 800;
    const onComplete = opts.onComplete;
    // Get the original points from the line
    const points = line.geometry.attributes.position.array;
    const tailStart = new THREE.Vector3(points[0], points[1], points[2]);
    const headStart = new THREE.Vector3(points[3], points[4], points[5]);
    const tailEnd = tailStart.clone().add(translationVector);
    const headEnd = headStart.clone().add(translationVector);

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
                0.07 // arrowhead width
            );
            arrowHelper.line.material.linewidth = linewidth;
            scene.add(arrowHelper);
        }
    }

    // Show formula at the start of the animation if provided
    if (typeof opts.formula === 'string' && opts.formula.trim().length > 0) {
        showLatexFormula(opts.formula, duration);
    }

    let start = null;
    let pausedAt = null;
    let unsub = null;
    function animateStep(ts) {
        if (start === null) start = ts;
        if (window.__globalAnimationState && window.__globalAnimationState.paused) {
            if (!pausedAt) pausedAt = ts;
            requestAnimationFrame(animateStep);
            return;
        } else if (pausedAt) {
            // Adjust start time by pause duration
            start += ts - pausedAt;
            pausedAt = null;
        }
        const elapsed = ts - start;
        let t = Math.min(elapsed / duration, 1);
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const tail = tailStart.clone().add(translationVector.clone().multiplyScalar(t));
        const head = headStart.clone().add(translationVector.clone().multiplyScalar(t));
        line.geometry.setFromPoints([tail, head]);
        updateArrow(tail, head);
        if (elapsed < duration) {
            requestAnimationFrame(animateStep);
        } else {
            line.geometry.setFromPoints([tailEnd, headEnd]);
            updateArrow(tailEnd, headEnd);
            if (onComplete) onComplete(line);
            // Remove arrow after animation
            if (arrowHelper) {
                scene.remove(arrowHelper);
                arrowHelper = null;
            }
            if (unsub) unsub();
        }
    }
    // Subscribe to global pause state
    if (window.__globalAnimationState) {
        unsub = window.__globalAnimationState.subscribe(paused => {
            if (!paused) requestAnimationFrame(animateStep);
        });
    }
    requestAnimationFrame(animateStep);
    return line;
}

// vectorAnimation.js
// Utility for animating vectors in Three.js scenes
import { showLatexFormula, PausableTimeout } from './latexBox.js';

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
    let pausedAt = null;
    let unsub = null;
    function animateStep(ts) {
        if (start === null) start = ts;
        if (window.__globalAnimationState && window.__globalAnimationState.paused) {
            if (!pausedAt) pausedAt = ts;
            requestAnimationFrame(animateStep);
            return;
        } else if (pausedAt) {
            start += ts - pausedAt;
            pausedAt = null;
        }
        if (typeof opts.formula === 'string' && opts.formula.trim().length > 0 && !line._formulaShown) {
            showLatexFormula(opts.formula, duration);
            line._formulaShown = true;
        }
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
            if (unsub) unsub();
        }
    }
    // Subscribe to global pause state
    if (window.__globalAnimationState) {
        unsub = window.__globalAnimationState.subscribe(paused => {
            if (!paused) requestAnimationFrame(animateStep);
        });
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

/**
 * Animate scaling a line from its start point, growing or shrinking its endpoint to a target length along a direction.
 * @param {THREE.Scene} scene - The Three.js scene.
 * @param {THREE.Line} line - The line to animate (must be in the scene).
 * @param {number} targetLength - The length to animate to.
 * @param {THREE.Vector3} [direction] - Optional direction vector (if omitted, uses line's direction).
 * @param {Object} [opts] - { color, linewidth, duration, onComplete }
 * @returns {THREE.Line} The animated line object.
 */
export function animateVectorScalingTo(scene, line, targetLength, opts = {}) {
    const color = opts && opts.color || 0x00ff00;
    const linewidth = opts && opts.linewidth || 3;
    const duration = opts && opts.duration || 800;
    const onComplete = opts && opts.onComplete;
    const formula = opts && opts.formula;
    // Get the original points from the line
    const points = line.geometry.attributes.position.array;
    const pt1 = new THREE.Vector3(points[0], points[1], points[2]);
    const pt2 = new THREE.Vector3(points[3], points[4], points[5]);
    const lineLen = pt2.clone().sub(pt1).length();
    if (lineLen === 0) {
        return line; // No animation if line has no length
    }
    if (Math.abs(targetLength) === Math.abs(lineLen)) {
        let start = null;
        let pausedAt = null;
        function animateStep(ts) {
            if (start === null) start = ts;
            if (window.__globalAnimationState && window.__globalAnimationState.paused) {
                if (!pausedAt) pausedAt = ts;
                requestAnimationFrame(animateStep);
                return;
            } else if (pausedAt) {
                start += ts - pausedAt;
                pausedAt = null;
            }
            const elapsed = ts - start;
            const t = Math.min(elapsed / duration, 1);
            const dir = pt2.clone().sub(pt1).normalize();
            const to = pt1.clone().add(dir.clone().multiplyScalar(targetLength));
            line.geometry.setFromPoints([pt1, to]);
            updateArrow(pt1, to);
            if (t < 1) {
                requestAnimationFrame(animateStep);
            } else {
                if (onComplete) onComplete(line);
            }
        }
        requestAnimationFrame(animateStep);
        return line;
    }

    // Show formula at the start of the animation if provided
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

    let dir = pt2.clone().sub(pt1);
    const initialLen = dir.length();
    if (initialLen === 0) {
        // If the line is a point, use +X or -X based on targetLength
        dir.set(targetLength >= 0 ? 1 : -1, 0, 0);
    } else {
        dir.normalize();
    }

    let start = null;
    let pausedAt = null;
    let unsub = null;
    // Always subscribe to globalAnimationState immediately, so pause works on first animation
    if (window.__globalAnimationState) {
        unsub = window.__globalAnimationState.subscribe(paused => {
            if (!paused) requestAnimationFrame(animateStep);
        });
    }
    function animateStep(ts) {
        if (start === null) start = ts;
        if (window.__globalAnimationState && window.__globalAnimationState.paused) {
            if (!pausedAt) pausedAt = ts;
            requestAnimationFrame(animateStep);
            return;
        } else if (pausedAt) {
            // Adjust start time by pause duration
            start += ts - pausedAt;
            pausedAt = null;
        }
        const elapsed = ts - start;
        let t = Math.min(elapsed / duration, 1);
        // Cubic ease-in-out interpolation for t
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        // Interpolate the length from initialLen to targetLength (can be negative)
        const currentLen = initialLen + (targetLength - initialLen) * t;
        const currentTo = pt1.clone().add(dir.clone().multiplyScalar(currentLen));
        line.geometry.setFromPoints([pt1, currentTo]);
        updateArrow(pt1, currentTo);
        if (elapsed < duration) {
            requestAnimationFrame(animateStep);
        } else {
            const finalTo = pt1.clone().add(dir.clone().multiplyScalar(targetLength));
            line.geometry.setFromPoints([pt1, finalTo]);
            updateArrow(pt1, finalTo);
            if (onComplete) onComplete(line);
            // Remove arrow after animation
            if (arrowHelper) {
                scene.remove(arrowHelper);
                arrowHelper = null;
            }
            if (unsub) unsub();
        }
    }
    requestAnimationFrame(animateStep);
    return line;
}
