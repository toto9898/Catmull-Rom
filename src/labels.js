/**
 * Adds HTML labels for given points and appends them to the DOM.
 * @param {THREE.Vector3[]} points - Points to label.
 * @param {number|string} step - Step or curve index for label text.
 * @param {THREE.Camera} camera - Camera for projection.
 * @param {HTMLElement[]} labels - Array to store created label elements.
 * @param {Function} [labelFormatter] - Optional function (point, index, step) => string for label HTML.
 */
export function addLabels(points, step, camera, labels, labelFormatter) {
    points.forEach((point, index) => {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.color = "white";
        div.style.backgroundColor = "black";
        div.style.padding = "2px";
        div.style.fontSize = "12px";
        div.style.pointerEvents = "none";
        div.innerHTML = labelFormatter
            ? labelFormatter(point, index, step)
            : `b<sub>${step}</sub><sub>${index}</sub>`;
        document.body.appendChild(div);
        labels.push(div);
    });
    updateLabels(points, camera, labels);
}

/**
 * Updates the position of each label to match its 3D point.
 * @param {THREE.Vector3[]} points
 * @param {THREE.Camera} camera
 * @param {HTMLElement[]} labels
 */
export function updateLabels(points, camera, labels) {
    labels.forEach((label, index) => {
        if (!points[index]) return;
        const vector = points[index].clone().project(camera);
        label.style.left = `${(vector.x + 1) * window.innerWidth / 2}px`;
        label.style.top = `${(-vector.y + 1) * window.innerHeight / 2}px`;
    });
}

/**
 * Shows or hides all labels.
 * @param {HTMLElement[]} labels
 * @param {boolean} labelsVisible
 */
export function toggleLabels(labels, labelsVisible) {
    labels.forEach((label) => {
        label.style.display = labelsVisible ? "block" : "none";
    });
}

/**
 * Removes all labels from the DOM and clears the array.
 * @param {HTMLElement[]} labels
 */
export function removeLabels(labels) {
    labels.forEach(label => {
        if (label.parentNode) label.parentNode.removeChild(label);
    });
    labels.length = 0;
}

/**
 * Controls label visibility and updates all labels.
 * @param {THREE.Vector3[]} controlPoints
 * @param {THREE.Camera} camera
 * @param {HTMLElement[]} labels
 * @param {boolean} labelsVisible
 */
export function updateAllLabels(controlPoints, camera, labels, labelsVisible) {
    removeLabels(labels);
    if (!labelsVisible) return;
    addLabels(controlPoints, 0, camera, labels);
}

let hoverIndicatorMesh = null;

/**
 * Creates a yellow hover indicator at the given position.
 * @param {THREE.Vector3} position
 * @param {THREE.Scene} scene
 */
export function createHoverIndicator(position, scene) {
    if (hoverIndicatorMesh) {
        scene.remove(hoverIndicatorMesh);
    }
    const geometry = new THREE.SphereGeometry(0.115, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    hoverIndicatorMesh = new THREE.Mesh(geometry, material);
    hoverIndicatorMesh.position.copy(position);

    // Position the yellow circle slightly behind the red sphere
    hoverIndicatorMesh.position.set(position.x, position.y, position.z - 1); // Move it slightly back on the z-axis
    hoverIndicatorMesh.renderOrder = -1; // Lower than control points
    scene.add(hoverIndicatorMesh);
}

/**
 * Removes the hover indicator from the scene.
 * @param {THREE.Scene} scene
 */
export function removeHoverIndicator(scene) {
    if (hoverIndicatorMesh) {
        scene.remove(hoverIndicatorMesh);
        hoverIndicatorMesh = null;
    }
}