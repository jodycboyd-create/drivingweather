/** * Project: [weong-route] + [weong-bulletin]
 * Logic: L3_FINAL_SYNC_001 (Reverted to Working Baseline)
 */
var manifestData = {
    "manifest_version": 3,
    "name": "WEonG Unified Engine",
    "version": "L3_FINAL_SYNC_001",
    "description": "Integrated Velocity, Route, and ECCC Weather Engine for NL",
    "engine_config": {
        "priority": "Level 3",
        "lock_point": "2025-12-31"
    },
    "content_scripts": [
        {
            "matches": ["<all_urls>"],
            "js": [
                "route-engine.js",
                "velocity-widget.js",
                "weather-engine.js"
            ],
            "run_at": "document_end"
        }
    ],
    "web_accessible_resources": [
        {
            "resources": ["data/nl/communities.json"],
            "matches": ["<all_urls>"]
        }
    ]
};

// Auto-bootloader trigger for index.html integration
(function() {
    console.log(`%c SYSTEM: INITIALIZING UNIFIED ENGINE (${manifestData.version}) `, 'background: #000; color: #FFD700; font-weight: bold;');
    
    const scripts = manifestData.content_scripts[0].js;
    
    scripts.forEach(file => {
        const s = document.createElement('script');
        s.src = file + "?v=" + manifestData.version;
        s.async = false; // Preserves execution order to prevent handshake failure
        document.head.appendChild(s);
        
        s.onload = () => console.log(`%c Success: /engine/${file} ready. `, 'color: #00ff00;');
    });
})();
