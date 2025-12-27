/**
 * [weong-route] Module: Velocity Widget (Midpoint Flag Restoration)
 * Logic: Forces the ETA flag to render on the Canvas-Locked map. [cite: 2025-12-27]
 */
(function() {
    let speedOffset = 0;
    let etaMarker = null;
    let currentRouter = null;

    function initWidget() {
        if (document.getElementById('velocity-panel')) return;
        const ui = document.createElement('div');
        ui.id = 'velocity-panel';
        ui.style.cssText = `position:absolute; bottom:30px; left:30px; z-index:1000; background:rgba(0,18,32,0.9); padding:20px; border-radius:12px; color:white; font-family:sans-serif; width:220px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.5);`;
        ui.innerHTML = `
            <div style="font-size:10px; color:#00B4DB; font-weight:bold; letter-spacing:1px;">VELOCITY OVERRIDE</div>
            <div style="font-size:20px; margin:10px 0;"><span id="speedVal">±0</span> <small style="font-size:12px; color:#888;">km/h offset</small></div>
            <div style="display:flex; gap:5px;">
                <button id="minusBtn" style="cursor:pointer; padding:5px 10px; background:#333; color:white; border:none; border-radius:4px;">−</button> 
                <button id="plusBtn" style="cursor:pointer; padding:5px 10px; background:#333; color:white; border:none; border-radius:4px;">+</button>
            </div>
            <div style="margin-top:10px; font-size:11px; color:#aaa; line-height:1.4;">
                TCH: 100 | Routes: 80 | Local: 50
            </div>
            <div style="margin-top:10px; font-size:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
                Total: <span id="totalDist">0</span> km
            </div>
        `;
        document.body.appendChild(ui);
        document.getElementById('minusBtn').onclick = () => { speedOffset -= 5; updateUI(); };
        document.getElementById('plusBtn').onclick = () => { speedOffset += 5; updateUI(); };
    }

    function updateUI() {
        document.getElementById('speedVal').innerText = (speedOffset >= 0 ? "+" : "") + speedOffset;
        if (window.lastRouteData) calculateSegmentETA(window.lastRouteData);
    }

    function calculateSegmentETA(route) {
        window.lastRouteData = route;
        let totalTimeHours = 0;
        const totalDistKm = route.summary.totalDistance / 1000;

        route.instructions.forEach(instr => {
            const dist = instr.distance / 1000;
            const text = instr.road || "";
            let speed = 50; 
            if (text.includes("Trans-Canada") || text.includes("TCH") || text.includes("NL-1")) {
                speed = 100;
            } else if (text.match(/Route\s\d+/) || text.match(/Hwy\s\d+/)) {
                speed = 80;
            }
            const effectiveSpeed = Math.max(10, speed + speedOffset);
            totalTimeHours += (dist / effectiveSpeed);
        });

        const h = Math.floor(totalTimeHours);
        const m = Math.round((totalTimeHours - h) * 60);
        const timeStr = `${h}h ${m}m`;

        document.getElementById('totalDist').innerText = totalDistKm.toFixed(1);

        // FLAG RESTORATION LOGIC [cite: 2025-12-27]
        const midIdx = Math.floor(route.coordinates.length / 2);
        const midCoord = route.coordinates[midIdx];

        if (!etaMarker) {
            etaMarker = L.marker(midCoord, {
                icon: L.divIcon({ 
                    className: 'eta-flag', 
                    html: `<div id="flagTime" style="background:#1A73E8; color:white; padding:5px 10px; border-radius:15px; border:2px solid white; font-weight:bold; white-space:nowrap; box-shadow:0 2px 5px rgba(0,0,0,0.3); font-family:sans-serif;">${timeStr}</div>`,
                    iconSize: [80, 30],
                    iconAnchor: [40, 15]
                })
            }).addTo(window.weongMap);
        } else {
            etaMarker.setLatLng(midCoord);
            const flag = document.getElementById('flagTime');
            if (flag) flag.innerText = timeStr;
        }
    }

    setInterval(() => {
        if (window.weongMap && !document.getElementById('velocity-panel')) initWidget();
        if (window.weongRouter && window.weongRouter !== currentRouter) {
            currentRouter = window.weongRouter;
            currentRouter.on('routesfound', (e) => calculateSegmentETA(e.routes[0]));
        }
    }, 500);
})();
