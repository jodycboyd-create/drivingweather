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
        
        // Push data to the Modern Flag [cite: 2025-12-27]
        const timeEl = document.getElementById('flagTime');
        const distEl = document.getElementById('flagDist');
        if (timeEl) timeEl.innerText = `${h}h ${m}m`;
        if (distEl) distEl.innerText = `${totalDist.toFixed(1)} km`;

        // Update the Velocity Sidebar Widget
        const sideDist = document.getElementById('totalDist');
        if (sideDist) sideDist.innerText = totalDist.toFixed(1);
        
        const speedVal = document.getElementById('speedVal');
        if (speedVal) speedVal.innerText = (speedOffset >= 0 ? "+" : "") + speedOffset;
    };
