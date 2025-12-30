/** THE SYSTEM MANIFEST **/
const modules = [
    'weather-bulletin.js',
    'engine/weather-engine.js',
    'engine/route-engine.js',
    'velocity-widget.js'
];

modules.forEach(path => {
    const s = document.createElement('script');
    // Remove the leading slash so it is relative to index.html
    s.src = path.startsWith('/') ? path.substring(1) : path;
    s.async = false;
    
    s.onerror = () => console.error(`Failed to load module: ${path}. Check if file exists in folder.`);
    
    s.onload = () => {
        // As each logic engine lands, force a UI refresh
        if (window.RouteEngine || path.includes('velocity')) {
            window.dispatchEvent(new Event('weong:update'));
        }
    };
    document.body.appendChild(s);
});
