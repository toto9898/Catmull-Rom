import { showLatexFormula, showLatexCornerBox, PausableTimeout } from './latexBox.js';

// Exported reference to the main curve line(s) (for use in interaction.js)
export let curveSegmentLine = [];
export function setCurveLine(line) {
    if (line === null) {
        // Remove all lines from their parents
        for (const l of curveSegmentLine) {
            if (l && l.parent) l.parent.remove(l);
        }
        curveSegmentLine.length = 0;
        return;
    }
    curveSegmentLine.push(line);
}

/**
 * Visualizes a single step of de Casteljau's algorithm.
 * Draws lines and points for each interpolation level at parameter t.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3[]} controlPoints
 * @param {number} t
 * @param {Object} [opts] - Optional: { color, pointSize }
 * @returns {THREE.Group} - Group containing visualization objects.
 */
export function visualizeDeCasteljau(scene, controlPoints, t, opts = {}) {
    const group = new THREE.Group();
    let points = controlPoints.map(p => p.clone());
    const color = opts.color || 0x00ff00; // green for Bezier construction
    const pointSize = opts.pointSize || 0.08;

    while (points.length > 1) {
        // Draw points
        points.forEach(pt => {
            const geom = new THREE.SphereGeometry(pointSize, 16, 16);
            const mat = new THREE.MeshBasicMaterial({ color });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.copy(pt);
            group.add(mesh);
        });
        // Draw lines
        for (let i = 0; i < points.length - 1; i++) {
            const geom = new THREE.BufferGeometry().setFromPoints([points[i], points[i + 1]]);
            const mat = new THREE.LineBasicMaterial({ color });
            const line = new THREE.Line(geom, mat);
            group.add(line);
        }
        // Next level
        const nextPoints = [];
        for (let i = 0; i < points.length - 1; i++) {
            nextPoints.push(points[i].clone().lerp(points[i + 1], t));
        }
        points = nextPoints;
    }
    // Final interpolated point
    const finalGeom = new THREE.SphereGeometry(pointSize * 1.2, 16, 16);
    const finalMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const finalMesh = new THREE.Mesh(finalGeom, finalMat);
    finalMesh.position.copy(points[0]);
    group.add(finalMesh);

    scene.add(group);
    return group;
}

// Show the de Casteljau triangle scheme as LaTeX overlays with colored dots
function showTriangleLatex(degree, duration) {
    // Triangle scheme in LaTeX (for up to cubic, generalizes for more)
    let triangleLatex = [];
    let trianglePoints = [];
    if (degree === 2) {
        triangleLatex = [
            'P_0 \\qquad P_1 \\qquad P_2',
            '\\qquad Q_0 \\qquad\\qquad Q_1',
            '\\qquad\\qquad R_0'
        ];
        trianglePoints = [
            [0,1,2], // P_0, P_1, P_2
            [0,1],   // Q_0, Q_1
            [0]      // R_0
        ];
    } else if (degree === 3) {
        triangleLatex = [
            'P_0 \\qquad P_1 \\qquad P_2 \\qquad P_3',
            '\\qquad Q_0 \\qquad Q_1 \\qquad Q_2',
            '\\qquad\\qquad R_0 \\qquad R_1',
            '\\qquad\\qquad\\qquad S_0'
        ];
        trianglePoints = [
            [0,1,2,3], // P_0..P_3
            [0,1,2],   // Q_0..Q_2
            [0,1],     // R_0, R_1
            [0]        // S_0
        ];
    } else {
        // Generic placeholder for higher degrees
        triangleLatex = ["\\text{de Casteljau triangle scheme}"];
        trianglePoints = [[]];
    }

    import('./latexBox.js').then(mod => {
        // Remove any previous boxes
        for (let i = 0; i < 6; ++i) {
            const old = document.getElementById('triangle-line-' + i);
            if (old) old.remove();
        }
        triangleLatex.forEach((line, idx) => {
            let box = document.createElement('div');
            box.id = 'triangle-line-' + idx;
            box.style.position = 'fixed';
            box.style.right = '2em';
            box.style.bottom = `calc(10em - ${idx * 2.2}em)`;
            box.style.background = 'rgba(30,30,30,0.95)';
            box.style.color = '#fff';
            box.style.padding = '6px 16px';
            box.style.borderRadius = '10px';
            box.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
            box.style.fontSize = '1.2em';
            box.style.zIndex = '10001';
            box.style.minWidth = '120px';
            box.style.textAlign = 'center';
            box.style.pointerEvents = 'none';
            box.style.opacity = '1';
            // Add colored points left of the LaTeX
            let pointsHtml = '';
            const colors = [
                '#ff0000', // gray
                '#ffcc00', // yellow
                '#0077ff', // blue
                '#00cc44', // green
                '#cc00cc'  // magenta
            ];
            if (trianglePoints[idx]) {
                trianglePoints[idx].forEach((ptIdx, j) => {
                    const color = colors[idx] || '#fff';
                    pointsHtml += `<span style="display:inline-block;width:0.9em;height:0.9em;border-radius:50%;background:${color};margin-right:0.4em;vertical-align:middle;"></span>`;
                });
            }
            box.innerHTML = pointsHtml + `\\(${line}\\)`;
            document.body.appendChild(box);
            if (window.MathJax && window.MathJax.typesetPromise) {
                MathJax.typesetPromise([box]);
            }
            if (duration) {
                new PausableTimeout(() => { box.remove(); }, duration + 200);
            }
        });
    });
}

