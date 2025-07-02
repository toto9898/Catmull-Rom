// --- PausableTimeout Utility ---
export class PausableTimeout {
    constructor(callback, delay) {
        this.callback = callback;
        this.remaining = delay;
        this.timerId = null;
        this.start = null;
        this.paused = false;
        this.done = false;
        this._onPauseChange = this._onPauseChange.bind(this);
        if (window.__globalAnimationState && window.__globalAnimationState.subscribe) {
            this.unsubscribe = window.__globalAnimationState.subscribe(this._onPauseChange);
        }
        this.resume();
    }
    _onPauseChange(paused) {
        if (paused) {
            this.pause();
        } else {
            this.resume();
        }
    }
    pause() {
        if (this.paused || this.done) return;
        this.paused = true;
        clearTimeout(this.timerId);
        if (this.start) {
            this.remaining -= Date.now() - this.start;
        }
    }
    resume() {
        if (!this.paused && this.timerId) return;
        if (this.done) return;
        this.paused = false;
        this.start = Date.now();
        clearTimeout(this.timerId);
        this.timerId = setTimeout(() => {
            this.done = true;
            if (this.unsubscribe) this.unsubscribe();
            this.callback();
        }, this.remaining);
    }
    clear() {
        clearTimeout(this.timerId);
        this.done = true;
        if (this.unsubscribe) this.unsubscribe();
    }
}
// latexBox.js
// Utility for showing LaTeX formulas in a fixed box at the bottom-middle of the screen

/**
 * Show a LaTeX label under a specific 3D point on the screen.
 * @param {THREE.Vector3} point - The 3D point to label.
 * @param {number|string} index - The index or label to show (e.g., 1 for P_1).
 * @param {THREE.Camera} camera - The camera for projection.
 * @param {Object} [opts] - Optional: { offsetY, latexPrefix, color, fontSize, id, timeMs }
 * Returns a function to remove the label.
 */
export function showLatexLabelUnderPoint(point, index, camera, opts = {}) {
    // Project 3D point to 2D screen coordinates
    const vector = point.clone().project(camera);
    const x = (vector.x + 1) * window.innerWidth / 2;
    const y = (-vector.y + 1) * window.innerHeight / 2;
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = `${x}px`;
    // Offset below the point (default 18px)
    div.style.top = `${y + (opts.offsetY !== undefined ? opts.offsetY : 18)}px`;
    div.style.transform = 'translate(-50%, 0)';
    div.style.color = opts.color || '#fff';
    div.style.background = 'rgba(30,30,30,0.95)';
    div.style.padding = '2px 8px';
    div.style.borderRadius = '6px';
    div.style.fontSize = opts.fontSize || '1.1em';
    div.style.zIndex = opts.zIndex ? String(opts.zIndex) : '10010';
    div.style.pointerEvents = 'none';
    if (opts.id) div.id = opts.id;
    // LaTeX label, e.g., P_1
    const latex = opts.latexPrefix ? `${opts.latexPrefix}_{${index}}` : `P_{${index}}`;
    div.innerHTML = `\\(${latex}\\)`;
    document.body.appendChild(div);
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([div]);
    }
    // Do not auto-remove; return a function to remove the label, but do not call it automatically
    return () => {
        if (div.parentNode) div.parentNode.removeChild(div);
    };
}

// Store references to all current control point LaTeX label elements
let _currentControlPointLatexDivs = [];

/**
 * Show LaTeX labels ('P₀', 'P₁', ...) under all control points if there are 3 or 4 points.
 * @param {THREE.Vector3[]} bezierPoints - Array of 3 or 4 THREE.Vector3 control points.
 * @param {THREE.Camera} camera - The camera for projection.
 * @param {Object} [opts] - Optional: { offsetY, latexPrefix, color, fontSize }
 */
