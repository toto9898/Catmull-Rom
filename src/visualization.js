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
    const color = opts.color || 0xff8800;
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

/**
 * Animates de Casteljau's algorithm from t=0 to t=1.
 * Calls a callback with the current t and visualization group.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3[]} controlPoints
 * @param {Function} onUpdate - (t, group) => void
 * @param {number} [duration=2000] - Animation duration in ms
 */
export function animateDeCasteljau(scene, controlPoints, onUpdate, duration = 2000) {
    let start = null;
    let group = null;

    function animateStep(timestamp) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const t = Math.min(elapsed / duration, 1);

        if (group) {
            scene.remove(group);
        }
        group = visualizeDeCasteljau(scene, controlPoints, t);
        if (onUpdate) onUpdate(t, group);

        if (t < 1) {
            requestAnimationFrame(animateStep);
        }
    }
    requestAnimationFrame(animateStep);
}

/**
 * Animates the construction of the second Catmull-Rom Bezier control point:
 * 1. Draws (P2 - P0) from P0 to P2.
 * 2. Animates scaling by 1/6.
 * 3. Animates translation to start from P1.
 * 4. Shows the resulting control point.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} P0
 * @param {THREE.Vector3} P1
 * @param {THREE.Vector3} P2
 * @param {Function} [onComplete] - Called with the final control point position
 * @param {number} [duration=1800] - Total animation duration in ms
 */
export function animateCatmullRomSecondControlPoint(scene, P0, P1, P2, yellowPointMeshes, index, duration = 1800) {
    console.log('animateCatmullRomSecondControlPoint called', P0, P1, P2, scene);
    
    let vectorLine = null, scaledLine = null;
    const phase1 = duration * 0.4; // Draw (P2-P0)
    const phase2 = duration * 0.3; // Scale
    const phase3 = duration * 0.3; // Translate

    // 1. Animate (P2 - P0) from P0 to P2
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
    const geometry = new THREE.BufferGeometry().setFromPoints([P0.clone(), P0.clone()]);
    vectorLine = new THREE.Line(geometry, material);
    scene.add(vectorLine);

    function animateVector(tsStart) {
        function step(ts) {
            const elapsed = ts - tsStart;
            const t = Math.min(elapsed / phase1, 1);
            const current = P0.clone().lerp(P2, t);
            vectorLine.geometry.setFromPoints([P0, current]);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                // 2. Animate scaling by 1/6
                animateScale(performance.now());
            }
        }
        requestAnimationFrame(step);
    }

    // 2. Animate scaling the vector by 1/6
    function animateScale(tsStart) {
        // Remove the full vector line
        scene.remove(vectorLine);

        const scaledMat = new THREE.LineBasicMaterial({ color: 0xff8800 });
        scaledLine = new THREE.Line(new THREE.BufferGeometry(), scaledMat);
        scene.add(scaledLine);

        function step(ts) {
            const elapsed = ts - tsStart;
            const t = Math.min(elapsed / phase2, 1);
            const scaledVec = P2.clone().sub(P0).multiplyScalar(t * (1 / 6));
            const scaledEnd = P0.clone().add(scaledVec);
            scaledLine.geometry.setFromPoints([P0, scaledEnd]);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                // 3. Animate translation to P1
                animateTranslate(performance.now(), scaledVec);
            }
        }
        requestAnimationFrame(step);
    }

    // 3. Animate translation of the scaled vector to start at P1
    function animateTranslate(tsStart, scaledVec) {
        function step(ts) {
            const elapsed = ts - tsStart;
            const t = Math.min(elapsed / phase3, 1);
            const tail = P0.clone().lerp(P1, t);
            const head = tail.clone().add(scaledVec);
            scaledLine.geometry.setFromPoints([tail, head]);
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                // 4. Show the resulting control point
                if (yellowPointMeshes[index]) {
                    scene.remove(yellowPointMeshes[index]);
                }
                const pointGeom = new THREE.SphereGeometry(0.12, 16, 16);
                const pointMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                const pointMesh = new THREE.Mesh(pointGeom, pointMat);
                const finalPos = P1.clone().add(P2.clone().sub(P0).multiplyScalar(1 / 6));
                pointMesh.position.copy(finalPos);
                scene.add(pointMesh);
                yellowPointMeshes[index] = pointMesh;

                // Optionally remove helpers after a delay
                setTimeout(() => {
                    scene.remove(scaledLine);
                    // Keep pointMesh if you want to show the result
                }, 1000);
            }
        }
        requestAnimationFrame(step);
    }

    animateVector(performance.now());
}