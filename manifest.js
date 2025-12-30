/** THE SYSTEM MANIFEST **/
const modules = [
    'weather-bulletin.js',
    'engine/weather-engine.js', // Ensure this file exists in /engine/
    'engine/route-engine.js',   // Ensure this file exists in /engine/
    'velocity-widget.js'
];

modules.forEach(src => {
    const s = document.createElement('script');
    s.src = src; 
    s.async = false; 
    s.onload = () => {
        // Force the route to draw once all logic engines are on board
        if (window.RouteEngine) {
            window.dispatchEvent(new Event('weong:update'));
        }
    };
    document.body.appendChild(s);
});
