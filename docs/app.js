import { createBezierCurve, createCatmullRomCurve } from './curves.js';
import { setupInteraction } from './interaction.js';
import { createHoverIndicator, removeHoverIndicator } from './labels.js';
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

const curveLineCheckbox = document.getElementById('curveLine-visibility');
curveLineCheckbox.addEventListener('change', () => {
    if (curveLine) curveLine.visible = curveLineCheckbox.checked;
});

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
    curveLine.visible = curveLineCheckbox.checked;
    scene.add(curveLine);
}

// === Interaction ===
setupInteraction(
    camera,
    controlPointMeshes,
    updateCurve,
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
});

// === Animation Loop ===
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Remove dynamic creation of the animateBtn
const animateBtn = document.getElementById('animate-btn');
animateBtn.onclick = () => {
    // Save current state
    const prevCurveLineVisible = curveLine ? curveLine.visible : undefined;
    const prevCurveLineCheckboxChecked = curveLineCheckbox.checked;
    // Hide the legacy curveLine during animation
    if (curveLine) curveLine.visible = false;
    curveLineCheckbox.checked = false;

    const baseDuration = 5000; // Base animation duration in ms
    const duration = baseDuration / animationSpeed;
    animateDeCasteljau(
        scene,
        controlPoints,
        (t, group) => {
            // Optionally update labels or UI here during animation
        },
        duration
    ).finally(() => {
        // Restore the legacy curveLine and checkbox state after a pause-safe delay
        new PausableTimeout(() => {
            if (curveLine && prevCurveLineVisible !== undefined) curveLine.visible = prevCurveLineVisible;
            curveLineCheckbox.checked = prevCurveLineCheckboxChecked;
        }, duration);
    });
};

// === Speed Slider ===
let animationSpeed = 1;
const speedSlider = document.getElementById('speed-slider');
const speedSliderValue = document.getElementById('speed-slider-value');
speedSlider.addEventListener('input', () => {
    animationSpeed = parseFloat(speedSlider.value);
    speedSliderValue.textContent = animationSpeed.toFixed(2) + 'x';
});
// Set initial value
speedSliderValue.textContent = speedSlider.value + 'x';

// Initial draw
updateCurve();

export { camera, scene };
