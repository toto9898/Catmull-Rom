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

// Use the existing canvas element from the HTML file
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

// Create spheres to represent control points
const controlPointMeshes = controlPoints.map((point) => {
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(point);
    scene.add(mesh);
    return mesh;
});

// Variables to manage the curve type
let isCatmullRom = true; // Start with Bézier curve    
let curve;
let curveGeometry = new THREE.BufferGeometry();
let curveMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
let curveLine;

// Add a variable for the Bézier polygon line
let bezierPolygonLine;
const bezierPolygonMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 }); // Yellow color

// Add a variable to store the hover indicator
let hoverIndicator;

// Function to calculate a point on a Bézier curve using de Casteljau's algorithm
function deCasteljau(controlPoints, t) {
    let points = controlPoints.map((point) => point.clone());
    while (points.length > 1) {
        const nextPoints = [];
        for (let i = 0; i < points.length - 1; i++) {
            const interpolatedPoint = points[i].clone().lerp(points[i + 1], t);
            nextPoints.push(interpolatedPoint);
        }
        points = nextPoints;
    }
    return points[0];
}

// Function to create the Bézier curve manually
function createBezierCurve() {
    const bezierPoints = [];
    const steps = 50; // Number of points on the curve
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        bezierPoints.push(deCasteljau(controlPoints, t));
    }
    return bezierPoints;
}

// Catmull-Rom interpolation using basis matrix (uniform, 1/6 scaling)
function catmullRomInterpolate(P0, P1, P2, P3) {
    return [
        P1.clone(),
        P1.clone().add(P2.clone().sub(P0).multiplyScalar(1 / 6)),
        P2.clone().sub(P3.clone().sub(P1).multiplyScalar(1 / 6)),
        P2.clone()
    ];
}

// Function to create the Catmull-Rom curve manually
function createCatmullRomCurve() {
    const points = [];
    const steps = 50;
    // Duplicate endpoints
    const extended = [
        controlPoints[0].clone(),
        ...controlPoints,
        controlPoints[controlPoints.length - 1].clone()
    ];
    // For each segment between controlPoints[i] and controlPoints[i+1]
    for (let i = 0; i < controlPoints.length - 1; i++) {
        const P0 = extended[i];
        const P1 = extended[i + 1];
        const P2 = extended[i + 2];
        const P3 = extended[i + 3];
        const bezierCPs = catmullRomInterpolate(P0, P1, P2, P3);
        for (let j = 0; j < steps; j++) { // avoid duplicating points at segment joins
            const t = j / steps;
            points.push(deCasteljau(bezierCPs, t));
        }
    }
    // Add the last control point to ensure the curve ends at the last point
    points.push(controlPoints[controlPoints.length - 1].clone());
    return points;
}

// Function to create the curve
function createCurve() {
    if (curveLine) {
        scene.remove(curveLine);
        scene.remove(bezierPolygonLine);
    }

    if (isCatmullRom) {
        // Use manual Catmull-Rom interpolation
        const catmullRomPoints = createCatmullRomCurve();
        curveGeometry = new THREE.BufferGeometry().setFromPoints(catmullRomPoints);
    } else {
        const bezierPoints = createBezierCurve();
        curveGeometry = new THREE.BufferGeometry().setFromPoints(bezierPoints);
        createBezierPolygon(); // Create the Bézier polygon
    }

    curveLine = new THREE.Line(curveGeometry, curveMaterial);
    scene.add(curveLine);
}

// Function to create the Bézier polygon
function createBezierPolygon() {
    if (bezierPolygonLine) {
        scene.remove(bezierPolygonLine);
    }

    // Create a line connecting the control points
    const bezierPolygonGeometry = new THREE.BufferGeometry().setFromPoints(controlPoints);
    bezierPolygonLine = new THREE.Line(bezierPolygonGeometry, bezierPolygonMaterial);
    scene.add(bezierPolygonLine);
}

