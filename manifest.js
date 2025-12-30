/** SYSTEM MANIFEST - ENGINE FOLDER LOCKED **/
const modulePaths = [
    '/engine/weather-bulletin.js',
    '/engine/weather-engine.js',
    '/engine/route-engine.js',
    '/engine/velocity-widget.js'
];

modulePaths.forEach(path => {
    const s = document.createElement('script');
    s.src = path; 
    s.type = 'module'; // Critical fix for 'export' errors
    s.async = false;
    
    s.onload = () => {
        console.log(`System: ${path} initialized.`);
        // Signal the map to update as engines come online
        window.dispatchEvent(new Event('weong:update'));
    };

    s.onerror = () => {
        console.error(`CRITICAL: System cannot find ${path} in /engine/ folder.`);
    };
    
    document.body.appendChild(s);
});
