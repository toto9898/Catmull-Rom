import { createBezierCurve, createCatmullRomCurve } from './curves.js';
import { setupInteraction } from './interaction.js';
import { updateLabels, toggleLabels, updateAllLabels, createHoverIndicator, removeHoverIndicator } from './labels.js';
import { visualizeDeCasteljau, animateDeCasteljau } from './visualization.js';
import { showLatexFormula } from './latexBox.js';
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

// === Curve Line ===
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
animateBtn.textContent = 'Animate Algorithm';
animateBtn.style.position = 'absolute';
animateBtn.style.left = '10px';
animateBtn.style.top = '90px';
animateBtn.style.zIndex = '10';
document.body.appendChild(animateBtn);

animateBtn.onclick = () => {
    animateDeCasteljau(
        scene,
        controlPoints,
        (t, group) => {
            // Optionally update labels or UI here during animation
        },
        5000 // duration in ms (optional)
    );
};

// === TESTS for animateVectorScalingTo ===
// Add a button to test animateVectorScalingTo with various cases
const testAnimBtn = document.createElement('button');
testAnimBtn.textContent = 'Test animateVectorScalingTo';
testAnimBtn.style.position = 'absolute';
testAnimBtn.style.left = '10px';
testAnimBtn.style.top = '130px';
testAnimBtn.style.zIndex = '10';
document.body.appendChild(testAnimBtn);

testAnimBtn.onclick = () => {
    // Remove previous test lines if any
    scene.children.filter(obj => obj.userData && obj.userData.testLine).forEach(obj => scene.remove(obj));

    // pt1 == pt2, direction provided
    const pt3 = new THREE.Vector3(0, 0, 0);
    const dir2 = new THREE.Vector3(2, 1, 0);
    const line2 = animateVectorScalingTo(scene, pt3, pt3, 2.5, dir2, {
        color: 0xff0000,
        duration: 3000, // Animate for 5 seconds
        formula: 'a^2 + b^2 = c^2',
        onComplete: () => scene.remove(line2) // Remove line after animation
    });
    line2.userData.testLine = true;

    // pt1 == pt2, direction provided
    const pt1 = new THREE.Vector3(0, 0, 0);
    const pt2 = new THREE.Vector3(2.5, 0, 0);
    const dir = pt2.clone().sub(pt1).negate();
    const line1 = animateVectorScalingTo(scene, pt1, pt2, 2.5, dir, {
        color: 0xff0000,
        duration: 3000, // Animate for 5 seconds
        formula: 'a^2 + b^2 = c^2',
        onComplete: () => scene.remove(line1) // Remove line after animation
    });
    line1.userData.testLine = true;
};

// Initial draw
updateCurve();

showLatexFormula('b_1 + \\frac{1}{6}(b_2 - b_0)', 3000); // Show LaTeX formula for 3 seconds