export function showLatexLabelsForControlPoints(bezierPoints, camera, opts = {}) {
    clearLatexLabelsForControlPoints();
    if (!Array.isArray(bezierPoints) || (bezierPoints.length !== 3 && bezierPoints.length !== 4)) return [];
    const removers = [];
    for (let i = 0; i < bezierPoints.length; ++i) {
        // Use a unique id for each label so we can clear them later
        const id = `bezier-control-label-${i}`;
        const remover = showLatexLabelUnderPoint(
            bezierPoints[i],
            i,
            camera,
            Object.assign({}, opts, { id })
        );
        _currentControlPointLatexDivs.push(id);
        removers.push(remover);
    }
    return removers;
}

/**
 * Remove all LaTeX labels created by showLatexLabelsForControlPoints.
 */
export function clearLatexLabelsForControlPoints() {
    for (const id of _currentControlPointLatexDivs) {
        const div = document.getElementById(id);
        if (div && div.parentNode) div.parentNode.removeChild(div);
    }
    _currentControlPointLatexDivs = [];
}

// Create the LaTeX box if it doesn't exist
function ensureLatexBox() {
    let box = document.getElementById('latex-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'latex-box';
        box.style.position = 'fixed';
        box.style.left = '50%';
        box.style.bottom = '80px'; // moved higher from 30px to 80px
        box.style.transform = 'translateX(-50%)';
        box.style.background = 'rgba(30,30,30,0.95)';
        box.style.color = '#fff';
        box.style.padding = '16px 24px';
        box.style.borderRadius = '10px';
        box.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
        box.style.fontSize = '1.2em';
        box.style.zIndex = '10001';
        box.style.minWidth = '200px';
        box.style.textAlign = 'center';
        box.style.pointerEvents = 'none';
        document.body.appendChild(box);
    }
    return box;
}

/**
 * Show a LaTeX formula in the bottom box, optionally for a limited time.
 * @param {string} latex - The LaTeX string to render (without $ or \[...\])
 * @param {number} [timeMs] - Optional time in milliseconds to show the formula before hiding.
 */
let latexBoxTimeout = null;
let latexBoxFadeAnim = null;
let latexBoxPausableTimeout = null;
export function showLatexFormula(latex, timeMs = 1000) {
    const box = ensureLatexBox();
    box.style.display = '';
    box.style.opacity = '0';
    // Use display math mode for environments like align/array, else inline
    if (/\\begin\{(array|align\*?)\}/.test(latex)) {
        box.innerHTML = `\\[${latex}\\]`;
    } else {
        box.innerHTML = `\\(${latex}\\)`;
    }
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([box]);
    }
    if (latexBoxTimeout) {
        clearTimeout(latexBoxTimeout);
        latexBoxTimeout = null;
    }
    if (latexBoxPausableTimeout) {
        latexBoxPausableTimeout.clear();
        latexBoxPausableTimeout = null;
    }
    if (latexBoxFadeAnim) {
        cancelAnimationFrame(latexBoxFadeAnim);
        latexBoxFadeAnim = null;
    }
    // Fade in/out animation
    const fadeInTime = timeMs * 0.2;
    const fadeOutTime = timeMs * 0.2;
    const visibleTime = timeMs - fadeInTime - fadeOutTime;
    let start = null;
    let pausedAt = null;
    let fadePhase = 'in'; // 'in', 'visible', 'out'
    let visibleStart = null;
    function animate(ts) {
        if (window.__globalAnimationState && window.__globalAnimationState.paused) {
            if (!pausedAt) pausedAt = ts;
            latexBoxFadeAnim = requestAnimationFrame(animate);
            return;
        } else if (pausedAt) {
            // Adjust start times to account for pause
            if (fadePhase === 'in') start += ts - pausedAt;
            if (fadePhase === 'visible') visibleStart += ts - pausedAt;
            pausedAt = null;
        }
        if (!start) start = ts;
        const elapsed = ts - start;
        if (fadePhase === 'in') {
            const t = Math.min(elapsed / fadeInTime, 1);
            box.style.opacity = t.toFixed(2);
            if (t < 1) {
                latexBoxFadeAnim = requestAnimationFrame(animate);
            } else {
                fadePhase = 'visible';
                visibleStart = ts;
                latexBoxFadeAnim = requestAnimationFrame(animate);
            }
        } else if (fadePhase === 'visible') {
            const t = Math.min((ts - visibleStart) / visibleTime, 1);
            box.style.opacity = '1';
            if (t < 1) {
                latexBoxFadeAnim = requestAnimationFrame(animate);
            } else {
                fadePhase = 'out';
                start = ts;
                latexBoxFadeAnim = requestAnimationFrame(animate);
            }
        } else if (fadePhase === 'out') {
            const t = Math.min((ts - start) / fadeOutTime, 1);
            box.style.opacity = (1 - t).toFixed(2);
            if (t < 1) {
                latexBoxFadeAnim = requestAnimationFrame(animate);
            } else {
                box.style.opacity = '0';
                hideLatexFormula();
                latexBoxFadeAnim = null;
            }
        }
    }
    box.style.opacity = '0';
    latexBoxFadeAnim = requestAnimationFrame(animate);
    // Fallback: ensure box is hidden after timeMs (in case of tab switch, etc)
    latexBoxPausableTimeout = new PausableTimeout(() => {
        hideLatexFormula();
        latexBoxFadeAnim = null;
    }, timeMs + 100);
}

