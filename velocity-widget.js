/**
 * [weong-route] Module: Velocity Widget (Handshake Fix)
 * Polling for map and router bridge. [cite: 2025-12-27]
 */
(function() {
    let driveSpeed = 100;
    let etaMarker = null;

    function initWidget() {
        if (document.getElementById('velocity-panel')) return;

        // UI Injection
        const ui = document.createElement('div');
        ui.id = 'velocity-panel';
        ui.style.cssText = `position:absolute; bottom:30px; left:30px; z-index:1000; background:rgba(0,18,32,0.9); padding:20px; border-radius:12px; color:white; font-family:sans-serif; width:200px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.5);`;
        ui.innerHTML = `
            <div style="font-size:10px; color:#00B4DB; font-weight:bold; letter-spacing:1px;">DRIVE VELOCITY</div>
            <div style="font-size:24px; margin:10px 0;"><span id="speedVal">100</span> <small style="font-size:12px; color:#888;">km/h</small></div>
            <div style="display:flex; gap:5px;">
                <button onclick="window.adjustSpeed(-5)" style="cursor:pointer; padding:5px 10px;">−</button> 
                <button onclick="window.adjustSpeed(5)" style="cursor:pointer; padding:5px 10px;">+</button>
            </div>
            <div style="margin-top:10px; font-size:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
                Dist: <span id="totalDist">0</span> km
            </div>
        `;
        document.body.appendChild(ui);

        window.adjustSpeed = (delta) => {
            driveSpeed = Math.max(30, Math.min(130, driveSpeed + delta));
            document.getElementById('speedVal').innerText = driveSpeed;
            updateETA();
        };

        // Hook the event [cite: 2025-12-27]
        window.weongRouter.on('routesfound', function(e) {
            const route = e.routes[0];
            const dist = route.summary.totalDistance / 1000;
            document.getElementById('totalDist').innerText = dist.toFixed(1);
            
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
            
            if (!etaMarker) {
                etaMarker = L.marker(mid, {
                    icon: L.divIcon({ 
                        className: 'eta-flag', 
                        html: '<div id="flagTime" style="background:#1A73E8; color:white; padding:5px 10px; border-radius:15px; border:2px solid white; font-weight:bold; white-space:nowrap; box-shadow:0 2px 5px rgba(0,0,0,0.3);">--</div>',
                        iconSize: [80, 30],
                        iconAnchor: [40, 15]
                    })
                }).addTo(window.weongMap);
            } else {
                etaMarker.setLatLng(mid);
            }
            updateETA(dist);
        });
    }

    function updateETA(dist) {
        const d = dist || parseFloat(document.getElementById('totalDist').innerText);
        if (isNaN(d) || d === 0) return;
        
        const hours = d / driveSpeed;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        const flag = document.getElementById('flagTime');
        if (flag) flag.innerText = `${h}h ${m}m`;
    }

    // Faster polling to catch the window exposure [cite: 2025-12-27]
    const waiter = setInterval(() => {
        if (window.weongMap && window.weongRouter) {
            clearInterval(waiter);
            initWidget();
            // Force an initial update if the route is already there
            if (window.weongRouter._routes && window.weongRouter._routes[0]) {
                window.weongRouter.fire('routesfound', {routes: window.weongRouter._routes});
            }
        }
    }, 200);
})();
