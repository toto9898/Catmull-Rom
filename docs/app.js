import { createBezierCurve, createCatmullRomCurve } from './curves.js';
import { setupInteraction } from './interaction.js';
import { updateLabels, toggleLabels, updateAllLabels, createHoverIndicator, removeHoverIndicator } from './labels.js';
import { visualizeDeCasteljau, animateDeCasteljau } from './visualization.js';
import { showLatexFormula, PausableTimeout } from './latexBox.js';
import { animateVectorScalingTo } from './vectorAnimation.js';

// === Scene Setup ===
const scene = new THREE.Scene();
// Define the orthographic camera
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
    -aspect * 5, // left
    aspect * 5,  // right
    5,           // top
    -5,          // bottom
    0.1,         // near
    1000         // far
);
camera.position.z = 5;

const canvas = document.getElementById('webgl-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Control points for the curves
const controlPoints = [
    new THREE.Vector3(-2, 0, 0), // b_0
    new THREE.Vector3(-1, 2, 0), // b_1
    new THREE.Vector3(1, -2, 0), // b_2
    new THREE.Vector3(2, 0, 0),  // b_3
];

const yellowPointMeshes = [];

// Create spheres to represent control points
const controlPointMeshes = controlPoints.map((point) => {
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(point);
    scene.add(mesh);
    return mesh;
});

// === Curve Line (for legacy, not the main shared curve line) ===
let curveLine = null;

function updateCurve() {
    // Remove old curve
    if (curveLine) scene.remove(curveLine);

    // Update controlPoints from meshes
    controlPoints.forEach((pt, i) => pt.copy(controlPointMeshes[i].position));

    // Choose curve type
    const curvePoints = createCatmullRomCurve(controlPoints, 100); // or createBezierCurve
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
    curveLine = new THREE.Line(geometry, material);
    scene.add(curveLine);
}

// === Labels ===
const labels = [];
let labelsVisible = false;

function handleUpdateAllLabels() {
    updateAllLabels(controlPoints, camera, labels, labelsVisible);
}

// === Interaction ===
setupInteraction(
    camera,
    controlPointMeshes,
    updateCurve,
    handleUpdateAllLabels,
    (pos) => createHoverIndicator(pos, scene),
    () => removeHoverIndicator(scene),
    controlPoints,
    scene,
    renderer,
    canvas,
    yellowPointMeshes
);

// === Window Resize ===
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    handleUpdateAllLabels();
});

// === Animation Loop ===
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    updateLabels(controlPoints, camera, labels);
}
animate();

// === Example: Toggle Labels Button ===
const toggleBtn = document.createElement('button');
toggleBtn.textContent = 'Toggle Labels';
toggleBtn.style.position = 'absolute';
toggleBtn.style.left = '10px';
toggleBtn.style.top = '10px';
toggleBtn.onclick = () => {
    labelsVisible = !labelsVisible;
    toggleLabels(labels, labelsVisible);
    handleUpdateAllLabels();
};
document.body.appendChild(toggleBtn);

// Add a button to trigger the animation
const animateBtn = document.createElement('button');
animateBtn.textContent = 'Animate de Casteljau using the red points';
animateBtn.style.position = 'absolute';
animateBtn.style.left = '10px';
animateBtn.style.top = '90px';
animateBtn.style.zIndex = '10';
document.body.appendChild(animateBtn);

animateBtn.onclick = () => {
    // Hide the legacy curveLine during animation
    if (curveLine) curveLine.visible = false;
    animateDeCasteljau(
        scene,
        controlPoints,
        (t, group) => {
            // Optionally update labels or UI here during animation
        },
        1000 // duration in ms (optional)
    ).finally(() => {
        // Restore the legacy curveLine after a pause-safe delay
        new PausableTimeout(() => {
            if (curveLine) curveLine.visible = true;
        }, 1000); // 1000ms buffer; adjust as needed
    });
};

// Initial draw
updateCurve();
