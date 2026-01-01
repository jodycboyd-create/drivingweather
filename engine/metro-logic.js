/** * Project: [weong-route] | MODULE: metro-logic.js
 * Feature: METRo Road Surface Intelligence Table
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

        const html = `
            <div id="${this.containerId}" style="margin-top:20px; border-top: 1px solid #00FFFF; padding-top:10px; font-family:monospace;">
                <div style="color:#00FFFF; font-size:10px; font-weight:bold; margin-bottom:8px; letter-spacing:1px;">
                    > METRo ROAD SURFACE INTELLIGENCE (L3 SYNC)
                </div>
                <table style="width:100%; border-collapse:collapse; color:#FFF; font-size:9px; text-align:left;">
                    <thead>
                        <tr style="color:#888; border-bottom:1px solid #333;">
                            <th style="padding:4px;">HUB</th>
                            <th>RST</th>
                            <th>AIR Δ</th>
                            <th>SURFACE STATE</th>
                            <th>GRIP</th>
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
        const hubs = ["Corner Brook", "Grand Falls", "Clarenville", "Whitbourne", "St. John's"];
        const samples = [
            { name: "Corner Brook", lat: 48.95, lng: -57.95, rst: -2.1 },
            { name: "Grand Falls", lat: 48.93, lng: -55.65, rst: -0.5 },
            { name: "Clarenville", lat: 48.16, lng: -53.96, rst: 1.2 },
            { name: "Whitbourne", lat: 47.42, lng: -53.53, rst: 2.5 },
            { name: "St. John's", lat: 47.56, lng: -52.71, rst: 3.1 }
        ];

        let rows = "";
        for (const hub of samples) {
            // Fetch live forecast for the hub
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${hub.lat}&longitude=${hub.lng}&current_weather=true&hourly=precipitation`);
            const data = await res.json();
            const airTemp = data.current_weather.temperature;
            const precip = data.hourly.precipitation[0];
            
            // Determine Road State
            let state = "DRY";
            let color = "#888";
            let grip = "OPTIMAL";

            if (precip > 0) {
                if (hub.rst > 0.5) { 
                    state = "WET"; color = "#00BFFF"; grip = "REDUCED";
                } else if (hub.rst <= 0.5 && hub.rst >= -1.0) {
                    state = "SLUSH"; color = "#FFFF00"; grip = "POOR";
                } else {
                    state = "ICE/SNOW"; color = "#FF0000"; grip = "CRITICAL";
                }
            } else if (hub.rst < 0 && airTemp > 0) {
                state = "FROST RISK"; color = "#00FFFF"; grip = "CAUTION";
            }

            const delta = (hub.rst - airTemp).toFixed(1);

            rows += `
                <tr style="border-bottom:1px solid #222;">
                    <td style="padding:6px; color:#00FFFF; font-weight:bold;">${hub.name.toUpperCase()}</td>
                    <td>${hub.rst.toFixed(1)}°C</td>
                    <td style="color:${delta < 0 ? '#FF4500' : '#00FF00'}">${delta > 0 ? '+' : ''}${delta}</td>
                    <td style="color:${color}; font-weight:bold;">${state}</td>
                    <td style="font-size:8px; opacity:0.8;">${grip}</td>
                </tr>`;
        }
        body.innerHTML = rows;
    }
};

MetroTable.init();
