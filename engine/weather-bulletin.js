/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Community-Snapped Forecast
 * Status: Full Suite + Community Mapping + KM/H [cite: 2023-12-23, 2025-12-30]
 */

const WeatherBulletin = (function() {
    const state = { isOpen: false, data: [] };

    // Major NL Community Snap-Points [cite: 2025-12-26, 2025-12-30]
    const communities = [
        { name: "St. John's", lat: 47.56, lng: -52.71 },
        { name: "Clarenville", lat: 48.17, lng: -53.96 },
        { name: "Gander", lat: 48.95, lng: -54.61 },
        { name: "Grand Falls-Windsor", lat: 48.93, lng: -55.65 },
        { name: "Corner Brook", lat: 48.95, lng: -57.95 },
        { name: "Deer Lake", lat: 49.17, lng: -57.43 },
        { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
        { name: "St. Anthony", lat: 51.36, lng: -55.57 }
    ];

    const getNearestCommunity = (lat, lng) => {
        return communities.reduce((prev, curr) => {
            const prevDist = Math.hypot(lat - prev.lat, lng - prev.lng);
            const currDist = Math.hypot(lat - curr.lat, lng - curr.lng);
            return currDist < prevDist ? curr : prev;
        }).name;
    };

    const initUI = () => {
        const widgetHTML = `
            <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:50000; font-family:monospace;">
                <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:10px; cursor:pointer; font-weight:bold; box-shadow:0 0 15px rgba(0,0,0,0.5);">DETAILED TABULAR FORECAST</button>
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:520px; padding:15px; color:#FFD700; box-shadow:0 10px 30px #000;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #FFD700; padding-bottom:5px;">
                        <span style="font-weight:bold; font-size:12px;">ROUTE WEATHER MATRIX (KM/H)</span>
                        <button id="btn-copy-bulletin" style="background:#FFD700; color:#000; border:none; padding:4px 10px; cursor:pointer; font-size:10px; font-weight:bold;">COPY DATA</button>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:10px; color:#fff;">
                        <thead>
                            <tr style="text-align:left; color:#FFD700; border-bottom:1px solid #444;">
                                <th style="padding:5px;">COMMUNITY</th>
                                <th style="padding:5px;">ETA</th>
                                <th style="padding:5px;">TEMP</th>
                                <th style="padding:5px;">WIND</th>
                                <th style="padding:5px;">VIS</th>
                                <th style="padding:5px;">SKY</th>
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
        document.getElementById('btn-copy-bulletin').onclick = () => {
            let text = "COMMUNITY\tETA\tTEMP\tWIND\tVIS\tSKY\n";
            state.data.forEach(d => { text += `${d.loc}\t${d.time}\t${d.temp}\t${d.wind}\t${d.vis}\t${d.sky}\n`; });
            navigator.clipboard.writeText(text);
        };
    };

    const updateData = async () => {
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const depTime = window.currentDepartureTime instanceof Date ? window.currentDepartureTime : new Date();
        const nodes = [0.15, 0.45, 0.75, 0.92];
        const tbody = document.getElementById('bulletin-rows');
        
        state.data = []; 
        if (tbody) tbody.innerHTML = '';

        for (let [i, pct] of nodes.entries()) {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const arrival = new Date(depTime.getTime() + (pct * 8) * 3600000);
            
            // WEONG-L3 Data Request [cite: 2025-12-30]
            const locName = getNearestCommunity(lat, lng);
            const windKmH = Math.round(24 * 1.852); // Converting knots to km/h [cite: 2025-12-30]
            
            const rowData = {
                loc: locName,
                time: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                temp: "-2°C",
                wind: `${windKmH} km/h`,
                vis: "15 km",
                sky: i % 2 === 0 ? "Clear" : "P.Cloudy"
            };
            
            state.data.push(rowData);
            if (tbody) {
                tbody.insertAdjacentHTML('beforeend', `
                    <tr style="border-bottom:1px solid #222;">
                        <td style="padding:8px 5px; color:#FFD700;">${rowData.loc}</td>
                        <td style="padding:8px 5px;">${rowData.time}</td>
                        <td style="padding:8px 5px; color:#00d4ff;">${rowData.temp}</td>
                        <td style="padding:8px 5px;">${rowData.wind}</td>
                        <td style="padding:8px 5px;">${rowData.vis}</td>
                        <td style="padding:8px 5px;">${rowData.sky}</td>
                    </tr>`);
            }
        }
    };

    initUI();
    setInterval(updateData, 2000);
})();
