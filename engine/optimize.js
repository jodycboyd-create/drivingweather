/** * Project: [weong-route] | MODULE: optimize.js
 * Version: L3_FULL_RESTORE_005
 * Feature: Top-Anchor Positioning + Immediate Data Handshake
 */

(function() {
    const Optimizer = {
        svgs: {
            rain: `<svg viewBox="0 0 30 30" width="18"><path d="M10,12 Q15,5 20,12 T25,18 T15,22 T5,18 T10,12" fill="#00BFFF"/><rect x="12" y="20" width="2" height="4" fill="#00BFFF" rx="1"/></svg>`,
            snow: `<svg viewBox="0 0 30 30" width="18"><circle cx="15" cy="15" r="2" fill="white"/><path d="M15,5 V25 M5,15 H25 M8,8 L22,22 M22,8 L8,22" stroke="white" stroke-width="2"/></svg>`
        },

        async init() {
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            
            if (!container) return setTimeout(() => this.init(), 1000);
            
            if (!document.getElementById('opt-heat-map')) {
                this.injectUI(container);
            }
            
            // Run scan immediately to fill boxes
            this.runScan(route);
        },

        injectUI(container) {
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                            <div style="font-size:7px; color:#444; text-transform:uppercase;">${d.toLocaleDateString('en-CA', { weekday: 'short' })}</div>
                            <div style="font-size:9px; color:#888;">${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'PM' : 'AM'}</div>
                        </div>`;
            }).join('');

            const legend = `
                <div style="display:flex; justify-content:space-around; margin-top:8px; border-top:1px solid #222; padding-top:5px; font-size:7px; font-weight:900; letter-spacing:0.5px;">
                    <span style="color:#00FF00;">● DRY</span>
                    <span style="color:#ADFF2F;">● WET</span>
                    <span style="color:#FFFF00;">● FROST</span>
                    <span style="color:#FF8C00;">● SLUSH</span>
                    <span style="color:#FF0000;">● ICE</span>
                </div>`;

            const html = `
                <div id="opt-heat-map" style="
                    position: absolute;
                    top: 5px; 
                    left: 5px;
                    width: 485px;
                    z-index: 10001;
                    border: 1px solid #00FFFF; 
                    background: rgba(0,0,0,0.95);
                    padding: 8px; 
                    font-family: monospace;
                    pointer-events: auto;
                    box-shadow: 0 0 15px rgba(0,0,0,0.9);
                ">
                    <div style="display:flex; margin-bottom:4px; background:#000; border:1px solid #222;">${timeLabels}</div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:2px; height:38px; background:#111; padding:3px; cursor:pointer; border:1px solid #333;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#1a1a1a; display:flex; align-items:center; justify-content:center; pointer-events:all; transition: background 0.3s;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:6px; padding:0 2px;">
                        <span id="opt-consensus" style="color:#00FFFF; font-weight:900; font-size:9px; letter-spacing:1px;">NL_BASELINE: READY</span>
                        <span id="opt-count" style="color:#00FF00; font-size:9px; font-weight:bold;">HANDSHAKE: ACTIVE</span>
                    </div>
                    ${legend}
                </div>`;

            // Ensure parent container is the reference point
            container.style.position = 'relative';
            container.insertAdjacentHTML('afterbegin', html);

            document.getElementById('heat-grid').addEventListener('click', (e) => {
                e.stopPropagation();
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            }, true);
        },

        async runScan(route) {
            const cells = document.querySelectorAll('.heat-cell');
            
            // Get data from the unified engine
            let timelineData = [];
            if (route) {
                const coords = route.getLatLngs();
                const samples = [0, 0.25, 0.5, 0.75, 0.99].map(p => coords[Math.floor((coords.length - 1) * p)]);
                timelineData = await window.DataTransfer?.getUnifiedForecast(samples) || [];
            }

            cells.forEach((cell) => {
                const hourOffset = parseInt(cell.dataset.h);
                const result = this.processHour(timelineData, hourOffset);
                
                const neonPalette = ["#00FF00", "#ADFF2F", "#FFFF00", "#FF8C00", "#FF0000"];
                cell.style.backgroundColor = neonPalette[result.severity];
                
                if (result.precip > 0.1) {
                    cell.innerHTML = result.isSnow ? this.svgs.snow : this.svgs.rain;
                } else {
                    cell.innerHTML = "";
                }
            });
        },

        processHour(timeline, offset) {
            // Find data in timeline, or fallback to the Road Analytics data already on screen
            const data = timeline.find(d => parseInt(d.hourOffset) === offset) || 
                         (window.MetroTable?.currentData ? window.MetroTable.currentData[0] : null) || 
                         { temp: -8, precip: 0 }; // Default to Gander baseline if all else fails
            
            let severity = 0; 
            let isSnow = false;
            
            const airTemp = parseFloat(data.temp);
            const rst = airTemp - 1.2; 
            const precip = parseFloat(data.precip) || 0;

            if (precip > 0.1) {
                if (rst <= -1.0) { severity = 4; isSnow = true; }
                else if (rst <= 1.0) { severity = 3; isSnow = true; }
                else { severity = 1; isSnow = false; }
            } else {
                // Logic based on your Corner Brook -9.4C observation
                if (rst <= -7.0) severity = 4; 
                else if (rst <= 0) severity = 2;
                else severity = 0;
            }

            return { severity, precip, isSnow };
        },

        shiftTime(hours, target) {
            if (hours === undefined) return;
            const offset = parseInt(hours);
            window.currentDepartureTime = new Date(Date.now() + offset * 3600000);
            
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #00FFFF";

            window.MasterClock?.update(offset);
            window.MetroTable?.updateTable?.(offset);
            window.WeatherMatrix?.update?.(offset);
            window.RWIS?.updatePills?.(offset);
            window.HubManager?.refresh?.(offset);

            document.getElementById('opt-consensus').innerText = `SHIFTED: +${offset}H WINDOW`;
        }
    };

    window.Optimizer = Optimizer;
    Optimizer.init();
})();
