(function() {
    let driveSpeed = 100;
    let etaMarker = null;

    function initWidget() {
        if (document.getElementById('velocity-panel')) return;

        // UI Injection
        const ui = document.createElement('div');
        ui.id = 'velocity-panel';
        ui.style.cssText = `position:absolute; bottom:30px; left:30px; z-index:1000; background:rgba(0,18,32,0.9); padding:20px; border-radius:12px; color:white; font-family:sans-serif; width:200px; border:1px solid rgba(255,255,255,0.1);`;
        ui.innerHTML = `
            <div style="font-size:10px; color:#00B4DB; font-weight:bold;">DRIVE VELOCITY</div>
            <div style="font-size:24px; margin:10px 0;"><span id="speedVal">100</span> km/h</div>
            <button onclick="window.adjustSpeed(-5)">−</button> <button onclick="window.adjustSpeed(5)">+</button>
            <div style="margin-top:10px; font-size:12px;">Dist: <span id="totalDist">0</span> km</div>
        `;
        document.body.appendChild(ui);

        window.adjustSpeed = (delta) => {
            driveSpeed = Math.max(30, Math.min(130, driveSpeed + delta));
            document.getElementById('speedVal').innerText = driveSpeed;
            updateETA();
        };

        window.weongRouter.on('routesfound', (e) => {
            const route = e.routes[0];
            const dist = route.summary.totalDistance / 1000;
            document.getElementById('totalDist').innerText = dist.toFixed(1);
            
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
            if (!etaMarker) {
                etaMarker = L.marker(mid, {
                    icon: L.divIcon({ 
                        className: 'eta-flag', 
                        html: '<div id="flagTime" style="background:#1A73E8; color:white; padding:5px 10px; border-radius:15px; border:2px solid white; font-weight:bold; white-space:nowrap;">--</div>' 
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
        const hours = d / driveSpeed;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        document.getElementById('flagTime').innerText = `${h}h ${m}m`;
    }

    // Polling Bridge: Wait for Anchor to be ready
    const waiter = setInterval(() => {
        if (window.weongMap && window.weongRouter) {
            clearInterval(waiter);
            initWidget();
        }
    }, 500);
})();
