/** Updated: Dec 30, 2025 - V3 Absolute Reset **/
const VERSION = "V3_ABSOLUTE_RESET"; 

const modulePaths = [
//    { path: `/engine/route-engine.js?v=${VERSION}`, type: 'module' },
//    { path: `/engine/velocity-widget.js?v=${VERSION}`, type: 'module' },
//    { path: `/engine/weather-engine.js?v=${VERSION}`, type: 'module' }
];

modulePaths.forEach(mod => {
    const s = document.createElement('script');
    s.src = mod.path; 
    s.type = mod.type; 
    s.async = false;
    s.onload = () => window.dispatchEvent(new Event('weong:update'));
    document.body.appendChild(s);
});
