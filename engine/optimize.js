/** * Project: [weong-route] | MODULE: optimize.js
 * Version: L3_STRICT_SYNC_V1
 * Feature: Strict Road Analytics Link + Vertical Compression
 */

(function() {
    const Optimizer = {
        svgs: {
            rain: `<svg viewBox="0 0 30 30" width="14"><path d="M10,12 Q15,5 20,12 T25,18 T15,22 T5,18 T10,12" fill="#00BFFF"/><rect x="12" y="20" width="2" height="4" fill="#00BFFF" rx="1"/></svg>`,
            snow: `<svg viewBox="0 0 30 30" width="14"><circle cx="15" cy="15" r="2" fill="white"/><path d="M15,5 V25 M5,15 H25 M8,8 L22,22 M22,8 L8,22" stroke="white" stroke-width="2"/></svg>`
        },

        async init() {
            const container = document.getElementById('matrix-ui');
            if (!container) return setTimeout(() => this.init(), 1000);
            
            if (!document.getElementById('opt-heat-map')) {
                this.injectUI(container);
            }
            this.runScan();
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
                    margin-bottom: 2px; 
                    width: 100%;
                    max-width: 500px;
                    border: 1px solid #00FFFF; 
                    background: rgba(10,10,10,0.98);
                    padding: 4px 6px; 
                    font-family: monospace;
                    pointer-events: auto;
                ">
                    <div style="display:flex; margin-bottom:2px; background:#000;">${timeLabels}</div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:1px; height:20px; background:#111; padding:2px; cursor:pointer; border:1px solid #333;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#1a1a1a; display:flex; align-items:center; justify-content:center;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:3px;">
                        <span id="opt-consensus" style="color:#00FFFF; font-weight:900; font-size:8px;">READY</span>
                        <div style="display:flex; gap:6px; font-size:7px; font-weight:900;">
                            <span style="color:#00FF00;">DRY</span><span style="color:#FFFF00;">FRST</span><span style="color:#FF8C00;">SLSH</span><span style="color:#FF0000;">ICE</span>
                        </div>
                        <span id="opt-count" style="color:#00FF00; font-size:8px;">12Z_LINK</span>
                    </div>
                </div>`;

            container.insertAdjacentHTML('afterbegin', html);
            document.getElementById('heat-grid').addEventListener('click', (e) => {
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            });
        },

        async runScan() {
            const cells = document.querySelectorAll('.heat-cell');
            // DIRECT LINK: Get the data currently in use by the Road Analytics table
            const currentTableData = window.MetroTable?.currentData || [];

            cells.forEach((cell) => {
                const hourOffset = parseInt(cell.dataset.h);
                const result = this.processHour(currentTableData, hourOffset);
                const neonPalette = ["#00FF00", "#ADFF2F", "#FFFF00", "#FF8C00", "#FF0000"];
                
                cell.style.backgroundColor = neonPalette[result.severity];
                cell.innerHTML = result.precip > 0.1 ? (result.isSnow ? this.svgs.snow : this.svgs.rain) : "";
            });
        },

        processHour(timeline, offset) {
            // Find data for this offset, or fallback to the current live data
            const data = timeline.find(d => parseInt(d.hourOffset || 0) === offset) || timeline[0] || { temp: 0, precip: 0 };
            
            let severity = 0;
            const cond = (data.condition || "").toUpperCase();
            const rst = parseFloat(data.temp || data.air) - 1.2;

            // STRIKE LINK: If Road Analytics says DRY/CLEAR, it MUST be severity 0 (Green)
            if (cond.includes("DRY") || cond.includes("CLEAR")) {
                severity = 0;
            } else if (cond.includes("ICE") || cond.includes("PACKED") || rst < -7.0) {
                severity = 4;
            } else if (cond.includes("SLUSH") || cond.includes("SNOW")) {
                severity = 3;
            } else if (rst <= 0) {
                severity = 2;
            }

            return { severity, precip: parseFloat(data.precip || 0), isSnow: rst < 0 };
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
            // Trigger a re-scan to update colors based on the new time slice
            this.runScan();
        }
    };

    window.Optimizer = Optimizer;
    Optimizer.init();
})();
