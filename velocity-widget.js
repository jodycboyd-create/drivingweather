(function() {
    let speedOffset = 0;

    window.updateVelocityDisplay = function() {
        const route = window.currentRouteData;
        if (!route) return;

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

        const flag = document.getElementById('flagTime');
        if (flag) flag.innerText = timeStr;

        const distEl = document.getElementById('totalDist');
        if (distEl) distEl.innerText = totalDist.toFixed(1);
        
        const speedVal = document.getElementById('speedVal');
        if (speedVal) speedVal.innerText = (speedOffset >= 0 ? "+" : "") + speedOffset;
    };

    function initWidget() {
        if (document.getElementById('velocity-panel')) return;
        const ui = document.createElement('div');
        ui.id = 'velocity-panel';
        ui.style.cssText = `position:absolute; bottom:30px; left:30px; z-index:2000; background:rgba(0,18,32,0.95); padding:20px; border-radius:12px; color:white; font-family:sans-serif; width:220px; border:1px solid #00B4DB; pointer-events:auto;`;
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
        document.getElementById('minusBtn').onclick = () => { speedOffset -= 5; window.updateVelocityDisplay(); };
        document.getElementById('plusBtn').onclick = () => { speedOffset += 5; window.updateVelocityDisplay(); };
    }

    const boot = setInterval(() => {
        if (window.weongMap) { initWidget(); clearInterval(boot); }
    }, 500);
})();
