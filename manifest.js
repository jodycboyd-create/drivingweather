/** * Project: [weong-route] + [weong-bulletin]
 * Status: ISOLATION TEST - ALL ENGINES DISABLED
 * Updated: Dec 31, 2025 [cite: 2025-12-30]
 */

// Unique version string to force Vercel/Browser to bypass existing cache
const VERSION = "ISOLATION_TEST_BETA_999"; 

console.log(`%c SYSTEM: Manifest Loaded (Version: ${VERSION})`, "color: yellow; font-weight: bold;");
console.log("SYSTEM: All engines have been manually commented out for troubleshooting.");

const modulePaths = [
    // { path: `/engine/route-engine.js?v=${VERSION}`, type: 'module' },
    // { path: `/engine/velocity-widget.js?v=${VERSION}`, type: 'module' },
    // { path: `/engine/weather-engine.js?v=${VERSION}`, type: 'module' }
];

/**
 * Logic remains intact but will not execute because modulePaths is empty.
 * This proves if the "Stuck Gander" is coming from a cached file or the current build.
 */
modulePaths.forEach(mod => {
    const s = document.createElement('script');
    s.src = mod.path; 
    s.type = mod.type; 
    s.async = false;
    s.onload = () => {
        console.log(`Engine Loaded: ${mod.path}`);
        window.dispatchEvent(new Event('weong:update'));
    };
    document.body.appendChild(s);
});

// If Gander is still visible, the issue is not in this file.
