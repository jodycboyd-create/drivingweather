/** * Project: [weong-route] | MODULE: optimize.js
 * Purpose: 48-hour Hazard Heat Map Insert
 * Philosophy: 'If it isn't broken, don't try to fix it.'
 */

const RouteOptimizer = {
    async init() {
        // Wait for the main UI to be ready to avoid null style errors
        const container = document.getElementById('matrix-ui');
        if (!container) return setTimeout(() => this.init(), 1000);

        if (!document.getElementById('opt-heat-map')) {
            const insert = `
                <div id="opt-heat-map" style="margin-bottom:15px; border:1px solid rgba(255,215,0,0.3); padding:10px; background:rgba(0,0,0,0.5);">
                    <div style="color:#FFD700; font-size:10px; font-weight:900; letter-spacing:2px; margin-bottom:8px; text-transform:uppercase;">
                        48H DEPARTURE HAZARD INDEX
                    </div>
                    <div id="heat-grid" style="display:grid; grid-template-columns: repeat(24, 1fr); gap:2px; height:12px;">
                        ${Array(24).fill('<div style="background:#1a1a1a; border-radius:1px;"></div>').join('')}
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:5px; color:#aaa; font-size:9px;">
                        <span>NOW</span><span>+24H</span><span>+48H</span>
                    </div>
                </div>
            `;
            container.children[0].insertAdjacentHTML('afterbegin', insert);
        }
        this.updateHeat();
    },

    async updateHeat() {
        const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
        if (!route) return;

        const cells = document.querySelectorAll('#heat-grid div');
        // Simple logic to fill the grid with placeholder hazard levels for the island
        cells.forEach((cell, i) => {
            // Placeholder: Replace with API logic in next step
            // Green (Safe) -> Yellow (Caution) -> Red (Hazard)
            const mockHazard = Math.random(); 
            let color = "#003366"; // Cold / Safe
            if (mockHazard > 0.6) color = "#ffcc00"; // Caution
            if (mockHazard > 0.85) color = "#cc0000"; // Hot / Hazard
            cell.style.background = color;
        });
    }
};

RouteOptimizer.init();
