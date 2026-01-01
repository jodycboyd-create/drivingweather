/** * Project: [weong-bulletin] | L3 STABILITY PATCH 069
 * Mission: Fix UI Freeze + Restore Matrix Data + Safety Timeout
 * Logic: Wide-corridor matching for 100% data reliability.
 */

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        .glass-node {
            background: rgba(10, 10, 10, 0.98); backdrop-filter: blur(10px);
            border: 2px solid #FFD700; border-radius: 4px;
            display: flex; flex-direction: column; width: 115px; color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9); z-index: 9999;
        }
        .glass-header {
            background: #FFD700; color: #000; font-size: 11px; font-weight: 900;
            text-align: center; padding: 5px 2px; text-transform: uppercase;
        }
        .glass-body { display: flex; align-items: center; justify-content: center; padding: 8px; gap: 10px; }
        .glass-temp-val { font-size: 22px; font-weight: 900; color: #FFD700; }
        #matrix-loader {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.98); border: 2px solid #FFD700; color: #FFD700;
            padding: 40px 80px; font-family: monospace; letter-spacing: 5px; z-index: 50000;
            display: none; font-weight: 900; box-shadow: 0 0 150px #000;
        }
    `;
    document.head.appendChild(style);

    const WeatherEngine = (function() {
        const state = { layer: L.layerGroup(), lastSig: "", communities: [] };

        const toggleLoader = (show) => {
            const el = document.getElementById('matrix-loader');
            if (el) el.style.display = show ? 'block' : 'none';
            // Safety: Force unlock UI after 5 seconds
            if (show) setTimeout(() => { if (el) el.style.display = 'none'; }, 5000);
        };

        const run = async () => {
            if (!window.map) return;
            let route = null;
            window.map.eachLayer(l => {
                if (l instanceof L.Polyline && l._latlngs && l._latlngs.length > 20) route = l;
            });
            if (!route) return;

            const coords = route.getLatLngs();
            const sig = `${coords.length}-${coords[0].lat}`;
            if (sig === state.lastSig) return;

            toggleLoader(true);
            state.lastSig = sig;

            if (state.communities.length === 0) {
                const res = await fetch('communities.json');
                state.communities = await res.json();
            }

            const pcts = [0, 0.25, 0.5, 0.75, 0.99];
            const used = new Set();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();

            try {
                const results = await Promise.all(pcts.map(async (pct) => {
                    const idx = Math.floor((coords.length - 1) * pct);
                    const p = coords[idx];
                    
                    // WIDENED CORRIDOR (30km) to ensure no hangs
                    const match = state.communities
                        .map(c => ({ ...c, d: window.map.distance([p.lat, p.lng], [c.lat, c.lng]) }))
                        .filter(c => c.d < 30000 && !used.has(c.name))
                        .sort((a,b) => a.d - b.d)[0];

                    if (!match) return null;
                    used.add(match.name);

                    const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);
                    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${match.lat}&longitude=${match.lng}&hourly=temperature_2m,weather_code&timezone=auto`);
                    const wData = await wRes.json();
                    
                    const tStr = arrival.toISOString().split(':')[0] + ":00";
                    const i = Math.max(0, wData.hourly.time.findIndex(t => t.startsWith(tStr.substring(0,13))));
                    const symbols = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
                    
                    return {
                        name: match.name, lat: match.lat, lng: match.lng,
                        temp: Math.round(wData.hourly.temperature_2m[i]),
                        sky: symbols[wData.hourly.weather_code[i]] || "☁️",
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                }));

                const valid = results.filter(r => r);
                state.layer.clearLayers();
                let html = "";
                valid.forEach(d => {
                    L.marker([d.lat, d.lng], {
                        icon: L.divIcon({
                            className: '',
                            html: `<div class="glass-node">
                                    <div class="glass-header">${d.name}</div>
                                    <div class="glass-body"><span>${d.sky}</span><span class="glass-temp-val">${d.temp}°</span></div>
                                   </div>`,
                            iconSize: [115, 55], iconAnchor: [57, 160]
                        })
                    }).addTo(state.layer);

                    html += `<tr>
                        <td style="padding:15px 12px; border-bottom:1px solid #333; color:#FFD700; font-weight:900; text-transform:uppercase;">${d.name}</td>
                        <td style="padding:15px 12px; border-bottom:1px solid #333; color:#fff;">${d.eta}</td>
                        <td style="padding:15px 12px; border-bottom:1px solid #333; color:#FFD700; font-weight:900;">${d.temp}°C</td>
                        <td style="padding:15px 12px; border-bottom:1px solid #333; text-align:right; font-size:22px;">${d.sky}</td>
                    </tr>`;
                });
                document.getElementById('matrix-body').innerHTML = html;
            } catch (e) { console.error("Sync Error", e); }
            toggleLoader(false);
        };

        return {
            init: () => {
                state.layer.addTo(window.map);
                if (!document.getElementById('matrix-loader')) {
                    document.body.insertAdjacentHTML('beforeend', `<div id="matrix-loader">INITIALIZING MISSION DATA...</div>`);
                }
                setInterval(run, 5000);
                run();
            }
        };
    })();

    WeatherEngine.init();
})();
