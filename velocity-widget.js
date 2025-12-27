(function() {
    let speedOffset = 0;

    window.updateVelocityDisplay = function() {
        const route = window.currentRouteData;
        if (!route || !document.getElementById('capTime')) return;

        const totalDist = route.summary.totalDistance / 1000;
        const avgSpeed = 85 + speedOffset; // Baseline speed for NL highways
        const hours = totalDist / avgSpeed;
        
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);

        document.getElementById('capTime').innerText = `${h}h ${m}m`;
        document.getElementById('capDist').innerText = `${totalDist.toFixed(0)}km`;
        
        if (document.getElementById('speedVal')) {
            document.getElementById('speedVal').innerText = (speedOffset >= 0 ? "+" : "") + speedOffset;
        }
    };

    function initWidget() {
        if (document.getElementById('v-box')) return;
        const box = document.createElement('div');
        box.id = 'v-box';
        box.style.cssText = `position:absolute; bottom:20px; left:20px; z-index:2000; background:rgba(0,0,0,0.8); padding:10px; border-radius:8px; color:white; font-family:sans-serif; border:1px solid #444;`;
        box.innerHTML = `
            <div style="font-size:10px; margin-bottom:5px;">SPD ADJ: <span id="speedVal">0</span></div>
            <button onclick="window.adj(-5)">-</button> <button onclick="window.adj(5)">+</button>
        `;
        document.body.appendChild(box);
    }

    window.adj = (v) => { speedOffset += v; window.updateVelocityDisplay(); };
    setInterval(() => { if (window.weongMap) initWidget(); }, 1000);
})();
