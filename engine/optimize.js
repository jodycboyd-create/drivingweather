/** * Project: [weong-route] | MODULE: optimize.js
 * Feature: Road Hazard Color Mapping (SLUSH/ICE/WET)
 */

// 1. Updated processHour to calculate real severity
Optimizer.processHour = function(timeline, offset) {
    // Locate the data slice for this specific lead-time
    const data = timeline.find(d => d.hourOffset === offset) || { temp: 5, precip: 0 };
    
    let severity = 0; // 0: Green (Dry)
    let isSnow = false;

    // METRo-lite Logic: Surface Temp vs Precipitation
    const rst = data.temp - 1.5; // Estimated Road Surface Temp
    const hasPrecip = data.precip > 0.1;

    if (hasPrecip) {
        if (rst <= -1.0) {
            severity = 4; // RED (ICE)
            isSnow = true;
        } else if (rst <= 1.0) {
            severity = 3; // ORANGE (SLUSH/SNOW)
            isSnow = true;
        } else {
            severity = 1; // YELLOW-GREEN (WET)
            isSnow = false;
        }
    } else if (rst <= 0) {
        severity = 2; // YELLOW (FROST RISK)
    }

    return { severity, precip: data.precip, isSnow };
};

// 2. Updated runScan to apply colors to the DOM
Optimizer.runScan = async function(route) {
    const cells = document.querySelectorAll('.heat-cell');
    if (!cells.length) return;

    const coords = route.getLatLngs();
    const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);

    // Fetch unified timeline from the DataTransfer engine
    const timelineData = await window.DataTransfer?.getUnifiedForecast(samples) || [];

    cells.forEach((cell, i) => {
        const hourOffset = parseInt(cell.dataset.h);
        const result = this.processHour(timelineData, hourOffset);
        
        // Neon Hazard Palette
        const neonPalette = [
            "#00FF00", // 0: DRY (Green)
            "#ADFF2F", // 1: WET (Light Green)
            "#FFFF00", // 2: FROST (Yellow)
            "#FF8C00", // 3: SLUSH (Orange)
            "#FF0000"  // 4: ICE (Red)
        ];

        cell.style.backgroundColor = neonPalette[result.severity];
        
        // Apply Weather Icons
        if (result.precip > 0.1) {
            cell.innerHTML = result.isSnow ? this.svgs.snow : this.svgs.rain;
        } else {
            cell.innerHTML = "";
        }
    });
};
