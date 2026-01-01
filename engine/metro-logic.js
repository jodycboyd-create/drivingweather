/** * Project: [weong-route] | MODULE: metro-logic.js
 * Feature: Temporal Sync + Togglable UI
 */

const MetroTable = {
    containerId: "metro-surface-intelligence",
    visible: true,

    init() {
        this.injectUI();
        this.createToggleButton();
        this.updateTable(0); // Initialize at current hour
    },

    createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'toggle-metro-table';
        btn.innerHTML = 'METRo TABLE: ON';
        btn.style = `position:absolute; top:195px; left:10px; z-index:1000; 
                     background:#00FFFF; color:#000; border:1px solid #00FFFF; 
                     padding:6px; font-family:monospace; font-size:10px; 
                     cursor:pointer; width:100px; text-align:center; transition: all 0.2s;`;
        
        btn.onclick = () => {
            this.visible = !this.visible;
            const table = document.getElementById(this.containerId);
            if (this.visible) {
                table.style.display = 'block';
                btn.innerHTML = 'METRo TABLE: ON';
                btn.style.background = '#00FFFF';
                btn.style.color = '#000';
            } else {
                table.style.display = 'none';
                btn.innerHTML = 'METRo TABLE: OFF';
                btn.style.background = '#111';
                btn.style.color = '#00FFFF';
            }
        };
        document.body.appendChild(btn);
    },

    injectUI() {
        const matrix = document.getElementById('matrix-ui');
        if (!matrix || document.getElementById(this.containerId)) return;

        const html = `
            <div id="${this.containerId}" style="
                margin-top: 15px; background: rgba(5, 5, 5, 0.92); 
                backdrop-filter: blur(8px); border: 1px solid #333;
                border-left: 3px solid #00FFFF; padding: 12px; 
                border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                font-family: 'Roboto Mono', monospace;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #222; padding-bottom: 5px;">
                    <span style="color: #00FFFF; font-size: 11px; font-weight: 900; letter-spacing: 1.5px;">
                        ROAD ANALYTICS <span id="metro-timestamp" style="color:#666; font-size:9px; margin-left:8px;"></span>
                    </span>
                </div>
                <table style="width: 100%; border-collapse: collapse; color: #FFF; font-size: 10px;">
                    <thead>
                        <tr style="color: #666; text-transform: uppercase; font-size: 8px; text-align: left;">
                            <th style="padding-bottom: 8px;">Hub</th>
                            <th>RST</th>
                            <th>Δ Air</th>
                            <th>Condition</th>
                        </tr>
                    </thead>
                    <tbody id="metro-body"></tbody>
                </table>
            </div>`;
        matrix.insertAdjacentHTML('beforeend', html);
    },

    async updateTable(offset = 0) {
        const body = document.getElementById('metro-body');
        const tsLabel = document.getElementById('metro-timestamp');
        if (!body) return;

        const targetTime = new Date(Date.now() + offset * 3600000);
        const hourStr = targetTime.getHours() % 12 || 12;
        const ampm = targetTime.getHours() >= 12 ? 'PM' : 'AM';
        tsLabel.innerText = `[VALID: ${hourStr}${ampm}]`;

        const samples = [
            { name: "Corner Brook", lat: 48.95, lng: -57.95 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65 },
            { name: "Clarenville", lat: 48.16, lng: -53.96 },
            { name: "Whitbourne", lat: 47.42, lng: -53.53 },
            { name: "St. John's", lat: 47.56, lng: -52.71 }
        ];

        let rows = "";
        const isoMatch = targetTime.toISOString().split(':')[0];

        for (const hub of samples) {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${hub.lat}&longitude=${hub.lng}&hourly=precipitation,temperature_2m&timezone=auto`);
                const data = await res.json();
                const idx = data.hourly.time.findIndex(t => t.startsWith(isoMatch));
                
                const airTemp = data.hourly.temperature_2m[idx];
                const precip = data.hourly.precipitation[idx];
                
                // METRo Energy Balance Simulation logic (Simplified for Newfoundland baseline)
                let rst = airTemp - 1.2; 
                let state = "DRY / CLEAR";
                let stateColor = "#00FF00";

                if (precip > 0) {
                    if (rst > 0.5) { state = "WET / SPRAY"; stateColor = "#00BFFF"; }
                    else if (rst <= 0.5 && rst >= -1.0) { state = "SLUSH / HEAVY"; stateColor = "#FFFF00"; }
                    else { state = "ICE / PACKED"; stateColor = "#FF0000"; }
                } else if (rst < 0 && airTemp > 0) {
                    state = "FROST POTENTIAL"; stateColor = "#00FFFF";
                }

                const delta = (rst - airTemp).toFixed(1);

                rows += `
                    <tr style="border-bottom: 1px solid #1a1a1a;">
                        <td style="padding: 8px 0; color: #FFF; font-weight: 500;">${hub.name}</td>
                        <td style="color: #FFF; font-weight: bold;">${rst.toFixed(1)}°C</td>
                        <td style="color: ${delta < 0 ? '#FF5555' : '#55FF55'}; font-size: 9px;">
                            ${delta > 0 ? '+' : ''}${delta}
                        </td>
                        <td style="color: ${stateColor}; font-weight: 900; text-shadow: 1px 1px 2px #000;">
                            ${state}
                        </td>
                    </tr>`;
            } catch (e) { console.error("METRo Update Failed", e); }
        }
        body.innerHTML = rows;
    }
};

/** * CRITICAL SYNC: Bind Heatmap Clicks to Table Refresh
 */
if (typeof Optimizer !== 'undefined') {
    const originalShift = Optimizer.shiftTime;
    Optimizer.shiftTime = function(hours, target) {
        originalShift.call(this, hours, target);
        MetroTable.updateTable(parseInt(hours));
    };
}

MetroTable.init();
