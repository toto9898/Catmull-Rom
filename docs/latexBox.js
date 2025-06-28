// latexBox.js
// Utility for showing LaTeX formulas in a fixed box at the bottom-middle of the screen

// Create the LaTeX box if it doesn't exist
function ensureLatexBox() {
    let box = document.getElementById('latex-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'latex-box';
        box.style.position = 'fixed';
        box.style.left = '50%';
        box.style.bottom = '30px';
        box.style.transform = 'translateX(-50%)';
        box.style.background = 'rgba(30,30,30,0.95)';
        box.style.color = '#fff';
        box.style.padding = '16px 24px';
        box.style.borderRadius = '10px';
        box.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
        box.style.fontSize = '1.2em';
        box.style.zIndex = '10001';
        box.style.minWidth = '200px';
        box.style.textAlign = 'center';
        box.style.pointerEvents = 'none';
        document.body.appendChild(box);
    }
    return box;
}

/**
 * Show a LaTeX formula in the bottom box, optionally for a limited time.
 * @param {string} latex - The LaTeX string to render (without $ or \[...\])
 * @param {number} [timeMs] - Optional time in milliseconds to show the formula before hiding.
 */
let latexBoxTimeout = null;
let latexBoxFadeAnim = null;
export function showLatexFormula(latex, timeMs = 1000) {
    const box = ensureLatexBox();
    box.style.display = '';
    box.style.opacity = '0';
    box.innerHTML = `\\(${latex}\\)`;
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([box]);
    }
    if (latexBoxTimeout) {
        clearTimeout(latexBoxTimeout);
        latexBoxTimeout = null;
    }
    if (latexBoxFadeAnim) {
        cancelAnimationFrame(latexBoxFadeAnim);
        latexBoxFadeAnim = null;
    }
    // Fade in/out animation
    const fadeInTime = timeMs * 0.2;
    const fadeOutTime = timeMs * 0.2;
    const visibleTime = timeMs - fadeInTime - fadeOutTime;
    let start = null;
    function animate(ts) {
        if (!start) start = ts;
        const elapsed = ts - start;
        if (elapsed < fadeInTime) {
            // Fade in
            box.style.opacity = (elapsed / fadeInTime).toString();
            latexBoxFadeAnim = requestAnimationFrame(animate);
        } else if (elapsed < fadeInTime + visibleTime) {
            // Fully visible
            box.style.opacity = '1';
            latexBoxFadeAnim = requestAnimationFrame(animate);
        } else if (elapsed < timeMs) {
            // Fade out
            const fadeElapsed = elapsed - fadeInTime - visibleTime;
            box.style.opacity = (1 - fadeElapsed / fadeOutTime).toString();
            latexBoxFadeAnim = requestAnimationFrame(animate);
        } else {
            box.style.opacity = '0';
            hideLatexFormula();
            latexBoxFadeAnim = null;
        }
    }
    box.style.opacity = '0';
    latexBoxFadeAnim = requestAnimationFrame(animate);
    // Fallback: ensure box is hidden after timeMs (in case of tab switch, etc)
    latexBoxTimeout = setTimeout(() => {
        hideLatexFormula();
        latexBoxTimeout = null;
        latexBoxFadeAnim = null;
    }, timeMs + 100);
}

/**
 * Hide the LaTeX formula box.
 */
function hideLatexFormula() {
    const box = document.getElementById('latex-box');
    if (box) box.style.display = 'none';
}

/**
 * Show the LaTeX formula box (if hidden).
 */
export function showLatexBox() {
    const box = document.getElementById('latex-box');
    if (box) box.style.display = '';
}
