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