/**
 * [weong-route] - Drive Velocity & ETA Flag Module
 * Functionality: Real-time speed adjustment and midpoint ETA flag.
 * Locked: 2025-12-27
 */

(function() {
    let driveSpeed = 100;
    let etaMarker = null;
    let currentDistance = 0;

    // 1. Create UI Panel
    const ui = document.createElement('div');
    ui.id = 'velocity-panel';
    ui.innerHTML = `
        <div style="font-size: 10px; color: #00B4DB; letter-spacing: 1.5px; font-weight: bold;">DRIVE VELOCITY</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0;">
            <span style="font-size: 24px; color: white;"><span id="speedVal">100</span> <small style="font-size: 12px; color: #888;">km/h</small></span>
            <div style="display: flex; gap: 5px;">
                <button onclick="window.adjustSpeed(-5)" style="width:30px; height:30px; cursor:pointer;">−</button>
                <button onclick="window.adjustSpeed(5)" style="width:30px; height:30px; cursor:pointer;">+</button>
            </div>
        </div>
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; font-size: 12px; color: #ccc;">
            Distance: <span id="totalDist" style="color: white; font-weight: bold;">0</span> km
        </div>
    `;

    // 2. Style UI Panel
    Object.assign(ui.style, {
        position: 'absolute', bottom: '30px', left: '30px', z-index: '1100',
        background: 'rgba(0, 18, 32, 0.9)', backdropFilter: 'blur(10px)',
        padding: '15px', borderRadius: '12px', color: 'white',
        fontFamily: 'sans-serif', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: '200px'
    });
    document.body.appendChild(ui);

    // 3. ETA Flag Styling
    const style = document.createElement('style');
    style.innerHTML = `
        .eta-flag {
            background: #1A73E8; color: white; padding: 4px 10px;
            border-radius: 20px; font-weight: bold; font-size: 12px;
            border: 2px solid white; white-space: nowrap;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3); text-align: center;
        }
    `;
    document.head.appendChild(style);

    // 4. Speed Logic
    window.adjustSpeed = function(delta) {
        driveSpeed = Math.max(30, Math.min(130, driveSpeed + delta));
        document.getElementById('speedVal').innerText = driveSpeed;
        updateETA();
    };

    function updateETA() {
        if (!currentDistance || !etaMarker) return;
        const hours = currentDistance / driveSpeed;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        const timeStr = `${h}h ${m}m`;
        
        const flag = document.getElementById('flagTime');
        if (flag) flag.innerText = timeStr;
    }

    // 5. Hook into Routing Machine
    const checkInterval = setInterval(() => {
        if (window.routingControl) {
            clearInterval(checkInterval);
            
            window.routingControl.on('routesfound', function(e) {
                const route = e.routes[0];
                currentDistance = route.summary.totalDistance / 1000;
                document.getElementById('totalDist').innerText = currentDistance.toFixed(1);

                // Midpoint Calculation [cite: 2025-12-27]
                const midIndex = Math.floor(route.coordinates.length / 2);
                const midCoord = route.coordinates[midIndex];

                if (!etaMarker) {
                    etaMarker = L.marker(midCoord, {
                        icon: L.divIcon({ 
                            className: 'eta-flag', 
                            html: '<div id="flagTime">--</div>',
                            iconSize: [80, 25],
                            iconAnchor: [40, 12]
                        })
                    }).addTo(window.map);
                } else {
                    etaMarker.setLatLng(midCoord);
                }
                updateETA();
            });
        }
    }, 500);
})();
