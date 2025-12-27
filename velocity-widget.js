/**
 * [weong-route] Module: Velocity Widget (Atomic Sync Fix)
 * Updated to handle the "Kill and Rebuild" routing strategy. [cite: 2025-12-27]
 */
(function() {
    let driveSpeed = 100;
    let etaMarker = null;

    function initWidget() {
        if (document.getElementById('velocity-panel')) return;

        const ui = document.createElement('div');
        ui.id = 'velocity-panel';
        ui.style.cssText = `position:absolute; bottom:30px; left:30px; z-index:1000; background:rgba(0,18,32,0.9); padding:20px; border-radius:12px; color:white; font-family:sans-serif; width:200px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.5);`;
        ui.innerHTML = `
            <div style="font-size:10px; color:#00B4DB; font-weight:bold; letter-spacing:1px;">DRIVE VELOCITY</div>
            <div style="font-size:24px; margin:10px 0;"><span id="speedVal">100</span> <small style="font-size:12px; color:#888;">km/h</small></div>
            <div style="display:flex; gap:5px;">
                <button id="minusBtn" style="cursor:pointer; padding:5px 10px;">−</button> 
                <button id="plusBtn" style="cursor:pointer; padding:5px 10px;">+</button>
            </div>
            <div style="margin-top:10px; font-size:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
                Dist: <span id="totalDist">0</span> km
            </div>
        `;
        document.body.appendChild(ui);

        document.getElementById('minusBtn').onclick = () => adjustSpeed(-5);
        document.getElementById('plusBtn').onclick = () => adjustSpeed(5);

        // RE-ATTACH LOGIC: Monitor for new router instances [cite: 2025-12-27]
        const attachRouterListener = () => {
            if (!window.weongRouter) return;
            
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
        };

        // Watch for the "Kill and Rebuild" cycle
        const observer = setInterval(() => {
            if (window.weongRouter && !window.weongRouter._hasWidgetListener) {
                attachRouterListener();
                window.weongRouter._hasWidgetListener = true;
            }
        }, 100);

        function adjustSpeed(delta) {
            driveSpeed = Math.max(30, Math.min(130, driveSpeed + delta));
            document.getElementById('speedVal').innerText = driveSpeed;
            updateETA();
        }
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

    const waiter = setInterval(() => {
        if (window.weongMap) {
            clearInterval(waiter);
            initWidget();
        }
    }, 100);
})();
