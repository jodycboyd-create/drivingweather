/** * PROJECT: [weong-route] + [weong-bulletin]
 * STATUS: MANDATORY CACHE BREAKER
 * TIMESTAMP: 2025-12-31 10:30 AM
 */

// We use a completely new version string to force the CDN to refresh
const ISOLATION_VERSION = "DEPLOYMENT_ID_ALPHA_505";

console.log(`%c CRITICAL: EXECUTING MANIFEST VERSION ${ISOLATION_VERSION}`, "background: red; color: white; padding: 10px;");
console.log("If you see this message, the engines below SHOULD NOT load.");

const modulePaths = [
    // { path: `/engine/route-engine.js?v=${ISOLATION_VERSION}`, type: 'module' },
    // { path: `/engine/velocity-widget.js?v=${ISOLATION_VERSION}`, type: 'module' },
    // { path: `/engine/weather-engine.js?v=${ISOLATION_VERSION}`, type: 'module' }
];

// This loop should now do nothing because modulePaths is empty
modulePaths.forEach(mod => {
    const s = document.createElement('script');
    s.src = mod.path; 
    s.type = mod.type; 
    s.async = false;
    s.onload = () => console.log(`SYSTEM: Engine ${mod.path} unexpectedly loaded.`);
    document.body.appendChild(s);
});

window.dispatchEvent(new Event('weong:ready'));
