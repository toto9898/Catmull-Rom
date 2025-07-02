import { animateCatmullRomControlPoint } from './catmullRomAnimation.js'; // Make sure this is exported
import { createBezierCurve } from './curves.js';
import { animateDeCasteljau } from './visualization.js';


const bezierPointsMeshes = [];

// Import the main curve line reference from visualization.js
import { curveSegmentLine, setCurveLine } from './visualization.js';

// Utility to remove all bezierPointsMeshes and the main curve line from the scene
function clearBezierPointsMeshes(scene) {
    if (!scene) return;
    for (const mesh of bezierPointsMeshes) {
        if (mesh && mesh.parent === scene) {
            scene.remove(mesh);
        }
    }
    bezierPointsMeshes.length = 0;
    setCurveLine(null, scene);
}

/**
 * Sets up mouse interaction for dragging control points and hover indication.
 * @param {THREE.Camera} camera - The camera used for raycasting.
 * @param {THREE.Object3D[]} controlPointMeshes - Array of mesh objects representing control points.
 * @param {Function} updateCurve - Callback to update the curve when a point moves.
 * @param {Function} createHoverIndicator - Callback to show hover indicator.
 * @param {Function} removeHoverIndicator - Callback to hide hover indicator.
 * @param {Array} controlPoints - Array of control points.
 * @param {THREE.Scene} scene - The scene object.
 * @param {THREE.WebGLRenderer} renderer - The renderer object.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @returns {Function} Cleanup function to remove event listeners.
 */
