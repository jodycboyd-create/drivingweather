(function() {
    let speedOffset = 0;

    window.updateVelocityDisplay = function() {
        const route = window.currentRouteData;
        if (!route || !document.getElementById('capTime')) return;

        const totalDist = route.summary.totalDistance / 1000;
        // Calculation based on professional methodology locked in on 2025-12-23 [cite: 2025-12-23]
        const avgSpeed = 85 + speedOffset; 
        const hours = totalDist / avgSpeed;
        
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);

        // Sync with the locked-in ETA Capsule [cite: 2025-12-27]
        document.getElementById('capTime').innerText = `${h}h ${m}m`;
        document.getElementById('capDist').innerText = `${totalDist.toFixed(0)} km`;
        
        const speedValEl = document.getElementById('speedVal');
        if (speedValEl) {
            speedValEl.innerText = (speedOffset >= 0 ? "+" : "") + speedOffset;
            // Visual feedback: color change based on offset [cite: 2025-12-27]
            speedValEl.style.color = speedOffset === 0 ? "#fff" : (speedOffset > 0 ? "#4CAF50" : "#FF5252");
        }
    };

    function initWidget() {
        if (document.getElementById('v-box')) return;
        const box = document.createElement('div');
        box.id = 'v-box';
        // Increased scale and professional padding [cite: 2025-12-27]
        box.style.cssText = `
            position: absolute; 
            bottom: 30px; 
            left: 30px; 
            z-index: 2000; 
            background: rgba(18, 18, 18, 0.9); 
            backdrop-filter: blur(10px);
            padding: 20px; 
            border-radius: 16px; 
            color: white; 
            font-family: 'Segoe UI', Roboto, sans-serif; 
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            min-width: 160px;
        `;
        box.innerHTML = `
            <div style="font-size: 12px; font-weight: 700; letter-spacing: 1px; opacity: 0.6; margin-bottom: 8px; text-transform: uppercase;">Velocity Offset</div>
            <div style="font-size: 32px; font-weight: 800; margin-bottom: 15px; font-variant-numeric: tabular-nums;">
                <span id="speedVal">0</span> <span style="font-size: 14px; opacity: 0.5;">km/h</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="window.adj(-5)" style="flex: 1; padding: 12px; background: #333; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">-5</button>
                <button onclick="window.adj(5)" style="flex: 1; padding: 12px; background: #1a73e8; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">+5</button>
            </div>
        `;
        document.body.appendChild(box);
    }

    window.adj = (v) => { 
        speedOffset += v; 
        window.updateVelocityDisplay(); 
    };

    // Maintain map synchronization [cite: 2025-12-27]
    setInterval(() => { if (window.weongMap) initWidget(); }, 1000);
})();