/**
 * Hide the LaTeX formula box.
 */
function hideLatexFormula() {
    const box = document.getElementById('latex-box');
    if (box) box.style.display = 'none';
}

/**
 * Show the LaTeX formula box (if hidden).
 */
export function showLatexBox() {
    const box = document.getElementById('latex-box');
    if (box) box.style.display = '';
}

/**
 * Show a LaTeX formula in a custom box at a given position (not interfering with the main latex box).
 * @param {string} latex - The LaTeX string to render (without $ or \[...\])
 * @param {Object} [opts] - Optional: { position, bottom, right, left, top, fontSize, zIndex, timeMs }
 * If timeMs is provided, the box will auto-hide after that duration.
 * Returns a function to manually hide the box.
 */
export function showLatexCornerBox(latex, opts = {}) {
    let box = document.getElementById('latex-corner-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'latex-corner-box';
        document.body.appendChild(box);
    }
    box.style.position = opts.position || 'fixed';
    box.style.bottom = opts.bottom || '2em';
    box.style.right = opts.right || '2em';
    box.style.left = opts.left || '';
    box.style.top = opts.top || '';
    box.style.background = 'rgba(30,30,30,0.95)';
    box.style.color = '#fff';
    box.style.padding = '12px 18px';
    box.style.borderRadius = '10px';
    box.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
    box.style.fontSize = opts.fontSize || '1.2em';
    box.style.zIndex = opts.zIndex ? String(opts.zIndex) : '10001';
    box.style.minWidth = '120px';
    box.style.textAlign = 'center';
    box.style.pointerEvents = 'none';
    box.style.display = '';
    box.style.opacity = '1';
    // Use display math mode for environments like array
    if (/\\begin\{array\}/.test(latex)) {
        box.innerHTML = `\\[${latex}\\]`;
    } else {
        box.innerHTML = `\\(${latex}\\)`;
    }
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([box]);
    }
    if (box._pausableTimeout) {
        box._pausableTimeout.clear();
        box._pausableTimeout = null;
    }
    if (opts.timeMs) {
        box._pausableTimeout = new PausableTimeout(() => {
            box.style.display = 'none';
        }, opts.timeMs);
    }
    // Return a function to hide the box manually
    return () => {
        if (box._pausableTimeout) box._pausableTimeout.clear();
        box.style.display = 'none';
    };
}

/**
 * Hide the triangle scheme box if present.
 */
export function hideLatexCornerBox() {
    const box = document.getElementById('latex-corner-box');
    if (box) box.style.display = 'none';
}