export function setupInteraction(
    camera,
    controlPointMeshes,
    updateCurve,
    createHoverIndicator,
    removeHoverIndicator,
    controlPoints = null,
    scene = null,
    renderer = null,
    canvas = null,
    yellowPointMeshes = null
) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedPoint = null;
    let isHoveringPoint = false;
    let contextMenuDiv = null;
    let contextMenuTargetIndex = null;

    function isInteractionLocked() {
        return window.__globalAnimationLock && window.__globalAnimationLock._locked;
    }

    let dragStarted = false;
    let dragMoved = false;
    function onMouseDown(event) {
        // Only allow interaction with pause button during pause
        if (window.__globalAnimationState && window.__globalAnimationState.paused) {
            if (!(event.target && event.target.id === 'global-stop-btn')) return;
        }
        if (event.target && event.target.id === 'global-stop-btn') return;
        if (isInteractionLocked()) return;
        // Prevent dragging with right mouse button (button === 2)
        if (event.button === 2) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(controlPointMeshes);
        if (intersects.length > 0) {
            selectedPoint = intersects[0].object;
            dragStarted = true;
            dragMoved = false;
        }
    }

    function onMouseMove(event) {
        // Only allow interaction with pause button during pause
        if (window.__globalAnimationState && window.__globalAnimationState.paused) {
            if (!(event.target && event.target.id === 'global-stop-btn')) return;
        }
        if (event.target && event.target.id === 'global-stop-btn') return;
        if (isInteractionLocked()) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(controlPointMeshes);

        if (intersects.length > 0) {
            const hoveredPoint = intersects[0].object;
            createHoverIndicator(hoveredPoint.position);
            isHoveringPoint = true;
        } else {
            removeHoverIndicator();
            isHoveringPoint = false;
        }

        if (selectedPoint) {
            dragMoved = true;
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            const planeIntersect = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
                selectedPoint.position.copy(planeIntersect);
                updateCurve();
            }
        }
    }

    function onMouseUp(event) {
        // Only allow interaction with pause button during pause
        if (window.__globalAnimationState && window.__globalAnimationState.paused) {
            if (!(event && event.target && event.target.id === 'global-stop-btn')) return;
        }
        if (event && event.target && event.target.id === 'global-stop-btn') return;
        if (isInteractionLocked()) return;
        if (selectedPoint && dragStarted && dragMoved) {
            clearBezierPointsMeshes(scene);
        }
        selectedPoint = null;
        dragStarted = false;
        dragMoved = false;
    }

    let suppressNextCanvasClick = false;
    function onCanvasClick(event) {
        if (window.__globalAnimationState && window.__globalAnimationState.paused) {
            if (!(event.target && event.target.id === 'global-stop-btn')) return;
        }
        if (isInteractionLocked()) return;
        if (event.target && event.target.id === 'global-stop-btn') return;
        if (suppressNextCanvasClick) {
            suppressNextCanvasClick = false;
            return;
        }
        if (!controlPoints || !scene || !canvas) return;
        // Prevent adding if hovering a point
        if (isHoveringPoint) return;

        clearBezierPointsMeshes(scene);
        const rect = canvas.getBoundingClientRect();
        const mouseNDC = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const vector = new THREE.Vector3(mouseNDC.x, mouseNDC.y, 0.5);
        vector.unproject(camera);
        const dir = new THREE.Vector3(0, 0, -1);
        const distance = (0 - camera.position.z) / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));
        pos.x = vector.x;
        pos.y = vector.y;
        pos.z = 0;

        controlPoints.push(pos);
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(pos);
        mesh.renderOrder = 1;
        scene.add(mesh);
        controlPointMeshes.push(mesh);
        yellowPointMeshes.push(undefined);

        updateCurve();
    }

    // --- Ctrl+Z to remove last added point ---
    function onKeyDown(event) {
        if (isInteractionLocked()) return;
        clearBezierPointsMeshes(scene);
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            // Only allow removing if more than the initial points remain
            if (controlPoints && controlPointMeshes && controlPoints.length > 0 && controlPointMeshes.length > 0) {
                // Remove last mesh from scene and array
                const mesh = controlPointMeshes.pop();
                if (mesh && scene) scene.remove(mesh);
                const yellowMesh = yellowPointMeshes.pop();
                if (yellowMesh && scene) scene.remove(yellowMesh);
                // Remove last control point
                controlPoints.pop();
                updateCurve();
            }
        }
    }

    // --- Context Menu for Control Points ---
    function onContextMenu(event) {
        // Allow pause button to work
        if (event.target && event.target.id === 'global-stop-btn') return;
        if (isInteractionLocked()) return;
        event.preventDefault();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(controlPointMeshes);

        if (intersects.length > 0) {
            // Remove any existing menu
            if (contextMenuDiv) {
                document.body.removeChild(contextMenuDiv);
                contextMenuDiv = null;
            }
            const mesh = intersects[0].object;
            contextMenuTargetIndex = controlPointMeshes.indexOf(mesh);

            // Create menu
            contextMenuDiv = document.createElement('div');
            contextMenuDiv.style.position = 'absolute';
            contextMenuDiv.style.left = `${event.clientX}px`;
            contextMenuDiv.style.top = `${event.clientY}px`;
            contextMenuDiv.style.background = '#222';
            contextMenuDiv.style.color = '#fff';
            contextMenuDiv.style.padding = '8px 12px';
            contextMenuDiv.style.borderRadius = '6px';
            contextMenuDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            contextMenuDiv.style.zIndex = 10000;
            contextMenuDiv.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            // Add animation option
            const animateOption = document.createElement('div');
            animateOption.textContent = 'Animate tangent construction';
            animateOption.style.cursor = 'pointer';
            animateOption.onmouseenter = () => animateOption.style.background = '#444';
            animateOption.onmouseleave = () => animateOption.style.background = 'none';
            animateOption.onclick = () => {
                document.body.removeChild(contextMenuDiv);
                contextMenuDiv = null;
                const i = contextMenuTargetIndex;
                // Handle edge cases for i == 0 and i == len-2
                const len = controlPoints.length;
                if (len < 4) {
                    alert('Need at least four points to animate tangent.');
                    return;
                }
                if (i < 0 || i > len - 2) {
                    alert('Invalid index for tangent animation.');
                    return;
                }
                let P0, P1, P2, P3;
                if (i === 0) {
                    P0 = controlPoints[0];
                    P1 = controlPoints[0];
                    P2 = controlPoints[1];
                    P3 = controlPoints[2];
                } else if (i === len - 2) {
                    P0 = controlPoints[len - 3];
                    P1 = controlPoints[len - 2];
                    P2 = controlPoints[len - 1];
                    P3 = controlPoints[len - 1];
                } else {
                    P0 = controlPoints[i - 1];
                    P1 = controlPoints[i];
                    P2 = controlPoints[i + 1];
                    P3 = controlPoints[i + 2];
                }
                // Always get the latest speed from the slider
                const speedSlider = document.getElementById('speed-slider');
                const currentSpeed = speedSlider ? parseFloat(speedSlider.value) : 1;
                const duration = 3000 / currentSpeed; // Duration for each phase
                animateCatmullRomControlPoint(scene, P0, P1, P2, bezierPointsMeshes, i, duration, 1);
                setTimeout(() => {
                    animateCatmullRomControlPoint(scene, P3, P2, P1, bezierPointsMeshes, i + 1, duration, 2);
                }, duration * 3);
                // Compute Bezier control points
                const b_1 = P1.clone().add(P2.clone().sub(P0).multiplyScalar(1 / 6));
                const b_2 = P2.clone().add(P1.clone().sub(P3).multiplyScalar(1 / 6));
                // Animate de Casteljau's algorithm with the correct control points
                setTimeout(() => {
                    animateDeCasteljau(
                        scene,
                        [P1, b_1, b_2, P2],
                        (t, group) => {
                            // Optionally update labels or UI here during animation
                        },
                        5000 / currentSpeed, // duration in ms (optional)
                        '#ffff00' // Middle point color
                    );
                }, duration * 6);
            };
            contextMenuDiv.appendChild(animateOption);

            // Add close on click elsewhere
            setTimeout(() => {
                window.addEventListener('mousedown', closeContextMenu, { once: true });
            }, 0);

            document.body.appendChild(contextMenuDiv);
        }
    }

    function closeContextMenu() {
        if (contextMenuDiv) {
            document.body.removeChild(contextMenuDiv);
            contextMenuDiv = null;
            // Prevent next canvas click from creating a point
            suppressNextCanvasClick = true;
        }
    }

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("contextmenu", onContextMenu);

    if (canvas) {
        canvas.addEventListener('click', onCanvasClick);
        canvas.addEventListener('contextmenu', onContextMenu);
    }
    window.addEventListener('keydown', onKeyDown);

    // Return cleanup function
    return () => {
        window.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("contextmenu", onContextMenu);
        if (canvas) {
            canvas.removeEventListener('click', onCanvasClick);
            canvas.removeEventListener('contextmenu', onContextMenu);
        }
        window.removeEventListener('keydown', onKeyDown);
        closeContextMenu();
    };
}