/**
 * Animates de Casteljau's algorithm from t=0 to t=1.
 * Calls a callback with the current t and visualization group.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3[]} controlPoints
 * @param {Function} onUpdate - (t, group) => void
 * @param {number} [duration=2000] - Animation duration in ms
 */
export function _orig_animateDeCasteljau(scene, controlPoints, onUpdate, duration = 2000) {
    // Remove any previous construction helpers
    let helpers = [];
    function clearHelpers() {
        helpers.forEach(obj => scene.remove(obj));
        helpers = [];
        // Do NOT remove curveSegmentLine here; it should only be removed on user interaction.
    }

    // --- GLOBAL ANIMATION PAUSE/RESUME STATE ---
    if (!window.__globalAnimationState) {
        window.__globalAnimationState = {
            paused: false,
            subscribers: [],
            setPaused(paused) {
                this.paused = paused;
                this.subscribers.forEach(fn => {
                    try { fn(paused); } catch (e) { /* ignore */ }
                });
            },
            subscribe(fn) {
                this.subscribers.push(fn);
                return () => {
                    this.subscribers = this.subscribers.filter(f => f !== fn);
                };
            }
        };
    }
    // --- Pause Button Show/Hide Utility ---
    function setPauseButtonEnabled(enabled) {
        const btn = document.getElementById('global-stop-btn');
        if (!btn) return;
        if (enabled) {
            btn.style.display = '';
            btn.disabled = false;
        } else {
            btn.style.display = 'none';
            btn.disabled = true;
        }
        // Always reset text to 'Pause' when enabling
        if (enabled) btn.textContent = window.__globalAnimationState && window.__globalAnimationState.paused ? 'Resume' : 'Pause';
    }

    // Remove dynamic creation of the pause button, and instead only attach logic if the button exists
    const globalPauseBtn = document.getElementById('global-stop-btn');
    if (globalPauseBtn) {
        globalPauseBtn.onclick = () => {
            const state = window.__globalAnimationState;
            state.setPaused(!state.paused);
            globalPauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
        };
    }

    // --- Animation state for global stop/resume ---
    let animationFrameId = null;
    let animationElapsed = 0;
    let pauseStart = null;
    let unsub = null;

    // Listen to global pause state
    function onPauseChange(paused) {
        if (!paused && animationFrameId === null) {
            // Resume
            requestAnimationFrame(animateFrame);
        }
    }
    unsub = window.__globalAnimationState.subscribe(onPauseChange);

    async function animateDeCasteljauVideoStyle() {
        setPauseButtonEnabled(true);
        clearHelpers();
        const n = controlPoints.length - 1;
        const levelColors = [0x888888, 0xff8800, 0x0077ff, 0x00cc44, 0xcc00cc]; // Use as many as needed
        const pointColors = [0x888888, 0xffcc00, 0x0077ff, 0x00cc44, 0xcc00cc];
        const steps = 100;
        const bezierPoints = [];
        for (let i = 0; i <= steps; i++) {
            // de Casteljau for t
            let pts = controlPoints.map(p => p.clone());
            let t = i / steps;
            for (let k = 1; k < pts.length; ++k) {
                for (let j = 0; j < pts.length - k; ++j) {
                    pts[j].lerp(pts[j + 1], t);
                }
            }
            bezierPoints.push(pts[0].clone());
        }
        // Show Bernstein polynomial formula during the animation
        // Use the actual degree for the formula
        const degree = controlPoints.length - 1;
        const bernsteinLatex =
            `B_{${degree}}(t) = \\sum_{i=0}^{${degree}} \\binom{${degree}}{i} (1-t)^{${degree}-i} t^{i} \\mathbf{P}_{i}`;

        // Animate t from 0 to 1 over the given duration
        let start = null;
        let prevCurveLine = null;
        function animateFrame(ts) {
            // Use global pause state
            if (window.__globalAnimationState && window.__globalAnimationState.paused) {
                if (!pauseStart) pauseStart = ts;
                animationFrameId = requestAnimationFrame(animateFrame);
                return;
            } else if (pauseStart) {
                // Adjust start time by pause duration
                start += ts - pauseStart;
                pauseStart = null;
            }
            if (!start) {
                start = ts - animationElapsed;
                showLatexFormula(bernsteinLatex, duration);
    
                // Show triangle scheme as separate lines at bottom-right
                showTriangleLatex(degree, duration);
            }
            let elapsed = ts - start;
            animationElapsed = elapsed;
            let t = Math.min(elapsed / duration, 1);
            let frame = Math.floor(t * steps);
            clearHelpers();
            // Draw control polygon (static, gray)
            for (let i = 0; i < controlPoints.length - 1; i++) {
                const geom = new THREE.BufferGeometry().setFromPoints([controlPoints[i], controlPoints[i + 1]]);
                const mat = new THREE.LineBasicMaterial({ color: 0x444444, linewidth: 2 });
                const line = new THREE.Line(geom, mat);
                scene.add(line);
                helpers.push(line);
            }
            // Draw all levels for current t
            let levels = [controlPoints.map(p => p.clone())];
            for (let level = 1; level <= n; ++level) {
                const prev = levels[levels.length - 1];
                const next = [];
                for (let i = 0; i < prev.length - 1; ++i) {
                    // Interpolated point
                    const interp = prev[i].clone().lerp(prev[i + 1], t);
                    next.push(interp);
                    // Draw two lines: first part pink (ratio t), second part orange (ratio 1-t)
                    const mid = prev[i].clone().lerp(prev[i + 1], t);
                    // First segment: prev[i] to mid (pink, length t)
                    if (t > 0) {
                        const geom1 = new THREE.BufferGeometry().setFromPoints([prev[i], mid]);
                        const mat1 = new THREE.LineBasicMaterial({ color: 0xcc00cc, linewidth: 3 });
                        const line1 = new THREE.Line(geom1, mat1);
                        scene.add(line1);
                        helpers.push(line1);
                    }
                    // Second segment: mid to prev[i+1] (orange, length 1-t)
                    if (t < 1) {
                        const geom2 = new THREE.BufferGeometry().setFromPoints([mid, prev[i + 1]]);
                        const mat2 = new THREE.LineBasicMaterial({ color: 0xff8800, linewidth: 3 });
                        const line2 = new THREE.Line(geom2, mat2);
                        scene.add(line2);
                        helpers.push(line2);
                    }
                }
                // Points for this level (draw all, including the final green dot)
                for (let i = 0; i < next.length; ++i) {
                    const pt = new THREE.Mesh(
                        new THREE.SphereGeometry(0.07, 16, 16),
                        new THREE.MeshBasicMaterial({ color: pointColors[level] || 0xffffff })
                    );
                    pt.position.copy(next[i]);
                    scene.add(pt);
                    helpers.push(pt);
                }
                levels.push(next);
            }
            // Draw Bezier curve so far
            const curveSoFar = bezierPoints.slice(0, frame + 1);
            const curveGeom = new THREE.BufferGeometry().setFromPoints(curveSoFar);
            const curveMat = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 4 });
            const newCurveLine = new THREE.Line(curveGeom, curveMat);
            // Remove previous curve line if it exists
            if (prevCurveLine) {
                scene.remove(prevCurveLine);
                if (prevCurveLine.geometry && typeof prevCurveLine.geometry.dispose === 'function') prevCurveLine.geometry.dispose();
                if (prevCurveLine.material && typeof prevCurveLine.material.dispose === 'function') prevCurveLine.material.dispose();
            }
            scene.add(newCurveLine);
            prevCurveLine = newCurveLine;
            // Only set the curve line reference on the last frame
            if (t === 1) {
                setCurveLine(newCurveLine);
            }
            // Draw moving blue dot (only one per frame)
            // (No blue dot; only the green dot is shown at the final interpolation point)
            // Animate
            if (t < 1) {
                animationFrameId = requestAnimationFrame(animateFrame);
            } else {
                if (onUpdate) onUpdate(1, null);
                new PausableTimeout(clearHelpers, 1200);
                setPauseButtonEnabled(false);
                // Remove stop button at end
                const btn = document.getElementById('decasteljau-stop-btn');
                if (btn) btn.remove();
            }
        }
    animationFrameId = requestAnimationFrame(animateFrame);
    }
    animateDeCasteljauVideoStyle();
}

// --- Global Animation Lock ---
if (!window.__globalAnimationLock) {
    window.__globalAnimationLock = {
        _locked: false,
        _queue: [],
        async acquire() {
            if (!this._locked) {
                this._locked = true;
                return;
            }
            return new Promise(resolve => this._queue.push(resolve));
        },
        release() {
            if (this._queue.length > 0) {
                const next = this._queue.shift();
                next();
            } else {
                this._locked = false;
            }
        }
    };
}

// Wrap animation entry points to use the lock
export async function animateDeCasteljau(scene, controlPoints, onUpdate, duration = 2000) {
    await window.__globalAnimationLock.acquire();
    try {
        await _orig_animateDeCasteljau(scene, controlPoints, onUpdate, duration);
    } finally {
        window.__globalAnimationLock.release();
    }
}
