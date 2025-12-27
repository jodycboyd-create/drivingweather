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
            let segSpeed = (roadName.match(/trans-canada|nl-1|tch/)) ? 100 : 80;
            if (segDist < 1) segSpeed = 50; 
            weightedSpeedSum += (segSpeed * (segDist / totalDist));
        });

        const avgSpeed = Math.max(15, weightedSpeedSum + speedOffset);
        const hours = totalDist / avgSpeed;
        const timeStr = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;

        if (document.getElementById('capTime')) document.getElementById('capTime').innerText = timeStr;
        if (document.getElementById('capDist')) document.getElementById('capDist').innerText = `${totalDist.toFixed(0)} km`;
        if (document.getElementById('speedVal')) document.getElementById('speedVal').innerText = (speedOffset >= 0 ? "+" : "") + speedOffset;
    };

    function initWidget() {
        if (document.getElementById('velocity-panel')) return;
        const ui = document.createElement('div');
        ui.id = 'velocity-panel';
        ui.style.cssText = `position:absolute; top:20px; right:20px; z-index:2000; background:rgba(0,0,0,0.8); padding:15px; border-radius:12px; color:white; font-family:sans-serif; border:1px solid #333;`;
        ui.innerHTML = `
            <div style="font-size:10px; opacity:0.6; margin-bottom:5px;">VELOCITY</div>
            <div style="font-size:18px; font-weight:bold; margin-bottom:10px;"><span id="speedVal">0</span> km/h</div>
            <button onclick="window.adjustSpeed(-5)" style="padding:5px 10px;">-</button>
            <button onclick="window.adjustSpeed(5)" style="padding:5px 10px;">+</button>
        `;
        document.body.appendChild(ui);
    }

    window.adjustSpeed = (val) => { speedOffset += val; window.updateVelocityDisplay(); };

    setInterval(() => { if (window.weongMap) initWidget(); }, 1000);
})();
