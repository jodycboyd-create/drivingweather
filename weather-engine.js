/** [weong-route] Weather Engine - Live API Fixed **/
(function() {
    let lastRoute = null;

    const anchor = document.getElementById('weather-anchor');
    if (!anchor) return;
    anchor.innerHTML = `<div id="weather-panel"></div>`;
    const panel = document.getElementById('weather-panel');

    const icons = {
        clear: () => `<svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" style="width:100%; height:100%;"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M17.66 6.34l1.42-1.42"/></svg>`,
        cloudy: () => `<svg viewBox="0 0 24 24" fill="none" stroke="#bdc3c7" stroke-width="2" style="width:100%; height:100%;"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-4-4.5-.4-3.4-3.3-6-6.8-6-2.5 0-4.7 1.4-5.9 3.5C3.1 8.1 1 10.3 1 13c0 3.3 2.7 6 6 6h10.5z"/></svg>`,
        rain: () => `<svg viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2" style="width:100%; height:100%;"><path d="M20 16.5c0 3-2.5 4.5-4.5 4.5s-4.5-1.5-4.5-4.5V9m4-4l-4 4-4-4"/></svg>`,
        fog: () => `<svg viewBox="0 0 24 24" fill="none" stroke="#ecf0f1" stroke-width="2" style="width:100%; height:100%;"><path d="M4 10h16M4 14h16M4 18h16M4 6h16"/></svg>`
    };

    function mapCodeToIcon(code) {
        if (code <= 3) return icons.clear();
        if (code >= 45 && code <= 48) return icons.fog();
        if (code >= 51 && code <= 67) return icons.rain();
        return icons.cloudy();
    }

    window.addEventListener('weong:speedCalculated', async (e) => {
        if (!lastRoute || !window.communities) return;
        const { departureTime, speed } = e.detail;
        
        panel.innerHTML = `<div class="w-header">UPDATING LIVE DATA...</div>`;

        const path = lastRoute.coordinates;
        const totalDist = lastRoute.summary.totalDistance / 1000;
        const stops = [0, 0.33, 0.66, 1].map(pct => {
            const idx = Math.floor((path.length - 1) * pct);
            const pt = L.latLng(path[idx].lat, path[idx].lng);
            const town = window.communities.reduce((prev, curr) => {
                const cPos = L.latLng(curr.geometry.coordinates[1], curr.geometry.coordinates[0]);
                const pPos = L.latLng(prev.geometry.coordinates[1], prev.geometry.coordinates[0]);
                return pt.distanceTo(cPos) < pt.distanceTo(pPos) ? curr : prev;
            });
            return { name: town.properties.name, lat: town.geometry.coordinates[1], lng: town.geometry.coordinates[0], dist: totalDist * pct };
        });

        const lats = stops.map(s => s.lat).join(',');
        const lons = stops.map(s => s.lng).join(',');
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=temperature_2m,weathercode,windspeed_10m&timezone=auto`;

        try {
            const res = await fetch(url);
            const rawData = await res.json();
            // Open-Meteo returns a single object if 1 location, but an ARRAY of objects for multiple.
            const weatherResults = Array.isArray(rawData) ? rawData : [rawData];

            let html = `<div class="w-header">LIVE ROUTE BULLETIN</div>`;
            stops.forEach((stop, i) => {
                const travelHours = stop.dist / speed;
                const arrival = new Date(departureTime.getTime() + travelHours * 3600000);
                
                // Find matching hour index in API results
                const arrivalISO = arrival.toISOString().split(':')[0] + ':00';
                const hourIdx = weatherResults[i].hourly.time.findIndex(t => t.startsWith(arrivalISO.substring(0, 13)));
                const idx = hourIdx !== -1 ? hourIdx : 0;

                const w = weatherResults[i].hourly;
                const temp = w.temperature_2m[idx];
                const code = w.weathercode[idx];
                const wind = w.windspeed_10m[idx];

                html += `
                    <div class="w-item">
                        <div class="w-icon-box">${mapCodeToIcon(code)}</div>
                        <div class="w-info">
                            <div class="w-time">${arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            <div class="w-loc">${stop.name.toUpperCase()}</div>
                            <div class="w-meta">${temp}°C | ${wind}km/h Wind | ${stop.dist.toFixed(0)}km</div>
                        </div>
                    </div>`;
            });
            panel.innerHTML = html;
        } catch (err) {
            panel.innerHTML = `<div class="w-header" style="color:red">API CONNECTION ERROR</div>`;
        }
    });

    window.addEventListener('weong:routeUpdated', (e) => { lastRoute = e.detail; });
})();
