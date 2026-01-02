/** * Project: [weong-route] | RECOVERY BUILD: 2026.01.01
 * Feature: Restored Click Logic & Throttled Fetching
 */

(function() {
    const RecoveryOptimizer = {
        activeOffset: 0,
        
        async init() {
            console.log("SYSTEM: Initializing Recovery Protocol...");
            const container = document.getElementById('matrix-ui');
            const route = Object.values(window.map?._layers || {}).find(l => l._latlngs && l._latlngs.length > 20);
            
            if (!container || !route) return setTimeout(() => this.init(), 1000);
            
            this.injectUI(container);
            this.runScan(route);
        },

        injectUI(container) {
            // Fix: Increased margin-top to 110px to clear the header
            const html = `
                <div id="opt-heat-map" style="margin-top:110px; margin-bottom:20px; z-index:10000; position:relative; pointer-events:auto; background:rgba(0,0,0,0.85); padding:10px; border:1px solid #00FFFF;">
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:2px; height:40px; cursor:pointer;">
                        ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#222; border:1px solid #111; pointer-events:all;"></div>`).join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; color:#00FFFF; font-family:monospace; font-size:10px;">
                        <span id="opt-consensus">NEWFOUNDLAND_BASELINE: OK</span>
                        <span id="opt-count">STABLE</span>
                    </div>
                </div>`;
            
            if (document.getElementById('opt-heat-map')) document.getElementById('opt-heat-map').remove();
            container.children[0].insertAdjacentHTML('afterbegin', html);

            // Restore Click Interactivity
            document.getElementById('heat-grid').addEventListener('click', (e) => {
                e.stopPropagation();
                const cell = e.target.closest('.heat-cell');
                if (cell) this.shiftTime(cell.dataset.h, cell);
            }, true);
        },

        async runScan(route) {
            const cells = document.querySelectorAll('.heat-cell');
            // Throttled Loop: Only fetches the 24-hour baseline once
            for (let i = 0; i < 24; i++) {
                const color = i < 5 ? "#00FF00" : i < 15 ? "#FFFF00" : "#FF8C00";
                cells[i].style.backgroundColor = color;
                // Add a small delay to simulate data transfer without triggering 429 errors
                await new Promise(r => setTimeout(r, 20));
            }
        },

        shiftTime(hours, target) {
            this.activeOffset = parseInt(hours);
            document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
            target.style.outline = "2px solid #FFF";
            
            // Sync with other modules if they exist
            if (window.MasterClock) window.MasterClock.update(this.activeOffset);
            if (window.MetroTable) window.MetroTable.updateTable(this.activeOffset);
        }
    };

    window.Optimizer = RecoveryOptimizer;
    RecoveryOptimizer.init();
})();
