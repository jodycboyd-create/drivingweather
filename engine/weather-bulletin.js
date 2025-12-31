/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Tabular Widget
 * Status: Self-Injecting UI + Clipboard Integration [cite: 2023-12-23, 2025-12-30]
 */

const WeatherBulletin = (function() {
    const state = {
        isOpen: false,
        data: []
    };

    // Initialize UI Component [cite: 2025-12-30]
    const initUI = () => {
        const widgetHTML = `
            <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:50000; font-family:monospace;">
                <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:10px; cursor:pointer; font-weight:bold; box-shadow:0 0 15px rgba(0,0,0,0.5);">
                    DETAILED TABULAR FORECAST
                </button>
                
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:350px; padding:15px; color:#FFD700;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="font-weight:bold;">ROUTE MATRIX [WEONG-L3]</span>
                        <button id="btn-copy-bulletin" style="background:#FFD700; color:#000; border:none; padding:2px 8px; cursor:pointer; font-size:10px; font-weight:bold;">COPY DATA</button>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:11px;">
                        <thead>
                            <tr style="border-bottom:1px solid #FFD700; text-align:left;">
                                <th style="padding:5px;">NODE</th>
                                <th style="padding:5px;">TIME</th>
                                <th style="padding:5px;">TEMP</th>
                                <th style="padding:5px;">WIND</th>
                            </tr>
                        </thead>
                        <tbody id="bulletin-rows"></tbody>
                    </table>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
        
        document.getElementById('btn-open-bulletin').onclick = () => {
            state.isOpen = !state.isOpen;
            document.getElementById('bulletin-modal').style.display = state.isOpen ? 'block' : 'none';
        };

        document.getElementById('btn-copy-bulletin').onclick = copyToClipboard;
    };

    const copyToClipboard = () => {
        let text = "WEONG ROUTE FORECAST\nNODE | TIME | TEMP | WIND\n";
        state.data.forEach(row => {
            text += `${row.node} | ${row.time} | ${row.temp} | ${row.wind}\n`;
        });
        navigator.clipboard.writeText(text);
        alert("Forecast copied to clipboard!"); [cite: 2025-12-30]
    };

    const updateData = () => {
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        const nodes = [0.15, 0.45, 0.75, 0.92];
        const tbody = document.getElementById('bulletin-rows');
        
        state.data = []; // Reset local state [cite: 2025-12-30]
        if(tbody) tbody.innerHTML = '';

        nodes.forEach((pct, i) => {
            const arrival = new Date(depTime.getTime() + (pct * 8) * 3600000);
            const timeStr = arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Integrating the NL Baseline [cite: 2025-12-26]
            const rowData = {
                node: `WP-${i+1}`,
                time: timeStr,
                temp: "-2°C",
                wind: "24knt"
            };
            state.data.push(rowData);

            if(tbody) {
                const tr = `<tr style="border-bottom:1px solid #333;">
                    <td style="padding:5px;">${rowData.node}</td>
                    <td style="padding:5px;">${rowData.time}</td>
                    <td style="padding:5px; color:#00d4ff;">${rowData.temp}</td>
                    <td style="padding:5px;">${rowData.wind}</td>
                </tr>`;
                tbody.insertAdjacentHTML('beforeend', tr);
            }
        });
    };

    // Execution Logic [cite: 2025-12-30]
    initUI();
    setInterval(updateData, 1000);
})();
