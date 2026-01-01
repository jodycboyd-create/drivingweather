/** * Project: [weong-route] | MODULE: metro-logic.js
 * Feature: High-Contrast UI Overlay for METRo Table
 */

const MetroTable = {
    containerId: "metro-surface-intelligence",

    init() {
        this.injectUI();
        this.updateTable();
    },

    injectUI() {
        const matrix = document.getElementById('matrix-ui');
        if (!matrix || document.getElementById(this.containerId)) return;

        // Container styled for maximum contrast over map layers
        const html = `
            <div id="${this.containerId}" style="
                margin-top: 15px; 
                background: rgba(5, 5, 5, 0.92); 
                backdrop-filter: blur(8px);
                border: 1px solid #333;
                border-left: 3px solid #00FFFF;
                padding: 12px; 
                border-radius: 4px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                font-family: 'Roboto Mono', monospace;
            ">
                <div style="
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 10px;
                    border-bottom: 1px solid #222;
                    padding-bottom: 5px;
                ">
                    <span style="color: #00FFFF; font-size: 11px; font-weight: 900; letter-spacing: 1.5px;">
                        SYSTEM: METRo SURFACE ANALYTICS
                    </span>
                    <span style="color: #444; font-size: 8px;">REFRESH_RATE: 5M</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; color: #FFF; font-size: 10px;">
                    <thead>
                        <tr style="color: #666; text-transform: uppercase; font-size: 8px; text-align: left;">
                            <th style="padding-bottom: 8px;">Waypoint Hub</th>
                            <th style="padding-bottom: 8px;">RST (Road)</th>
                            <th style="padding-bottom: 8px;">Δ Air</th>
                            <th style="padding-bottom: 8px;">Surface Condition</th>
                        </tr>
                    </thead>
                    <tbody id="metro-body">
                        </tbody>
                </table>
            </div>`;
        
        matrix.insertAdjacentHTML('beforeend', html);
    },

    async updateTable() {
        const body = document.getElementById('metro-body');
        const samples = [
            { name: "Corner Brook", lat: 48.95, lng: -57.95, rst: -2.1 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65, rst: -0.5 },
            { name: "Clarenville", lat: 48.16, lng: -53.96, rst: 1.2 },
            { name: "Whitbourne", lat: 47.42, lng: -53.53, rst: 2.5 },
            { name: "St. John's", lat: 47.56, lng: -52.71, rst: 3.1 }
        ];

        let rows = "";
        for (const hub of samples) {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${hub.lat}&longitude=${hub.lng}&current_weather=true&hourly=precipitation`);
            const data = await res.json();
            const airTemp = data.current_weather.temperature;
            const precip = data.hourly.precipitation[0];
            
            // Logic for State & Grip
            let state = "DRY / CLEAR";
            let stateColor = "#00FF00";
            if (precip > 0) {
                if (hub.rst > 0.5) { state = "WET / SPRAY"; stateColor = "#00BFFF"; }
                else if (hub.rst <= 0.5 && hub.rst >= -1.0) { state = "SLUSH / HEAVY"; stateColor = "#FFFF00"; }
                else { state = "ICE / PACKED"; stateColor = "#FF0000"; }
            } else if (hub.rst < 0 && airTemp > 0) {
                state = "FROST POTENTIAL"; stateColor = "#00FFFF";
            }

            const delta = (hub.rst - airTemp).toFixed(1);

            rows += `
                <tr style="border-bottom: 1px solid #1a1a1a; transition: background 0.2s;">
                    <td style="padding: 8px 0; color: #FFF; font-weight: 500;">${hub.name}</td>
                    <td style="color: #FFF; font-weight: bold;">${hub.rst.toFixed(1)}°C</td>
                    <td style="color: ${delta < 0 ? '#FF5555' : '#55FF55'}; font-size: 9px;">
                        ${delta > 0 ? '+' : ''}${delta}
                    </td>
                    <td style="color: ${stateColor}; font-weight: 900; letter-spacing: 0.5px; text-shadow: 1px 1px 2px #000;">
                        ${state}
                    </td>
                </tr>`;
        }
        body.innerHTML = rows;
    }
};

MetroTable.init();
