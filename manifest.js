/** THE SYSTEM MANIFEST - MODULE COMPATIBLE **/
const modulePaths = [
    '/engine/weather-bulletin.js',
    '/engine/weather-engine.js',
    '/engine/route-engine.js',
    '/velocity-widget.js'
];

modulePaths.forEach(path => {
    const s = document.createElement('script');
    s.src = path; 
    s.type = 'module'; // FIX: Resolves Unexpected token 'export'
    s.async = false;
    
    s.onload = () => {
        console.log(`System: ${path} active.`);
        window.dispatchEvent(new Event('weong:update'));
    };

    s.onerror = () => {
        console.error(`CRITICAL: Could not find ${path}. Check /engine/ folder.`);
    };
    
    document.body.appendChild(s);
});
