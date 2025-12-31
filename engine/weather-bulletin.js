/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Tabular Widget
 * Status: Syntax Corrected + Clipboard Enabled [cite: 2023-12-23, 2025-12-30]
 */

const WeatherBulletin = (function() {
    const state = {
        isOpen: false,
        data: []
    };

    const initUI = () => {
        // Self-injecting HUD [cite: 2025-12-30]
        const widgetHTML = `
            <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:50000; font-family:monospace;">
                <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:10px; cursor:pointer; font-weight:bold; box-shadow:0 0 15px rgba(0,0,0,0.5); text-transform:uppercase;">
                    Detailed Tabular Forecast
                </button>
                
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:380px; padding:15px; color:#FFD700; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #FFD700; padding-bottom:5px;">
                        <span style="font-weight:bold; font-size:12px;">WAYPOINT DATA MATRIX</span>
                        <button id="btn-copy-bulletin" style="background:#FFD700; color:#000; border:none; padding:4px 10px; cursor:pointer; font-size:10px; font-weight:bold; border-radius:2px;">COPY TO CLIPBOARD</button>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:11px; color:#fff;">
                        <thead>
                            <tr style="text-align:left; color:#FFD700;">
                                <th style="padding:5px;">NODE</th>
                                <th style="padding:5px;">ETA</th>
                                <th style="padding:5px;">TEMP</th>
                                <th style="padding:5px;">WIND</th>
                            </tr>
                        </thead>
                        <tbody id="bulletin-rows"></tbody>
                    </table>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
        
        const openBtn = document.getElementById('btn-open-bulletin');
        const modal = document.getElementById('bulletin-modal');
        const copyBtn = document.getElementById('btn-copy-bulletin');

        openBtn.addEventListener('click', () => {
            state.isOpen = !state.isOpen;
            modal.style.display = state.isOpen ? 'block' : 'none';
            openBtn.style.background = state.isOpen ? '#FFD700' : '#000';
            openBtn.style.color = state.isOpen ? '#000' : '#FFD700';
        });

        copyBtn.addEventListener('click', () => {
            let text = "--- WEONG ROUTE FORECAST ---\nGenerated: " + new Date().toLocaleString() + "\n\n";
            text += "NODE\tETA\tTEMP\tWIND\n";
            state.data.forEach(d => {
                text += `${d.node}\t${d.time}\t${d.temp}\t${d.wind}\n`;
            });
            
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.innerText;
                copyBtn.innerText = "COPIED!";
                setTimeout(() => { copyBtn.innerText = originalText; }, 2000);
            });
        });
    };

    const updateData = () => {
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        const nodes = [0.15, 0.45, 0.75, 0.92];
        const tbody = document.getElementById('bulletin-rows');
        
        state.data = []; 
        if (tbody) tbody.innerHTML = '';

        nodes.forEach((pct, i) => {
            const arrival = new Date(depTime.getTime() + (pct * 8) * 3600000);
            const timeStr = arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Using placeholder data synced to weather-icons.js logic [cite: 2025-12-30]
            const rowData = {
                node: `WAYPOINT ${i+1}`,
                time: timeStr,
                temp: "-2°C",
                wind: "24knt"
            };
            state.data.push(rowData);

            if (tbody) {
                const tr = `
                    <tr style="border-bottom:1px solid #333;">
                        <td style="padding:8px 5px;">${rowData.node}</td>
                        <td style="padding:8px 5px;">${rowData.time}</td>
                        <td style="padding:8px 5px; color:#00d4ff;">${rowData.temp}</td>
                        <td style="padding:8px 5px;">${rowData.wind}</td>
                    </tr>`;
                tbody.insertAdjacentHTML('beforeend', tr);
            }
        });
    };

    initUI();
    setInterval(updateData, 1000);
})();
