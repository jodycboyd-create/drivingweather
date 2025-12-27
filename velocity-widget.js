window.updateVelocityDisplay = function() {
        const route = window.currentRouteData;
        if (!route || !document.getElementById('capTime')) return;

        const totalDist = route.summary.totalDistance / 1000;
        const avgSpeed = 85 + speedOffset; 
        const hours = totalDist / avgSpeed;
        
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);

        // Targeted updates for the new flag elements [cite: 2025-12-27]
        document.getElementById('capTime').innerText = `${h}h ${m}m`;
        
        // Ensure distance fits by using whole numbers for 1000+ values [cite: 2025-12-27]
        const distStr = totalDist >= 1000 ? Math.round(totalDist) : totalDist.toFixed(1);
        document.getElementById('capDist').innerText = `${distStr} km`;
        
        if (document.getElementById('speedVal')) {
            document.getElementById('speedVal').innerText = (speedOffset >= 0 ? "+" : "") + speedOffset;
        }
    };
