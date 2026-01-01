/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Black-init + Day/Date Scale + Strict Orange Logic
 * Logic: Strictly codes 61-99 trigger color. 0-45 = Neon Green.
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
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                const dayStr = d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
                const hour = d.getHours();
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `<div style="width: calc(100% / 12); text-align:center;">
                            <div style="font-size:7px; color:#666;">${dayStr}</div>
                            <div style="font-size:9px; color:#AAA;">${hour % 12 || 12}${ampm}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:15px; font-family:monospace;">
                    <div id="time-scale" style="display:flex; margin-bottom:5px; font-weight:bold; border-bottom:1px solid #222; padding-bottom:4px;">
                        ${timeLabels}
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:4px; height:24px; background:#000; padding:3px; border:1px solid #444;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#000; cursor:pointer; transition: 0.2s; border:1px solid #111;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <span style="color:#FFD700; font-weight:900; font-size:10px; letter-spacing:1px;">HAZARD: PRECIPITATION</span>
                        <span id="opt-status" style="color:#AAA; font-size:9px;">INITIALIZING SCAN...</span>
                    </div>
                </div>`;
            container.children[0].insertAdjacentHTML('afterbegin', html);
            
            document.getElementById('heat-grid').onclick = (e) => {
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            };
        },

        async runScan(route) {
            const coords = route.getLatLngs();
            const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);
            const cells = document.querySelectorAll('.heat-cell');

            for (let i = 0; i < 24; i++) {
                const level = await this.checkPrecip(samples, i * 2);
                this.applyColor(cells[i], level);
            }
            document.getElementById('opt-status').innerText = "ISLAND SCAN COMPLETE";
        },

        async checkPrecip(points, offset) {
            const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];
            let max = 0;
            try {
                const res = await Promise.all(points.map(p => 
                    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&hourly=weather_code&timezone=auto`).then(r => r.json())
                ));
                res.forEach(d => {
                    const idx = d.hourly.time.findIndex(t => t.startsWith(time));
                    if (idx === -1) return;
                    const code = d.hourly.weather_code[idx];
                    
                    let L = 0;
                    if (code === 65 || code === 75 || code >= 95) L = 4; // VIVID RED (Heavy)
                    else if (code === 63 || code === 73) L = Math.max(L, 3); // VIVID ORANGE (Moderate)
                    else if (code === 61 || code === 71) L = Math.max(L, 2); // VIVID YELLOW (Light)
                    else if (code === 51 || code === 53 || code === 55) L = Math.max(L, 1); // VIVID LIME (Drizzle)
                    // Codes 0-3 (Clear/Overcast) & 45 (Fog) stay Neon Green (L=0)
                    if (L > max) max = L;
                });
            } catch (e) { return 0; }
            return max;
        },

        applyColor(el, level) {
            const neon = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            el.style.backgroundColor = neon[level];
            el.style.boxShadow = `0 0 10px ${neon[level]}`; 
            el.style.border = `1px solid rgba(255,255,255,0.2)`;
        },

        shiftTime(hours, target) {
            window.currentDepartureTime = new Date(Date.now() + parseInt(hours) * 3600000);
            if (window.WeatherEngine) window.WeatherEngine.refresh();
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #FFF";
        }
    };
    Optimizer.init();
})();