// Function to create the hover indicator
function createHoverIndicator(position) {
    if (hoverIndicator) {
        scene.remove(hoverIndicator);
    }

    const geometry = new THREE.SphereGeometry(0.115, 16, 16); // Slightly bigger circle
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color
    hoverIndicator = new THREE.Mesh(geometry, material);

    // Position the yellow circle slightly behind the red sphere
    hoverIndicator.position.set(position.x, position.y, position.z - 1); // Move it slightly back on the z-axis
    scene.add(hoverIndicator);
}

// Function to remove the hover indicator
function removeHoverIndicator() {
    if (hoverIndicator) {
        scene.remove(hoverIndicator);
        hoverIndicator = null;
    }
}

// Initial curve creation
createCurve();

// Mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedPoint = null;

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
        createHoverIndicator(hoveredPoint.position); // Create the hover indicator
    } else {
        removeHoverIndicator(); // Remove the hover indicator if no point is hovered
    }

    if (selectedPoint) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Plane facing the camera
        const planeIntersect = raycaster.ray.intersectPlane(plane);

        if (planeIntersect) {
            selectedPoint.position.copy(planeIntersect);
            updateCurve();

            // Update the hover indicator position to follow the selected point
            if (hoverIndicator) {
                hoverIndicator.position.set(
                    selectedPoint.position.x,
                    selectedPoint.position.y,
                    selectedPoint.position.z - 0.1 // Ensure it stays behind the red sphere
                );
            }

            // Update label positions
            updateLabels();
        }
    }
}

function onMouseUp() {
    selectedPoint = null;
}

function updateCurve() {
    // Update control points based on sphere positions
    controlPoints.forEach((point, index) => {
        point.copy(controlPointMeshes[index].position);
    });

    // Update the curve and its geometry
    createCurve();

    // Update the Bézier polygon if it's visible
    if (!isCatmullRom) {
        createBezierPolygon();
    }

    // Update label positions
    updateLabels();
}

