/** * Project: [weong-bulletin] | L3 STABILITY PATCH 071
 * Philosophy: 'If it isn't broken, don't try to fix it.'
 * Logic: Strict Community Mapping + High-Clearance Icons.
 */

(function() {
    const WeatherEngine = {
        state: { 
            layer: L.layerGroup(), 
            lastSig: "", 
            communities: [] 
        },

        async refresh() {
            if (!window.map) return;

            // 1. Identify the active route line
            let route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
            if (!route) return;

            const coords = route.getLatLngs();
            const sig = `${coords.length}-${coords[0].lat}`;
            if (sig === this.state.lastSig) return;

            // 2. Trigger Loader and Load Data
            document.getElementById('matrix-loader').style.display = 'block';
            this.state.lastSig = sig;

            if (this.state.communities.length === 0) {
                const res = await fetch('communities.json');
                this.state.communities = await res.json();
            }

            const pcts = [0, 0.25, 0.5, 0.75, 0.99];
            const used = new Set();
            const speed = window.currentCruisingSpeed || 100;
            const dist = window.currentRouteDistance || 0;
            const depTime = window.currentDepartureTime || new Date();

            try {
                const waypoints = await Promise.all(pcts.map(async (pct) => {
                    const p = coords[Math.floor((coords.length - 1) * pct)];
                    
                    // STRICT COMMUNITY MATCHING (25km Corridor)
                    const match = this.state.communities
                        .map(c => ({ ...c, d: window.map.distance([p.lat, p.lng], [c.lat, c.lng]) }))
                        .filter(c => c.d < 25000 && !used.has(c.name))
                        .sort((a,b) => a.d - b.d)[0];

                    if (!match) return null;
                    used.add(match.name);

                    const arrival = new Date(depTime.getTime() + ((pct * dist) / speed) * 3600000);
                    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${match.lat}&longitude=${match.lng}&hourly=temperature_2m,weather_code&timezone=auto`);
                    const wData = await wRes.json();
                    
                    const timeStr = arrival.toISOString().split(':')[0] + ":00";
                    const idx = Math.max(0, wData.hourly.time.findIndex(t => t.startsWith(timeStr.substring(0,13))));
                    const symbols = { 0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 61:"🌧️", 71:"❄️", 95:"⛈️" };
                    
                    return {
                        name: match.name, lat: match.lat, lng: match.lng,
                        temp: Math.round(wData.hourly.temperature_2m[idx]),
                        sky: symbols[wData.hourly.weather_code[idx]] || "☁️",
                        eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                }));

                // 3. Render Map Icons and Table
                this.state.layer.clearLayers();
                let rows = "";
                
                waypoints.filter(w => w).forEach(d => {
                    L.marker([d.lat, d.lng], {
                        icon: L.divIcon({
                            className: '',
                            html: `<div class="glass-node">
                                    <div class="glass-header">${d.name}</div>
                                    <div class="glass-body"><span>${d.sky}</span><span class="glass-temp-val">${d.temp}°</span></div>
                                   </div>`,
                            iconSize: [110, 55], iconAnchor: [55, 160] // Float clear of labels
                        })
                    }).addTo(this.state.layer);

                    rows += `<tr>
                        <td style="padding:15px; border-bottom:1px solid #333; color:#FFD700; font-weight:900;">${d.name}</td>
                        <td style="padding:15px; border-bottom:1px solid #333; color:#fff;">${d.eta}</td>
                        <td style="padding:15px; border-bottom:1px solid #333; color:#FFD700; font-weight:900;">${d.temp}°C</td>
                        <td style="padding:15px; border-bottom:1px solid #333; text-align:right; font-size:20px;">${d.sky}</td>
                    </tr>`;
                });

                document.getElementById('matrix-body').innerHTML = rows;

            } catch (err) {
                console.error("Matrix Sync Failed", err);
            } finally {
                document.getElementById('matrix-loader').style.display = 'none';
            }
        },

        init() {
            this.state.layer.addTo(window.map);
            setInterval(() => this.refresh(), 5000);
            this.refresh();
        }
    };

    WeatherEngine.init();
})();
