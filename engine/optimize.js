/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Precipitation-Only Hazard Gradient
 * Logic: Visibility and Temperature ignored. Codes 0-3/45 = Green.
 */

(function() {
    const Optimizer = {
        async init() {
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            if (!container || !route) return setTimeout(() => this.init(), 1000);
            if (!document.getElementById('opt-heat-map')) this.injectUI(container);
            this.runScan(route);
        },

        injectUI(container) {
            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="color:#FFD700; font-weight:900; font-size:11px; letter-spacing:2px;">48H PRECIPITATION INDEX</span>
                        <span id="opt-status" style="color:#666; font-size:10px; font-family:monospace;">ACTIVE</span>
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:4px; height:16px;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#111; border:1px solid #333; cursor:pointer;"></div>`).join('')}
                    </div>
                </div>`;
            container.children[0].insertAdjacentHTML('afterbegin', html);
        },

        async runScan(route) {
            const coords = route.getLatLngs();
            const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);
            const cells = document.querySelectorAll('.heat-cell');

            for (let i = 0; i < 24; i++) {
                const hourOffset = i * 2;
                const hazard = await this.checkPrecip(samples, hourOffset);
                this.applyColor(cells[i], hazard);
            }
            document.getElementById('opt-status').innerText = "PRECIP SCAN COMPLETE";
        },

        async checkPrecip(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let maxLevel = 0;

            try {
                const res = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code&timezone=auto`).then(r => r.json())
                ));

                res.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    if (idx === -1) return;
                    const code = d.hourly.weather_code[idx];

                    let ptLevel = 0;
                    if (code === 65 || code === 75 || code >= 95) ptLevel = 4; // RED
                    else if (code === 63 || code === 73) ptLevel = Math.max(ptLevel, 3); // ORANGE
                    else if (code === 61 || code === 71 || code === 55) ptLevel = Math.max(ptLevel, 2); // YELLOW
                    else if (code === 51 || code === 53) ptLevel = Math.max(ptLevel, 1); // YELLOW-GREEN
                    
                    if (ptLevel > maxLevel) maxLevel = ptLevel;
                });
            } catch (e) { return 0; }
            return maxLevel;
        },

        applyColor(el, level) {
            const colors = ["#1a4422", "#6b8e23", "#d4af37", "#b8860b", "#8b0000"];
            el.style.backgroundColor = colors[level];
        }
    };
    Optimizer.init();
})();
