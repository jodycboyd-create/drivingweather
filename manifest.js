/** THE SYSTEM MANIFEST **/
const modules = [
    'weather-bulletin.js',
    'engine/weather-engine.js',
    'engine/route-engine.js',
    'velocity-widget.js'
];

// Load sequence ensuring order
modules.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; 
    s.onload = () => {
        // Trigger calculation as soon as the Route Engine lands
        if (src.includes('route-engine') || src.includes('velocity')) {
             window.dispatchEvent(new Event('weong:update'));
        }
    };
    document.body.appendChild(s);
});
