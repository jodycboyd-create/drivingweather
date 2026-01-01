/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Fix "Invisible" Widget + Restore Hazard Colors
 * Logic: Wait for UI -> Scan Route -> Apply Heat Map
 */

const RouteOptimizer = {
    async init() {
        // Observer: Wait for your backup code to build the UI
        const container = document.getElementById('matrix-ui');
        if (!container) {
            return setTimeout(() => this.init(), 500);
        }

        // Ensure the grid exists before running logic
        const grid = document.getElementById('heat-grid');
        if (!grid) return;

        console.log("SYSTEM: OPTIMIZE ENGINE ONLINE");
        this.runHazardScan();
    },

    async runHazardScan() {
        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
        if (!route) return;

        const coords = route.getLatLngs();
        const samples = [coords[0], coords[Math.floor(coords.length/2)], coords[coords.length-1]];
        const cells = document.querySelectorAll('.heat-cell');

        for (let i = 0; i < 24; i++) {
            const hourOffset = i * 2;
            const hazardLevel = await this.getWorstCaseHazard(samples, hourOffset);
            this.applyColor(cells[i], hazardLevel);
        }
    },

    async getWorstCaseHazard(points, offset) {
        const targetTime = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
        let maxHazard = 0;

        try {
            const fetches = points.map(p => 
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=temperature_2m,weather_code,visibility&timezone=auto`)
            );
            const data = await Promise.all(fetches.then(res => Promise.all(res.map(r => r.json()))));

            data.forEach(d => {
                const idx = d.hourly.time.findIndex(t => t.startsWith(targetTime));
                if (idx === -1) return;

                const code = d.hourly.weather_code[idx];
                const vis = d.hourly.visibility[idx] || 10000;
                
                let score = 0;
                if (code >= 71) score = 3;      // RED: SNOW
                else if (vis < 1000) score = 3; // RED: FOG
                else if (code >= 61) score = 2; // AMBER: RAIN
                else score = 1;                 // GREEN/BLUE: CLEAR
                
                if (score > maxHazard) maxHazard = score;
            });
        } catch (e) { return 0; }
        return maxHazard;
    },

    applyColor(el, level) {
        const colors = {
            0: "#111",      // No Data
            1: "#1a4422",   // Safe
            2: "#b8860b",   // Caution
            3: "#8b0000"    // Hazard
        };
        el.style.backgroundColor = colors[level];
        el.style.border = "1px solid rgba(255,215,0,0.3)";
    }
};

RouteOptimizer.init();
