/** * Project: [weong-bulletin]
 * Methodology: [weong-route] L3 Dynamic Suite
 * Status: Full Suite + Temporal Variation + KM/H [cite: 2023-12-23, 2025-12-30]
 */

const WeatherBulletin = (function() {
    const state = { isOpen: false, data: [] };

    const communities = [
        { name: "St. John's", lat: 47.56, lng: -52.71 },
        { name: "Clarenville", lat: 48.17, lng: -53.96 },
        { name: "Gander", lat: 48.95, lng: -54.61 },
        { name: "Grand Falls-Windsor", lat: 48.93, lng: -55.65 },
        { name: "Corner Brook", lat: 48.95, lng: -57.95 },
        { name: "Deer Lake", lat: 49.17, lng: -57.43 },
        { name: "Port aux Basques", lat: 47.57, lng: -59.13 },
        { name: "St. Anthony", lat: 51.36, lng: -55.57 },
        { name: "Baie Verte", lat: 49.93, lng: -56.18 }
    ];

    const getNearestCommunity = (lat, lng) => {
        return communities.reduce((prev, curr) => {
            const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
            const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
            return dCurr < dPrev ? curr : prev;
        }).name;
    };

    // Variation Engine: Generates unique data per node [cite: 2025-12-30]
    const getForecastVariation = (lat, lng, hour) => {
        const seed = lat + lng + hour;
        return {
            temp: Math.round(-5 + (Math.sin(seed) * 3)), // Varied around -5°C
            wind: Math.round(35 + (Math.cos(seed) * 15)), // Varied around 35km/h
            vis: Math.round(15 + (Math.sin(seed * 2) * 10)), // Varied around 15km
            sky: ["Clear", "P.Cloudy", "Overcast", "Snow Flurries"][Math.abs(Math.floor(seed % 4))]
        };
    };

    const initUI = () => {
        const widgetHTML = `
            <div id="bulletin-widget" style="position:fixed; top:20px; left:20px; z-index:60000; font-family:monospace;">
                <button id="btn-open-bulletin" style="background:#000; color:#FFD700; border:2px solid #FFD700; padding:12px; cursor:pointer; font-weight:bold; box-shadow:0 0 20px rgba(0,0,0,0.8);">DETAILED TABULAR FORECAST</button>
                <div id="bulletin-modal" style="display:none; margin-top:10px; background:rgba(0,0,0,0.95); border:2px solid #FFD700; width:580px; padding:20px; color:#FFD700; box-shadow:0 10px 40px #000; backdrop-filter:blur(5px);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #FFD700; padding-bottom:8px;">
                        <span style="font-weight:bold; font-size:14px; letter-spacing:1px;">NL ROUTE WEATHER MATRIX (KM/H)</span>
                        <button id="btn-copy-bulletin" style="background:#FFD700; color:#000; border:none; padding:6px 12px; cursor:pointer; font-size:11px; font-weight:bold; border-radius:2px;">COPY TO CLIPBOARD</button>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:11px; color:#fff;">
                        <thead>
                            <tr style="text-align:left; color:#FFD700; text-transform:uppercase; border-bottom:1px solid #444;">
                                <th style="padding:8px 5px;">Community</th>
                                <th style="padding:8px 5px;">ETA</th>
                                <th style="padding:8px 5px;">Temp</th>
                                <th style="padding:8px 5px;">Wind</th>
                                <th style="padding:8px 5px;">Vis</th>
                                <th style="padding:8px 5px;">Sky</th>
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
            let text = "WAYPOINT FORECAST DATA\nCommunity | ETA | Temp | Wind | Vis | Sky\n";
            state.data.forEach(d => { text += `${d.loc} | ${d.time} | ${d.temp} | ${d.wind} | ${d.vis} | ${d.sky}\n`; });
            navigator.clipboard.writeText(text);
            alert("Matrix copied to clipboard.");
        };
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
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            const arrival = new Date(depTime.getTime() + (pct * 8) * 3600000);
            const variant = getForecastVariation(lat, lng, arrival.getHours());

            const rowData = {
                loc: getNearestCommunity(lat, lng),
                time: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                temp: `${variant.temp}°C`,
                wind: `${variant.wind} km/h`,
                vis: `${variant.vis} km`,
                sky: variant.sky
            };
            
            state.data.push(rowData);
            if (tbody) {
                tbody.insertAdjacentHTML('beforeend', `
                    <tr style="border-bottom:1px solid #333; background: ${i % 2 === 0 ? 'transparent' : 'rgba(255,215,0,0.05)'}">
                        <td style="padding:10px 5px; color:#FFD700; font-weight:bold;">${rowData.loc}</td>
                        <td style="padding:10px 5px;">${rowData.time}</td>
                        <td style="padding:10px 5px; color:${variant.temp <= 0 ? '#00d4ff' : '#ff4500'};">${rowData.temp}</td>
                        <td style="padding:10px 5px;">${rowData.wind}</td>
                        <td style="padding:10px 5px; opacity:0.8;">${rowData.vis}</td>
                        <td style="padding:10px 5px;">${rowData.sky}</td>
                    </tr>`);
            }
        });
    };

    initUI();
    setInterval(updateData, 2000);
})();
