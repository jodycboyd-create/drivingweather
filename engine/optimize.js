/** * Project: [weong-route] | MODULE: optimize.js
 * Version: L3_VERTICAL_COMPRESS
 * Feature: Ultra-Compact UI + Docked Positioning
 */

(function() {
    const Optimizer = {
        svgs: {
            rain: `<svg viewBox="0 0 30 30" width="14"><path d="M10,12 Q15,5 20,12 T25,18 T15,22 T5,18 T10,12" fill="#00BFFF"/><rect x="12" y="20" width="2" height="4" fill="#00BFFF" rx="1"/></svg>`,
            snow: `<svg viewBox="0 0 30 30" width="14"><circle cx="15" cy="15" r="2" fill="white"/><path d="M15,5 V25 M5,15 H25 M8,8 L22,22 M22,8 L8,22" stroke="white" stroke-width="2"/></svg>`
        },

        async init() {
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            
            if (!container) return setTimeout(() => this.init(), 1000);
            
            if (!document.getElementById('opt-heat-map')) {
                this.injectUI(container);
            }
            this.runScan(route);
        },

        injectUI(container) {
            const now = new Date();
            const timeLabels = Array(12).fill(0).map((_, i) => {
                const d = new Date(now.getTime() + (i * 4) * 3600000);
                return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                            <div style="font-size:8px; color:#888;">${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'P' : 'A'}</div>
                        </div>`;
            }).join('');

            const html = `
                <div id="opt-heat-map" style="
                    margin-bottom: 5px; 
                    width: 100%;
                    max-width: 500px;
                    border: 1px solid #00FFFF; 
                    background: rgba(10,10,10,0.95);
                    padding: 4px 8px; 
                    font-family: monospace;
                    pointer-events: auto;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                ">
                    <div style="display:flex; margin-bottom:2px; background:#000;">${timeLabels}</div>
                    
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:1px; height:24px; background:#111; padding:2px; cursor:pointer; border:1px solid #333;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#1a1a1a; display:flex; align-items:center; justify-content:center; pointer-events:all;"></div>`).join('')}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                        <span id="opt-consensus" style="color:#00FFFF; font-weight:900; font-size:8px; letter-spacing:1px;">READY</span>
                        
                        <div style="display:flex; gap:8px; font-size:7px; font-weight:900;">
                            <span style="color:#00FF00;">DRY</span>
                            <span style="color:#FFFF00;">FRST</span>
                            <span style="color:#FF8C00;">SLSH</span>
                            <span style="color:#FF0000;">ICE</span>
                        </div>

                        <span id="opt-count" style="color:#00FF00; font-size:8px; font-weight:bold;">12Z_SYNC</span>
                    </div>
                </div>`;

            // Insert at the top of matrix-ui so it sits directly above the table
            container.insertAdjacentHTML('afterbegin', html);

            document.getElementById('heat-grid').addEventListener('click', (e) => {
                e.stopPropagation();
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            }, true);
        },

        async runScan(route) {
            const cells = document.querySelectorAll('.heat-cell');
            const tableData = window.MetroTable?.currentData || [];
            let timelineData = [];

            if (route && window.DataTransfer) {
                const samples = [route.getLatLngs()[0]];
                timelineData = await window.DataTransfer.getUnifiedForecast(samples) || [];
            }

            cells.forEach((cell) => {
                const hourOffset = parseInt(cell.dataset.h);
                const result = this.processHour(timelineData.length ? timelineData : tableData, hourOffset);
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
            const data = timeline.find(d => parseInt(d.hourOffset || 0) === offset) || timeline[0] || { temp: -10, precip: 0 };
            let severity = 0; 
            const airTemp = parseFloat(data.temp || data.air);
            const rst = airTemp - 1.2; // NL Baseline
            const precip = parseFloat(data.precip) || 0;

            if (precip > 0.1) {
                if (rst <= -1.0) severity = 4;
                else if (rst <= 1.0) severity = 3;
                else severity = 1;
            } else {
                if (rst <= -7.0) severity = 4; // Corner Brook -9.4C logic
                else if (rst <= 0) severity = 2;
                else severity = 0;
            }
            return { severity, precip, isSnow: (rst < 0) };
        },

        shiftTime(hours, target) {
            const offset = parseInt(hours);
            window.currentDepartureTime = new Date(Date.now() + offset * 3600000);
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "1px solid #FFF";

            window.MasterClock?.update(offset);
            window.MetroTable?.updateTable?.(offset);
            window.WeatherMatrix?.update?.(offset);
            window.RWIS?.updatePills?.(offset);
            
            document.getElementById('opt-consensus').innerText = `+${offset}H WINDOW`;
        }
    };

    window.Optimizer = Optimizer;
    Optimizer.init();
})();
