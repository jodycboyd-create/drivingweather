/** SYSTEM MANIFEST - ENGINE FOLDER LOCKED **/
/** Updated: Dec 30, 2025 - Forced Cache-Busting L3 **/

const modulePaths = [
    { path: '/engine/route-engine.js', type: 'module' },
    { path: '/engine/velocity-widget.js', type: 'module' },
    { path: '/engine/weather-engine.js', type: 'module' }
];

modulePaths.forEach(mod => {
    // Append a timestamp to the path to bypass local and edge caches
    const cacheBuster = `?v=${Date.now()}`;
    const s = document.createElement('script');
    s.src = mod.path + cacheBuster; 
    s.type = mod.type; 
    s.async = false;
    
    s.onload = () => {
        console.log(`System: ${mod.path} synced via L3 Cache-Buster.`);
        window.dispatchEvent(new Event('weong:update'));
    };

    s.onerror = () => {
        console.error(`CRITICAL: System cannot find ${mod.path} in /engine/ folder.`);
    };
    
    document.body.appendChild(s);
});
