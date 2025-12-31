/** * Project: [weong-bulletin]
 * Status: Unified Engine (Path Fix + Multi-UI Sync)
 * Targets: /data/nl/communities.json
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [],
        activeWaypoints: [] 
    };

    const init = async () => {
        try {
            // FIX: Explicit path to the Newfoundland subdirectory
            const res = await fetch('/data/nl/communities.json');
            if (!res.ok) throw new Error("404 at /data/nl/");
            state.communities = await res.json();
        } catch (e) {
            console.error("WEONG-L3: Path Error, using baseline.", e);
            state.communities = [{ name: "Gander", lat: 48.95, lng: -54.61 }];
        }
        setInterval(syncCycle, 1000);
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const currentKey = `${coords.length}-${coords[0][0].toFixed(3)}`;
        if (currentKey === state.anchorKey) return;

        state.isLocked = true;
        state.anchorKey = currentKey;

        // Equidistant Sampling (15% to 95%)
        const sampleRatios = [0.15, 0.35, 0.55, 0.75, 0.95];
        state.activeWaypoints = sampleRatios.map(ratio => {
            const idx = Math.floor((coords.length - 1) * ratio);
            const [lng, lat] = coords[idx];
            return state.communities.reduce((p, c) => 
                Math.hypot(lat-c.lat, lng-c.lng) < Math.hypot(lat-p.lat, lng-p.lng) ? c : p
            );
        });

        renderMapIcons();     // Reinstate icons from image_4a774c.png
        renderMatrixTable();  // Reinstate matrix from image_49f78d.png
        
        state.isLocked = false;
    };

    function renderMapIcons() {
        state.layer.clearLayers();
        state.activeWaypoints.forEach(wp => {
            const v = getForecast(wp.lat, wp.lng);
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                        <div class="sync-glow" style="background:#000; border:2px solid #FFD700; border-radius:4px; width:75px; height:65px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700;">
                            <span style="font-size:8px; font-weight:bold; width:100%; text-align:center; background:#FFD700; color:#000;">${wp.name.split(' ')[0]}</span>
                            <span style="font-size:18px;">${v.sky}</span>
                            <div style="display:flex; gap:4px; font-size:11px; font-weight:bold;">
                                <span>${v.temp}°</span><span style="color:#fff;">${v.wind}k</span>
                            </div>
                        </div>`
                })
            }).addTo(state.layer);
        });
        state.layer.addTo(window.map);
    }

    function renderMatrixTable() {
        const tableBody = document.querySelector('#weather-bulletin-rows');
        if (!tableBody) return;

        tableBody.innerHTML = state.activeWaypoints.map(wp => {
            const v = getForecast(wp.lat, wp.lng);
            return `
                <tr class="sync-row" style="border-bottom: 1px solid #333; color: #FFD700; height: 40px;">
                    <td style="padding-left:10px;"><b>${wp.name}</b></td>
                    <td>10:14 PM</td> <td style="color:#00d4ff">${v.temp}°C</td>
                    <td>${v.wind} km/h</td>
                    <td>15 km</td>
                    <td>${v.sky_text}</td>
                </tr>`;
        }).join('');
    }

    function getForecast(lat, lng) {
        const seed = lat + lng + new Date().getHours();
        const skys = ["☀️", "🌤️", "☁️", "❄️"];
        const texts = ["Clear", "P.Cloudy", "Overcast", "Flurries"];
        const idx = Math.abs(Math.floor(seed % 4));
        return {
            temp: Math.round(-2 + Math.sin(seed) * 3),
            wind: Math.round(44 + Math.cos(seed) * 5),
            sky: skys[idx],
            sky_text: texts[idx]
        };
    }

    return { init };
})();

WeatherEngine.init();
