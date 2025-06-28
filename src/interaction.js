import { animateCatmullRomSecondControlPoint } from './visualization.js'; // Make sure this is exported

/**
 * Sets up mouse interaction for dragging control points and hover indication.
 * @param {THREE.Camera} camera - The camera used for raycasting.
 * @param {THREE.Object3D[]} controlPointMeshes - Array of mesh objects representing control points.
 * @param {Function} updateCurve - Callback to update the curve when a point moves.
 * @param {Function} updateLabels - Callback to update labels when a point moves.
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
    updateLabels,
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

    function onMouseDown(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(controlPointMeshes);
        if (intersects.length > 0) {
            selectedPoint = intersects[0].object;
        }
    }

    function onMouseMove(event) {
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
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            const planeIntersect = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
                selectedPoint.position.copy(planeIntersect);
                updateCurve();
                updateLabels();

                // Regenerate all yellow points from their red origins
                for (let idx = 0; idx < yellowPointMeshes.length; idx++) {
                    if (yellowPointMeshes[idx]) {
                        if (idx > 0 && idx < controlPoints.length - 1) {
                            const P0 = controlPoints[idx - 1];
                            const P1 = controlPoints[idx];
                            const P2 = controlPoints[idx + 1];
                            const yellowPos = P1.clone().add(P2.clone().sub(P0).multiplyScalar(1 / 6));
                            yellowPointMeshes[idx].position.copy(yellowPos);
                        }
                    }
                }
            }
        }
    }

    function onMouseUp() {
        selectedPoint = null;
    }

    function onCanvasClick(event) {
        if (!controlPoints || !scene || !canvas) return;
        // Prevent adding if hovering a point
        if (isHoveringPoint) return;

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
        updateLabels();
    }

    // --- Ctrl+Z to remove last added point ---
    function onKeyDown(event) {
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
                updateLabels();
            }
        }
    }

    // --- Context Menu for Control Points ---
    function onContextMenu(event) {
        console.log('Context menu event fired'); // Add this
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
                if (i > 0 && i < controlPoints.length - 1) {
                    const P0 = controlPoints[i - 1];
                    const P1 = controlPoints[i];
                    const P2 = controlPoints[i + 1];
                    animateCatmullRomSecondControlPoint(scene, P0, P1, P2, yellowPointMeshes, i);
                } else {
                    alert('Need at least one point before and after to animate tangent.');
                }
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