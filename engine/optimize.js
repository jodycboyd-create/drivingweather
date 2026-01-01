/** * Project: [weong-route] | MODULE: optimize.js
 * Purpose: Generate a 48-hour Hazard Heat Map for optimal departure.
 * Logic: Blue/Green = Safe | Yellow = Caution | Red = High Hazard (Snow/Visibility)
 */

const MissionOptimizer = {
    async generateHeatMap() {
        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
        if (!route) return;

        const communities = await (await fetch('communities.json')).json();
        const departureWindows = []; // Array of 24 blocks (2-hour intervals)
        
        for (let h = 0; h < 48; h += 2) {
            let windowScore = 0;
            // Scan 5 major points along the route for this specific departure time
            const hazardResults = await this.scanRouteForTime(h, route, communities);
            windowScore = this.calculateHazardHeat(hazardResults);
            departureWindows.push({ hourOffset: h, score: windowScore });
        }
        
        this.renderHeatMatrix(departureWindows);
    },

    calculateHazardHeat(results) {
        // Scoring: Snow (+40), Visibility < 1km (+30), Heavy Rain (+20)
        let total = 0;
        results.forEach(pt => {
            if (pt.weatherCode >= 71) total += 40; // Accumulating Snow
            if (pt.visibility < 1) total += 30;    // Near-zero visibility
            if (pt.weatherCode >= 61 && pt.weatherCode < 70) total += 20; // Heavy Rain
        });
        return total; // Higher = "Hotter" (Red)
    }
};