// Handle window resize
window.addEventListener("resize", () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -aspect * 5;
    camera.right = aspect * 5;
    camera.top = 5;
    camera.bottom = -5;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mouseup", onMouseUp);

// Add event listener for the toggle button
document.getElementById("toggle-curve").addEventListener("click", () => {
    isCatmullRom = !isCatmullRom;
    createCurve();
});

// Function to visualize de Casteljau algorithm
function visualizeDeCasteljau(controlPoints, t) {
    const intermediateLines = []; // Store intermediate lines for visualization

    let points = controlPoints.map((point) => point.clone());
    while (points.length > 1) {
        const nextPoints = [];
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue color for intermediate lines

        for (let i = 0; i < points.length - 1; i++) {
            const interpolatedPoint = points[i].clone().lerp(points[i + 1], t);
            nextPoints.push(interpolatedPoint);
        }

        // Create a line connecting the current points
        geometry.setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        intermediateLines.push(line);

        points = nextPoints;
    }

    // Highlight the final point
    const finalPointGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const finalPointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color for the final point
    const finalPointMesh = new THREE.Mesh(finalPointGeometry, finalPointMaterial);
    finalPointMesh.position.copy(points[0]);
    scene.add(finalPointMesh);

    // Return intermediate lines and final point for cleanup
    return { intermediateLines, finalPointMesh };
}

// Function to clear visualization
function clearVisualization(visualization) {
    visualization.intermediateLines.forEach((line) => scene.remove(line));
    scene.remove(visualization.finalPointMesh);
}

// Example usage
function visualizeAlgorithm() {
    const t = 0.5; // Example value for t
    const visualization = visualizeDeCasteljau(controlPoints, t);

    // Clear visualization after some time (optional)
    setTimeout(() => {
        clearVisualization(visualization);
    }, 5000);
}

// Add a button to trigger visualization
const visualizeButton = document.createElement("button");
visualizeButton.innerText = "Visualize Algorithm";
visualizeButton.style.position = "absolute";
visualizeButton.style.top = "50px";
visualizeButton.style.left = "10px";
visualizeButton.style.zIndex = "10";
document.body.appendChild(visualizeButton);

visualizeButton.addEventListener("click", visualizeAlgorithm);

// Function to visualize de Casteljau algorithm with animation
function animateDeCasteljau(controlPoints) {
    let t = 0; // Start at t = 0
    const intermediateLines = []; // Store intermediate lines for visualization
    let finalPointMesh = null; // Store the final point mesh
    let previousTimestamp = null; // Store the previous timestamp for time delta calculation

    function step(timestamp) {
        // Calculate time delta
        if (!previousTimestamp) previousTimestamp = timestamp;
        const delta = (timestamp - previousTimestamp) / 1000; // Convert milliseconds to seconds
        previousTimestamp = timestamp;

        // Increment t based on time delta
        t += delta * 0.2; // Adjust the multiplier (0.2) for desired animation speed

        // Clear previous intermediate lines
        intermediateLines.forEach((line) => scene.remove(line));
        intermediateLines.length = 0;

        if (finalPointMesh) {
            scene.remove(finalPointMesh);
        }

        let points = controlPoints.map((point) => point.clone());
        while (points.length > 1) {
            const nextPoints = [];
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue color for intermediate lines

            for (let i = 0; i < points.length - 1; i++) {
                const interpolatedPoint = points[i].clone().lerp(points[i + 1], t);
                nextPoints.push(interpolatedPoint);
            }

            // Create a line connecting the current points
            geometry.setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            intermediateLines.push(line);

            points = nextPoints;
        }

        // Highlight the final point
        const finalPointGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const finalPointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color for the final point
        finalPointMesh = new THREE.Mesh(finalPointGeometry, finalPointMaterial);
        finalPointMesh.position.copy(points[0]);
        scene.add(finalPointMesh);

        if (t <= 1) {
            requestAnimationFrame(step); // Continue animation until t reaches 1
        } else {
            // Cleanup after animation ends
            intermediateLines.forEach((line) => scene.remove(line));
            scene.remove(finalPointMesh);
        }
    }

    requestAnimationFrame(step); // Start the animation
}

// Add a button to trigger animated visualization
const animateButton = document.createElement("button");
animateButton.innerText = "Animate Algorithm";
animateButton.style.position = "absolute";
animateButton.style.top = "90px";
animateButton.style.left = "10px";
animateButton.style.zIndex = "10";
document.body.appendChild(animateButton);

animateButton.addEventListener("click", () => animateDeCasteljau(controlPoints));

// Function to add labels to control points
const labels = []; // Store references to label elements
function addLabels(points, step) {
    points.forEach((point, index) => {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.color = "white";
        div.style.backgroundColor = "black";
        div.style.padding = "2px";
        div.style.fontSize = "12px";
        div.innerHTML = `b<sub>${step}</sub><sub>${index}</sub>`; // Display indices as subscript
        document.body.appendChild(div);
        labels.push(div); // Store the label for later updates
    });

    // Ensure labels are positioned correctly after creation
    updateLabels();
}

// Function to update label positions
function updateLabels() {
    labels.forEach((label, index) => {
        const vector = controlPoints[index].clone().project(camera);
        label.style.left = `${(vector.x + 1) * window.innerWidth / 2}px`;
        label.style.top = `${(-vector.y + 1) * window.innerHeight / 2}px`;
    });
}

// Function to toggle label visibility
let labelsVisible = true; // Track whether labels are visible
function toggleLabels() {
    labelsVisible = !labelsVisible;
    labels.forEach((label) => {
        label.style.display = labelsVisible ? "block" : "none";
    });
}

// Add a button to toggle labels
const toggleLabelsButton = document.createElement("button");
toggleLabelsButton.innerText = "Toggle Labels";
toggleLabelsButton.style.position = "absolute";
toggleLabelsButton.style.top = "130px";
toggleLabelsButton.style.left = "10px";
toggleLabelsButton.style.zIndex = "10";
document.body.appendChild(toggleLabelsButton);

toggleLabelsButton.addEventListener("click", toggleLabels);

// Add labels to control points
addLabels(controlPoints, 0);

// Ensure labels are updated after the first render
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    // Update labels on every frame to ensure they stay aligned
    updateLabels();
}

