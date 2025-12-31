/** * Project: [weong-bulletin]
 * Architecture: Regional Tile Manager (Scale: Canada)
 * Methodology: Temporal Grid Sampling
 * Status: Robust Base Build [cite: 2025-12-31]
 */

const WeatherManager = (function() {
    const registry = {
        tiles: new Map(), // Stores regional HRDPS chunks
        activeRoute: null,
        config: {
            apiBase: "https://api.weather.gc.ca/met/city/v1/coverage/hrdps/point",
            tileRadius: 0.5 // Latitude/Longitude degrees per tile
        }
    };

    /**
     * TILE COORDINATOR
     * Computes a unique ID for a geographic region to prevent redundant fetches.
     */
    const getTileId = (lat, lng) => {
        const r = registry.config.tileRadius;
        return `${Math.floor(lat / r)}_${Math.floor(lng / r)}`;
    };

    return {
        /**
         * PRECISION FETCH
         * Fetches and caches data for a specific geographic region.
         */
        fetchRegion: async function(lat, lng) {
            const id = getTileId(lat, lng);
            if (registry.tiles.has(id)) return registry.tiles.get(id);

            try {
                const url = `${registry.config.apiBase}?lat=${lat}&lon=${lng}&format=json`;
                const response = await fetch(url);
                const data = await response.json();
                
                // Index by hour for fast lead-time lookup
                const temporalMap = {};
                data.forecasts.forEach(f => {
                    const hr = new Date(f.time).getHours();
                    temporalMap[hr] = {
                        t: Math.round(f.temperature),
                        w: Math.round(f.wind_speed),
                        v: f.visibility,
                        s: f.icon_code,
                        c: f.condition
                    };
                });

                registry.tiles.set(id, temporalMap);
                return temporalMap;
            } catch (e) {
                console.error("WeatherManager: Tile Fetch Failed", e);
                return null;
            }
        },

        getRegistry: () => registry
    };
})();

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        nodes: [0.1, 0.3, 0.5, 0.7, 0.9] // Expanded node coverage
    };

    const sync = async () => {
        if (!window.map) return;
        
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString" || l._latlngs);
        if (!route) return;

        const coords = route.feature ? route.feature.geometry.coordinates.map(c => [c[1], c[0]]) : route._latlngs;
        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();

        let dist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            dist += L.latLng(coords[i]).distanceTo(L.latLng(coords[i+1]));
        }
        const totalKm = dist / 1000;

        const results = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const pos = coords[idx];
            const lat = pos.lat || pos[0];
            const lng = pos.lng || pos[1];
            
            const eta = new Date(depTime.getTime() + ((totalKm * pct) / speed * 3600000));
            const data = await WeatherManager.fetchRegion(lat, lng);
            const hourData = data ? data[eta.getHours()] : null;

            return {
                latlng: [lat, lng],
                eta: eta.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                weather: hourData || { t: "--", w: "--", v: "--", s: "01", c: "OFFLINE" }
            };
        }));

        render(results);
    };

    const render = (wps) => {
        state.layer.clearLayers();
        const rows = wps.map(wp => {
            const iconUrl = `https://weather.gc.ca/weathericons/${wp.weather.s}.gif`;
            
            L.marker(wp.latlng, {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `
                    <div style="background:rgba(10,10,10,0.9); border:1px solid #FFD700; border-radius:10px; width:55px; height:55px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; box-shadow:0 5px 15px #000;">
                        <img src="${iconUrl}" style="width:20px; height:20px;">
                        <span style="font-size:12px; font-weight:bold; color:#FFD700;">${wp.weather.t}°</span>
                    </div>`,
                    iconSize: [55, 55], iconAnchor: [27, 27]
                })
            }).addTo(state.layer);

            return `<tr style="border-bottom:1px solid rgba(255,215,0,0.1); height:40px;">
                <td style="padding:5px;">POINT ${wps.indexOf(wp)+1}</td>
                <td style="opacity:0.6;">${wp.eta}</td>
                <td style="font-weight:bold; color:#FFD700;">${wp.weather.t}°C</td>
                <td>${wp.weather.w} km/h</td>
                <td>${wp.weather.v} km</td>
                <td>${wp.weather.c}</td>
            </tr>`;
        });

        const body = document.getElementById('weong-table-body');
        if (body) body.innerHTML = rows.join('');
    };

    return {
        init: function() {
            state.layer.addTo(window.map);
            setInterval(sync, 5000);
        }
    };
})();

WeatherEngine.init();
