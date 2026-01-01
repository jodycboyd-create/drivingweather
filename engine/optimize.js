/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Inject Hazard Colors into the 48H Departure Index
 * Logic: Worst-case scanning across all route waypoints.
 */

const RouteOptimizer = {
    async init() {
        const grid = document.getElementById('heat-grid');
        if (!grid) return setTimeout(() => this.init(), 1000);

        this.runHazardScan();
    },

    async runHazardScan() {
        // Find the active route to extract waypoints
        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
        if (!route) return;

        const coords = route.getLatLngs();
        // Sample Start, Quarter-way, Mid, Three-quarters, and End
        const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);
        const cells = document.querySelectorAll('.heat-cell');

        for (let i = 0; i < 24; i++) {
            const hourOffset = i * 2;
            const score = await this.calculateWindowHazard(samples, hourOffset);
            this.applyHeatColor(cells[i], score);
        }
    },

    async calculateWindowHazard(points, offset) {
        let maxScore = 0;
        const targetTime = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];

        try {
            // Fetch forecast for all 5 points for this window
            const fetches = points.map(p => 
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,visibility&timezone=auto`)
            );
            const responses = await Promise.all(fetches);
            const data = await Promise.all(responses.map(r => r.json()));

            data.forEach(d => {
                const idx = d.hourly.time.findIndex(t => t.startsWith(targetTime));
                if (idx === -1) return;

                const code = d.hourly.weather_code[idx];
                const temp = d.hourly.temperature_2m[idx];
                const vis = d.hourly.visibility[idx] || 10000;

                let ptScore = 0;
                if (code >= 71) ptScore += 60; // Snow (RED)
                if (vis < 1000) ptScore += 40; // Fog/Zero Vis (RED)
                if (code >= 61 && code < 70) ptScore += 25; // Rain (AMBER)
                if (temp < -10) ptScore += 15; // Extreme Cold (BLUE-COLD)
                
                if (ptScore > maxScore) maxScore = ptScore;
            });
        } catch (e) { return 0; }
        return maxScore;
    },

    applyHeatColor(el, score) {
        let color = "#1a4422"; // Safe (Green)
        if (score >= 15) color = "#1a3a5a"; // Cold/Clear (Deep Blue)
        if (score >= 25) color = "#b8860b"; // Caution (Dark Orange)
        if (score >= 40) color = "#8b0000"; // High Hazard (Dark Red)
        
        el.style.background = color;
        el.style.border = "1px solid rgba(255,215,0,0.2)";
        el.title = `Hazard Score: ${score}`;
    }
};

RouteOptimizer.init();