animate();

// Function to visualize de Casteljau algorithm with animation and labels
function animateDeCasteljauWithLabels(controlPoints) {
    let t = 0; // Start at t = 0
    const intermediateLines = []; // Store intermediate lines for visualization
    const intermediateLabels = []; // Store references to intermediate labels
    let finalPointMesh = null; // Store the final point mesh
    let previousTimestamp = null; // Store the previous timestamp for time delta calculation

    function step(timestamp) {
        // Calculate time delta
        if (!previousTimestamp) previousTimestamp = timestamp;
        const delta = (timestamp - previousTimestamp) / 1000; // Convert milliseconds to seconds
        previousTimestamp = timestamp;

        // Increment t based on time delta
        t += delta * 0.2; // Adjust the multiplier (0.2) for desired animation speed

        // Clear previous intermediate lines and labels
        intermediateLines.forEach((line) => scene.remove(line));
        intermediateLines.length = 0;

        intermediateLabels.forEach((label) => document.body.removeChild(label));
        intermediateLabels.length = 0;

        if (finalPointMesh) {
            scene.remove(finalPointMesh);
        }

        let points = controlPoints.map((point) => point.clone());
        let stepIndex = 0; // Track the step index for labeling
        while (points.length > 1) {
            const nextPoints = [];
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue color for intermediate lines

            for (let i = 0; i < points.length - 1; i++) {
                const interpolatedPoint = points[i].clone().lerp(points[i + 1], t);
                nextPoints.push(interpolatedPoint);

                // Create labels for intermediate points
                const div = document.createElement("div");
                div.style.position = "absolute";
                div.style.color = "white";
                div.style.backgroundColor = "black";
                div.style.padding = "2px";
                div.style.fontSize = "12px";
                div.innerHTML = `b<sub>${stepIndex + 1}</sub><sub>${i}</sub>`; // Display indices as subscript
                document.body.appendChild(div);
                intermediateLabels.push(div);

                // Position the label
                const vector = interpolatedPoint.clone().project(camera);
                div.style.left = `${(vector.x + 1) * window.innerWidth / 2}px`;
                div.style.top = `${(-vector.y + 1) * window.innerHeight / 2}px`;
            }

            // Create a line connecting the current points
            geometry.setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            intermediateLines.push(line);

            points = nextPoints;
            stepIndex++;
        }

        // Highlight the final point
        const finalPointGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const finalPointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color for the final point
        finalPointMesh = new THREE.Mesh(finalPointGeometry, finalPointMaterial);
        finalPointMesh.position.copy(points[0]);
        scene.add(finalPointMesh);

        if (t <= 1) {
            requestAnimationFrame(step); // Continue animation until t reaches 1
        } else {
            // Cleanup after animation ends
            intermediateLines.forEach((line) => scene.remove(line));
            intermediateLabels.forEach((label) => document.body.removeChild(label));
            scene.remove(finalPointMesh);
        }
    }

    requestAnimationFrame(step); // Start the animation
}

// Add a button to trigger animated visualization with labels
const animateWithLabelsButton = document.createElement("button");
animateWithLabelsButton.innerText = "Animate with Labels";
animateWithLabelsButton.style.position = "absolute";
animateWithLabelsButton.style.top = "170px";
animateWithLabelsButton.style.left = "10px";
animateWithLabelsButton.style.zIndex = "10";
document.body.appendChild(animateWithLabelsButton);

animateWithLabelsButton.addEventListener("click", () => animateDeCasteljauWithLabels(controlPoints));

