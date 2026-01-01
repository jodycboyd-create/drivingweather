/** * Project: [weong-route] + [weong-bulletin]
 * Logic: L3_FINAL_SYNC_001 (Module-Aware Bootloader)
 */
var manifestData = {
    "manifest_version": 3,
    "version": "L3_FINAL_SYNC_001",
    "content_scripts": [{
        "js": [
            "engine/route-engine.js",
            "engine/velocity-widget.js",
            "engine/weather-engine.js",
            "engine/optimize.js",
            "engine/radar.js",
            "engine/rwis.js"
        ]
    }]
};

(function() {
    console.log(`%c SYSTEM: INITIALIZING UNIFIED ENGINE `, 'background: #000; color: #FFD700; font-weight: bold;');
    
    const scripts = manifestData.content_scripts[0].js;
    
    scripts.forEach(file => {
        const s = document.createElement('script');
        s.src = "./" + file + "?v=" + manifestData.version;
        
        // FIX: Set type to module to handle 'export' tokens
        s.type = "module"; 
        
        s.async = false; 
        document.head.appendChild(s);
        
        s.onload = () => console.log(`%c Success: ${file} loaded.`, 'color: #00ff00;');
        s.onerror = () => console.error(`%c Failed: ${file} NOT FOUND.`, 'color: #ff0000;');
    });
})();
