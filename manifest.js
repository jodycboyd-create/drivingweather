/** THE SYSTEM MANIFEST - DEPLOYMENT READY **/
const modulePaths = [
    'weather-bulletin.js',
    'engine/weather-engine.js',
    'engine/route-engine.js',
    'velocity-widget.js'
];

modulePaths.forEach(path => {
    const s = document.createElement('script');
    // FIX: Force relative pathing to ensure files in /engine/ are found
    s.src = path; 
    s.async = false;
    
    s.onerror = () => {
        console.error(`404: System cannot find ${path}. Check folder structure.`);
    };
    
    s.onload = () => {
        // As soon as the Route or Velocity logic lands, refresh the map
        if (window.RouteEngine || path.includes('velocity')) {
            window.dispatchEvent(new Event('weong:update'));
        }
    };
    document.body.appendChild(s);
});
