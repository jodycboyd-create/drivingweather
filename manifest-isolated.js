/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 FINAL BUILD - ALL ENGINES ACTIVE
 * Updated: Dec 31, 2025 [cite: 2025-12-30]
 */

// Final cache-breaker version
const VERSION = "L3_FINAL_SYNC_001"; 

console.log(`%c SYSTEM: INITIALIZING UNIFIED ENGINE (${VERSION})`, "color: #FFD700; font-weight: bold; background: #000; padding: 5px;");

const modulePaths = [
    { path: `/engine/route-engine.js?v=${VERSION}`, type: 'module' },
    { path: `/engine/velocity-widget.js?v=${VERSION}`, type: 'module' },
    { path: `/engine/weather-engine.js?v=${VERSION}`, type: 'module' }
];

modulePaths.forEach(mod => {
    const s = document.createElement('script');
    s.src = mod.path; 
    s.type = mod.type; 
    s.async = false;
    s.onload = () => {
        console.log(`%c Success: ${mod.path} ready.`, "color: #00FF00;");
        window.dispatchEvent(new Event('weong:update'));
    };
    s.onerror = () => console.error(`CRITICAL: Failed to load ${mod.path}`);
    document.body.appendChild(s);
});

window.dispatchEvent(new Event('weong:ready'));
