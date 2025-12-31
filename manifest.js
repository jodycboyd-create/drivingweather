/** SYSTEM MANIFEST - ENGINE FOLDER LOCKED **/
/** Updated: Dec 30, 2025 - Forced Cache-Busting L3 **/

const VERSION = Date.now(); // Generates a unique ID per load

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
        console.log(`System: ${mod.path.split('?')[0]} initialized.`);
        window.dispatchEvent(new Event('weong:update'));
    };

    s.onerror = () => {
        console.error(`CRITICAL: System cannot find ${mod.path} in /engine/ folder.`);
    };
    
    document.body.appendChild(s);
});
