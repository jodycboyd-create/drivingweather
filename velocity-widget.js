/**
 * [weong-route] Module: Velocity Widget
 * Listens for window.routingControl to be ready.
 */
(function() {
    let driveSpeed = 100;
    let etaMarker = null;

    function createUI() {
        if (document.getElementById('velocity-panel')) return;
        const ui = document.createElement('div');
        ui.id = 'velocity-panel';
        ui.style.cssText = `
            position: absolute; bottom: 30px; left: 30px; z-index: 1000;
            background: rgba(0, 18, 32, 0.85); backdrop-filter: blur(10px);
            padding: 20px; border-radius: 12px; color: white; font-family: sans-serif;
            border: 1px solid rgba(255,255,255,0.1); width: 220px;
        `;
        ui.innerHTML = `
            <div style="font-size: 10px; color: #00B4DB; font-weight: bold;">DRIVE VELOCITY</div>
            <div style="font-size: 28px; margin: 10px 0;"><span id="speedVal">100</span> km/h</div>
            <button onclick="window.adjustSpeed(-5)">−</button>
            <button onclick="window.adjustSpeed(5)">+</button>
            <div style="margin-top:10px;">Dist: <span id="totalDist">0</span> km</div>
        `;
        document.body.appendChild(ui);

        window.adjustSpeed = (delta) => {
            driveSpeed = Math.max(30, Math.min(130, driveSpeed + delta));
            document.getElementById('speedVal').innerText = driveSpeed;
            updateETA();
        };

        window.routingControl.on('routesfound', (e) => {
            const route = e.routes[0];
            const dist = route.summary.totalDistance / 1000;
            document.getElementById('totalDist').innerText = dist.toFixed(1);
            
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
            if (!etaMarker) {
                etaMarker = L.marker(mid, {
                    icon: L.divIcon({ 
                        className: 'eta-flag', 
                        html: '<div id="flagTime" style="background:#1A73E8; color:white; padding:5px; border-radius:10px; border:2px solid white; font-weight:bold;">--</div>' 
                    })
                }).addTo(window.map);
            } else {
                etaMarker.setLatLng(mid);
            }
            const hours = dist / driveSpeed;
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            document.getElementById('flagTime').innerText = `${h}h ${m}m`;
        });
    }

    // Polled listener to wait for map anchor [cite: 2025-12-27]
    const checkReady = setInterval(() => {
        if (window.map && window.routingControl) {
            clearInterval(checkReady);
            createUI();
        }
    }, 500);
})();
