/** * Project: [weong-route] | MODULE: optimize.js
 * Mission: Black-Init + Day/Date Scale + Strict Orange Logic
 * Logic: Event Delegation. Codes 0-3/45 = Neon Green.
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
                const day = d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
                const hour = d.getHours();
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #333;">
                            <div style="font-size:7px; color:#777; text-transform:uppercase;">${day}</div>
                            <div style="font-size:10px; color:#CCC;">${hour % 12 || 12}${ampm}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="margin-bottom:15px; border-bottom:1px solid #FFD700; padding-bottom:15px; font-family:'Segoe UI', monospace;">
                    <div id="time-scale" style="display:flex; margin-bottom:6px; background: rgba(0,0,0,0.4); padding:4px 0;">
                        ${timeLabels}
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:3px; height:24px; background:#111; padding:3px; border:1px solid #444;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#000; cursor:pointer; transition: 0.2s; border:1px solid #222;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <span style="color:#FFD700; font-weight:900; font-size:10px; letter-spacing:1px;">48H DEPARTURE INDEX (PRECIP ONLY)</span>
                        <span id="opt-status" style="color:#AAA; font-size:9px;">SCANNING ISLAND...</span>
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
            document.getElementById('opt-status').innerText = "SYSTEM SYNCED";
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
                    if (code === 65 || code === 75 || code >= 95) L = 4; // NEON RED: Heavy
                    else if (code === 63 || code === 73) L = Math.max(L, 3); // NEON ORANGE: Moderate
                    else if (code === 61 || code === 71 || code === 55) L = Math.max(L, 2); // NEON YELLOW: Light
                    else if (code === 51 || code === 53) L = Math.max(L, 1); // NEON LIME: Drizzle
                    // 0-3 & 45 are ignored and stay L=0 (Neon Green)
                    if (L > max) max = L;
                });
            } catch (e) { return 0; }
            return max;
        },

        applyColor(el, level) {
            const neon = ["#00FF00", "#CCFF00", "#FFFF00", "#FF8C00", "#FF0000"];
            el.style.backgroundColor = neon[level];
            el.style.boxShadow = `0 0 12px ${neon[level]}44`; 
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
