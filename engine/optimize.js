/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Interactive 48H Heat Map + Route-Wide Hazard Scoring
 * Logic: Click to Shift Mission Time. Blue=Safe, Red=Hazard.
 */

const RouteOptimizer = {
    async init() {
        const container = document.getElementById('matrix-ui');
        if (!container) return setTimeout(() => this.init(), 1000);

        if (!document.getElementById('opt-heat-map')) {
            const insert = `
                <div id="opt-heat-map" style="margin-bottom:15px; border:1px solid rgba(255,215,0,0.4); padding:12px; background:rgba(10,10,10,0.95); box-shadow: 0 0 20px #000;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="color:#FFD700; font-size:11px; font-weight:900; letter-spacing:2px; text-transform:uppercase;">48H DEPARTURE HAZARD INDEX</span>
                        <span id="selected-window-label" style="color:#fff; font-size:10px; font-family:monospace;">SELECT WINDOW</span>
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:3px; height:18px; cursor:pointer;">
                        ${Array(24).fill(0).map((_, i) => `<div data-offset="${i*2}" class="heat-cell" style="background:#1a1a1a; border:1px solid #333; transition:0.2s;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; color:#666; font-size:9px; font-weight:bold;">
                        <span>NOW</span><span>+24H</span><span>+48H</span>
                    </div>
                </div>`;
            container.children[0].insertAdjacentHTML('afterbegin', insert);
            
            document.querySelectorAll('.heat-cell').forEach(cell => {
                cell.addEventListener('click', (e) => this.selectWindow(e.target));
            });
        }
        this.runOptimization();
    },

    async selectWindow(el) {
        const offset = parseInt(el.dataset.offset);
        const newTime = new Date(Date.now() + offset * 3600000);
        
        // Lock in the new mission time
        window.currentDepartureTime = newTime;
        document.getElementById('selected-window-label').innerText = `SHIFTED TO: ${newTime.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}`;
        
        // Highlight active cell
        document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
        el.style.outline = "2px solid #FFD700";

        // Trigger the main weather engine to re-fetch for this time
        if (window.WeatherEngine) window.WeatherEngine.refresh();
    },

    async runOptimization() {
        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
        if (!route) return;

        const cells = document.querySelectorAll('.heat-cell');
        const coords = route.getLatLngs();
        // Sample 3 key route points: Start, Middle, End for the hazard calculation
        const samples = [coords[0], coords[Math.floor(coords.length/2)], coords[coords.length-1]];

        for (let i = 0; i < 24; i++) {
            const hourOffset = i * 2;
            const hazardScore = await this.getRouteHazard(samples, hourOffset);
            this.paintCell(cells[i], hazardScore);
        }
    },

    async getRouteHazard(points, offset) {
        let maxHazard = 0;
        const now = new Date(Date.now() + offset * 3600000);
        const timeStr = now.toISOString().split(':')[0];

        try {
            const fetches = points.map(p => fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code,visibility&timezone=auto`));
            const responses = await Promise.all(fetches);
            const data = await Promise.all(responses.map(r => r.json()));

            data.forEach(d => {
                const idx = d.hourly.time.findIndex(t => t.includes(timeStr));
                const code = d.hourly.weather_code[idx];
                const vis = d.hourly.visibility[idx];

                let score = 0;
                if (code >= 71) score += 50; // Snow = Critical
                if (code >= 61 && code < 70) score += 30; // Heavy Rain
                if (vis < 2000) score += 20; // Fog/Low Vis
                if (score > maxHazard) maxHazard = score;
            });
        } catch (e) { return 0; }
        return maxHazard;
    },

    paintCell(el, score) {
        let color = "#004422"; // Deep Green (Optimal)
        if (score > 10) color = "#225588"; // Blue (Chilly but Clear)
        if (score > 25) color = "#CC7700"; // Orange (Caution)
        if (score >= 50) color = "#990000"; // Red (Hazard - Snow/Vis)
        el.style.background = color;
    }
};

RouteOptimizer.init();
