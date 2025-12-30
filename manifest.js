/** THE SYSTEM MANIFEST - ROOT-FOLDER OPTIMIZED **/
const modulePaths = [
    '/engine/weather-bulletin.js',
    '/engine/weather-engine.js',
    '/engine/route-engine.js',
    '/velocity-widget.js'
];

modulePaths.forEach(path => {
    const s = document.createElement('script');
    s.src = path; 
    s.type = 'application/javascript';
    s.async = false;
    
    s.onload = () => {
        console.log(`System: ${path} active.`);
        // Force a route redraw as each logic piece arrives
        window.dispatchEvent(new Event('weong:update'));
    };

    s.onerror = () => {
        console.error(`CRITICAL: Could not find ${path}. Check Vercel deployment logs.`);
    };
    
    document.body.appendChild(s);
});
