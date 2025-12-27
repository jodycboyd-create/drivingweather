/**
 * [weong-route] Module: Velocity Widget (Flag Recovery)
 * Fix: Uses dedicated Map Pane to prevent Canvas overlap. [cite: 2025-12-27]
 */
(function() {
    let speedOffset = 0;
    let etaMarker = null;
    let currentRouter = null;

    function initWidget() {
        if (document.getElementById('velocity-panel')) return;

        // [1] Create a dedicated High-Z Pane if it doesn't exist [cite: 2025-12-27]
        if (window.weongMap && !window.weongMap.getPane('etaPane')) {
            const pane = window.weongMap.createPane('etaPane');
            pane.style.zIndex = 650; // Above markers (600) and popups (700)
            pane.style.pointerEvents = 'none';
        }

        const ui = document.createElement('div');
        ui.id = 'velocity-panel';
        ui.style.cssText = `position:absolute; bottom:30px; left:30px; z-index:1000; background:rgba(0,18,32,0.95); padding:20px; border-radius:12px; color:white; font-family:sans-serif; width:220px; border:1px solid #00B4DB; box-shadow: 0 10px 30px rgba(0,0,0,0.6);`;
        ui.innerHTML = `
            <div style="font-size:10px; color:#00B4DB; font-weight:bold; letter-spacing:1px; margin-bottom:5px;">VELOCITY OVERRIDE</div>
            <div style="font-size:22px; margin-bottom:10px;"><span id="speedVal">±0</span> <small style="font-size:12px; color:#888;">km/h</small></div>
            <div style="display:flex; gap:8px;">
                <button id="minusBtn" style="flex:1; cursor:pointer; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:6px;">−</button> 
                <button id="plusBtn" style="flex:1; cursor:pointer; padding:8px; background:#222; color:white; border:1px solid #444; border-radius:6px;">+</button>
            </div>
            <div style="margin-top:15px; font-size:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
                Dist: <span id="totalDist" style="color:#00B4DB;">0.0</span> km
            </div>
        `;
        document.body.appendChild(ui);
        document.getElementById('minusBtn').onclick = () => { speedOffset -= 5; updateUI(); };
        document.getElementById('plusBtn').onclick = () => { speedOffset += 5; updateUI(); };
    }

    function updateUI() {
        const valEl = document.getElementById('speedVal');
        if (valEl) valEl.innerText = (speedOffset >= 0 ? "+" : "") + speedOffset;
        if (window.lastRouteData) calculatePrecisionETA(window.lastRouteData);
    }

    function calculatePrecisionETA(route) {
        window.lastRouteData = route;
        const totalDist = route.summary.totalDistance / 1000;
        let weightedSpeedSum = 0;

        route.instructions.forEach(instr => {
            const segDist = instr.distance / 1000;
            const roadName = (instr.road || "").toLowerCase();
            let segSpeed = 50; 
            if (roadName.match(/trans-canada|nl-1|tch/)) { segSpeed = 100; }
            else if (roadName.match(/route|hwy|highway/)) { segSpeed = 80; }
            else if (segDist > 3) { segSpeed = 80; }
            weightedSpeedSum += (segSpeed * (segDist / totalDist));
        });

        const avgSpeed = Math.max(15, weightedSpeedSum + speedOffset);
        const hours = totalDist / avgSpeed;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        const timeStr = `${h}h ${m}m`;

        document.getElementById('totalDist').innerText = totalDist.toFixed(1);

        const midIdx = Math.floor(route.coordinates.length / 2);
        const midPoint = route.coordinates[midIdx];

        // [2] FORCE RE-ATTACH: Ensure the marker is present on the map [cite: 2025-12-27]
        if (!etaMarker || !window.weongMap.hasLayer(etaMarker)) {
            if (etaMarker) window.weongMap.removeLayer(etaMarker);
            
            etaMarker = L.marker(midPoint, {
                pane: 'etaPane', // Force into the dedicated High-Z pane [cite: 2025-12-27]
                icon: L.divIcon({
                    className: 'eta-flag-container',
                    html: `<div id="flagTime" style="background:#1A73E8; color:white; padding:6px 12px; border-radius:20px; border:2px solid white; font-weight:bold; white-space:nowrap; box-shadow:0 4px 10px rgba(0,0,0,0.4); font-family:sans-serif;">${timeStr}</div>`,
                    iconSize: [80, 40],
                    iconAnchor: [40, 20]
                })
            }).addTo(window.weongMap);
        } else {
            etaMarker.setLatLng(midPoint);
            const flag = document.getElementById('flagTime');
            if (flag) flag.innerText = timeStr;
        }
    }

    setInterval(() => {
        if (window.weongMap && !document.getElementById('velocity-panel')) initWidget();
        if (window.weongRouter && window.weongRouter !== currentRouter) {
            currentRouter = window.weongRouter;
            currentRouter.on('routesfound', (e) => calculatePrecisionETA(e.routes[0]));
        }
    }, 800);
})();