// Create a checkbox to activate the slider
const sliderCheckbox = document.createElement("input");
sliderCheckbox.type = "checkbox";
sliderCheckbox.style.position = "absolute";
sliderCheckbox.style.top = "170px";
sliderCheckbox.style.left = "150px";
sliderCheckbox.style.zIndex = "10";
document.body.appendChild(sliderCheckbox);

const sliderCheckboxLabel = document.createElement("label");
sliderCheckboxLabel.innerText = "Manual Interpolation";
sliderCheckboxLabel.style.position = "absolute";
sliderCheckboxLabel.style.top = "170px";
sliderCheckboxLabel.style.left = "180px";
sliderCheckboxLabel.style.zIndex = "10";
document.body.appendChild(sliderCheckboxLabel);

// Create a slider for manual interpolation
const interpolationSlider = document.createElement("input");
interpolationSlider.type = "range";
interpolationSlider.min = "0";
interpolationSlider.max = "1";
interpolationSlider.step = "0.01";
interpolationSlider.style.position = "absolute";
interpolationSlider.style.bottom = "20px";
interpolationSlider.style.left = "50%";
interpolationSlider.style.transform = "translateX(-50%)";
interpolationSlider.style.zIndex = "10";
interpolationSlider.style.display = "none"; // Initially hidden
document.body.appendChild(interpolationSlider);

// Add event listener to toggle slider visibility
sliderCheckbox.addEventListener("change", () => {
    interpolationSlider.style.display = sliderCheckbox.checked ? "block" : "none";
});

// Variables to store references to objects created during manual interpolation
let sliderIntermediateLines = [];
let sliderIntermediateLabels = [];
let sliderFinalPointMesh = null;

// Function to manually interpolate the animation using the slider
function manualInterpolation(controlPoints, t) {
    // Clear previous intermediate lines and labels
    sliderIntermediateLines.forEach((line) => scene.remove(line));
    sliderIntermediateLines.length = 0;

    sliderIntermediateLabels.forEach((label) => document.body.removeChild(label));
    sliderIntermediateLabels.length = 0;

    if (sliderFinalPointMesh) {
        scene.remove(sliderFinalPointMesh);
        sliderFinalPointMesh = null;
    }

    let points = controlPoints.map((point) => point.clone());
    let stepIndex = 0; // Track the step index for labeling
    while (points.length > 1) {
        const nextPoints = [];
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue color for intermediate lines

        for (let i = 0; i < points.length - 1; i++) {
            const interpolatedPoint = points[i].clone().lerp(points[i + 1], t);
            nextPoints.push(interpolatedPoint);

            // Create labels for intermediate points
            const div = document.createElement("div");
            div.style.position = "absolute";
            div.style.color = "white";
            div.style.backgroundColor = "black";
            div.style.padding = "2px";
            div.style.fontSize = "12px";
            div.innerHTML = `b<sub>${stepIndex + 1}</sub><sub>${i}</sub>`; // Display indices as subscript
            document.body.appendChild(div);
            sliderIntermediateLabels.push(div);

            // Position the label
            const vector = interpolatedPoint.clone().project(camera);
            div.style.left = `${(vector.x + 1) * window.innerWidth / 2}px`;
            div.style.top = `${(-vector.y + 1) * window.innerHeight / 2}px`;
        }

        // Create a line connecting the current points
        geometry.setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        sliderIntermediateLines.push(line);

        points = nextPoints;
        stepIndex++;
    }

    // Highlight the final point
    const finalPointGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const finalPointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color for the final point
    sliderFinalPointMesh = new THREE.Mesh(finalPointGeometry, finalPointMaterial);
    sliderFinalPointMesh.position.copy(points[0]);
    scene.add(sliderFinalPointMesh);
}

// Add event listener to the slider for manual interpolation
interpolationSlider.addEventListener("input", () => {
    const t = parseFloat(interpolationSlider.value);
    manualInterpolation(controlPoints, t);
});