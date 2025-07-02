/**
 * Animates the construction of the third Catmull-Rom Bezier control point (b2):
 * 1. Draws (P1 - P3) from P2 to P2 + (P1 - P3)
 * 2. Animates scaling by 1/6.
 * 3. Animates translation to end at P2.
 * 4. Shows the resulting control point.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} P1
 * @param {THREE.Vector3} P2
 * @param {THREE.Vector3} P3
 * @param {Array} yellowPointMeshes
 * @param {number} index
 * @param {number} [duration=1800]
 */

// catmullRomAnimation.js
// Contains Catmull-Rom specific animation utilities for the visualization app.

/**
 * Animates the construction of the second Catmull-Rom Bezier control point:
 * 1. Draws (P2 - P0) from P0 to P2.
 * 2. Animates scaling by 1/6.
 * 3. Animates translation to start from P1.
 * 4. Shows the resulting control point.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} P0
 * @param {THREE.Vector3} P1
 * @param {THREE.Vector3} P2
 * @param {Array} yellowPointMeshes
 * @param {number} index
 * @param {number} [duration=1800]
 */
import { animateVectorScalingTo, animateVectorTranslation, animateVector } from './vectorAnimation.js';

export function animateCatmullRomControlPoint(scene, P0, P1, P2, yellowPointMeshes, index, duration = 3000, which = 1) {
    // which: 1 for first (b1), 2 for second (b2)
    // Phase durations
    const phase1 = duration; // Draw (P2-P0) or (P1-P3)
    const phase2 = duration; // Scale
    const phase3 = duration; // Translate

    // 1. Animate (P2 - P0) from P0 to P2 (for b1), or (P1 - P3) from P2 to P2 + (P1 - P3) (for b2)
    let from, to, fullVec, scaleFormula, translateFormula, vectorFormula, finalPos;
    // Always use the same logic for animation, only change LaTeX formulas for which=2
    from = P0;
    to = P2;
    fullVec = P2.clone().sub(P0);
    if (which === 1) {
        vectorFormula = '\\vec{v} = \\vec{P}_2 - \\vec{P}_0';
        scaleFormula = '\\vec{v}_{\\text{scaled}} = \\cfrac{\\vec{P}_2 - \\vec{P}_0}{6}';
        translateFormula = '\\vec{Q} = \\vec{P}_1 + \\cfrac{\\vec{P}_2 - \\vec{P}_0}{6}';
    } else {
        vectorFormula = '\\vec{v} = \\vec{P}_1 - \\vec{P}_3';
        scaleFormula = '\\vec{v}_{\\text{scaled}} = \\cfrac{\\vec{P}_1 - \\vec{P}_3}{6}';
        translateFormula = '\\vec{Q} = \\vec{P}_2 + \\cfrac{\\vec{P}_1 - \\vec{P}_3}{6}';
    }
    finalPos = P1.clone().add(fullVec.clone().multiplyScalar(1 / 6));
    let line1 = null;
    // No pause or await logic, just chained callbacks
    function runPhase1() {
        line1 = animateVector(
            scene,
            from,
            to,
            {
                duration: phase1,
                formula: vectorFormula,
                onComplete: runPhase2
            }
        );
    }
    function runPhase2() {
        const scaledLength = fullVec.length() * (1 / 6);
        animateVectorScalingTo(
            scene,
            line1,
            scaledLength,
            {
                duration: phase2,
                formula: scaleFormula,
                onComplete: runPhase3
            }
        );
    }
    function runPhase3() {
        const points = line1.geometry.attributes.position.array;
        const currentStart = new THREE.Vector3(points[0], points[1], points[2]);
        let translation = P1.clone().sub(currentStart);
        animateVectorTranslation(
            scene,
            line1,
            translation,
            {
                duration: phase3,
                formula: translateFormula,
                onComplete: () => {
                    // 4. Show the resulting control point
                    const pointGeom = new THREE.SphereGeometry(0.07, 16, 16);
                    const pointMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                    const pointMesh = new THREE.Mesh(pointGeom, pointMat);
                    pointMesh.position.copy(finalPos);
                    scene.add(pointMesh);
                    if (Array.isArray(yellowPointMeshes)) yellowPointMeshes.push(pointMesh);
                    // Remove the line after showing the point
                    scene.remove(line1);
                }
            }
        );
    }
    setTimeout(runPhase1, 0);
}
