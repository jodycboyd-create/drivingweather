/**
 * [weong-route] Module: Velocity Widget (Segment-Aware)
 * Logic: Calculates ETA based on road type instead of a flat 100km/h. [cite: 2025-12-27]
 */
(function() {
    let speedOffset = 0; // User can still +/- to adjust for weather/traffic
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
        // Trigger a re-calculation based on the current last-known route
        if (window.lastRouteData) calculateSegmentETA(window.lastRouteData);
    }

    function calculateSegmentETA(route) {
        window.lastRouteData = route;
        let totalTimeHours = 0;
        const totalDistKm = route.summary.totalDistance / 1000;

        // Iterate through segments to detect road types [cite: 2025-12-27]
        route.instructions.forEach(instr => {
            const dist = instr.distance / 1000;
            const text = instr.road || "";
            let speed = 50; // Default local speed [cite: 2025-12-27]

            if (text.includes("Trans-Canada") || text.includes("TCH") || text.includes("NL-1")) {
                speed = 100;
            } else if (text.match(/Route\s\d+/) || text.match(/Hwy\s\d+/)) {
                speed = 80;
            }

            // Apply the user's manual offset (e.g., -20 for snow)
            const effectiveSpeed = Math.max(10, speed + speedOffset);
            totalTimeHours += (dist / effectiveSpeed);
        });

        const h = Math.floor(totalTimeHours);
        const m = Math.round((totalTimeHours - h) * 60);

        document.getElementById('totalDist').innerText = totalDistKm.toFixed(1);
        const flag = document.getElementById('flagTime');
        if (flag) flag.innerText = `${h}h ${m}m`;
    }

    setInterval(() => {
        if (window.weongMap && !document.getElementById('velocity-panel')) initWidget();
        if (window.weongRouter && window.weongRouter !== currentRouter) {
            currentRouter = window.weongRouter;
            currentRouter.on('routesfound', (e) => calculateSegmentETA(e.routes[0]));
        }
    }, 500);
})();
