// manifest.js
const modules = [
    'weather-bulletin.js',
    'engine/weather-engine.js',
    'engine/route-engine.js',
    'velocity-widget.js' // Loads last so the engines are ready
];

modules.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // This is critical to maintain the order above
    document.body.appendChild(s);
});
