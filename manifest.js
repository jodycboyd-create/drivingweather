/** SYSTEM MANIFEST - ENGINE FOLDER LOCKED **/
/** Updated: Dec 30, 2025 - Fixed Module Scoping for Flag Handshake **/

const modulePaths = [
    { path: '/engine/route-engine.js', type: 'module' },
    { path: '/engine/velocity-widget.js', type: 'module' }, // Now consistent as module
    { path: '/engine/weather-icons.js', type: 'module' },
    { path: '/engine/weather-bulletin.js', type: 'module' }
];

modulePaths.forEach(mod => {
    const s = document.createElement('script');
    s.src = mod.path; 
    s.type = mod.type; 
    s.async = false;
    
    s.onload = () => {
        console.log(`System: ${mod.path} initialized.`);
        // Signal the map to update as engines come online
        window.dispatchEvent(new Event('weong:update'));
    };

    s.onerror = () => {
        console.error(`CRITICAL: System cannot find ${mod.path} in /engine/ folder.`);
    };
    
    document.body.appendChild(s);
});
