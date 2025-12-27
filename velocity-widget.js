function calculateSegmentETA(route) {
        window.lastRouteData = route;
        let weightedSpeedSum = 0;
        let totalDistance = route.summary.totalDistance / 1000;

        // [1] Calculate Weighted Average Speed [cite: 2025-12-27]
        route.instructions.forEach(instr => {
            const segmentDist = instr.distance / 1000;
            const text = (instr.road || "").toLowerCase();
            let segmentSpeed = 50; // Default local

            // Refined NL Road Logic
            if (text.includes("trans-canada") || text.includes("nl-1") || text.includes("tch")) {
                segmentSpeed = 100;
            } else if (text.includes("route") || text.includes("hwy") || text.includes("highway")) {
                segmentSpeed = 80;
            } else if (segmentDist > 5) { 
                // If a segment is long but unnamed, it's likely a rural secondary road (80km/h)
                segmentSpeed = 80;
            }

            // Weight the speed by the distance of this segment
            weightedSpeedSum += (segmentSpeed * (segmentDist / totalDistance));
        });

        // [2] Apply the user offset to the final average
        const finalAvgSpeed = Math.max(20, weightedSpeedSum + speedOffset);
        const totalTimeHours = totalDistance / finalAvgSpeed;

        const h = Math.floor(totalTimeHours);
        const m = Math.round((totalTimeHours - h) * 60);
        const timeStr = `${h}h ${m}m`;

        // Update UI
        document.getElementById('totalDist').innerText = totalDistance.toFixed(1);
        
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
