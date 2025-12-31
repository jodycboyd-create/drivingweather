/** * Project: [weong-bulletin]
 * Logic: ECCC HRDPS WEonG Diagnostic Integration
 * Constraints: L3 Velocity Handshake + Lead-Time Mapping
 */

const WeatherEngine = (function() {
    const state = {
        layer: L.layerGroup(),
        anchorKey: null,
        isLocked: false,
        communities: [],
        activeWaypoints: [],
        nodes: [0.15, 0.35, 0.55, 0.75, 0.95],
        // ECCC Diagnostic Mapping
        weongMap: {
            "0": { icon: "☀️", label: "Clear" },
            "1": { icon: "🌧️", label: "Rain" },
            "2": { icon: "❄️", label: "Snow" },
            "3": { icon: "🌨️", label: "Blowing Snow" },
            "4": { icon: "🧊", label: "Frz. Rain" }
        }
    };

    const init = async () => {
        try {
            // Fetch the permanent Newfoundland dataset
            const res = await fetch('/data/nl/communities.json');
            const rawData = await res.json();
            state.communities = rawData.features.map(f => ({
                name: f.properties.name,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0]
            }));
        } catch (e) {
            console.warn("WEonG-L3: Resource unavailable. Using locked baseline.");
            state.communities = [{ name: "Gander", lat: 48.9578, lng: -54.6122 }];
        }
        state.layer.addTo(window.map);
        setInterval(syncCycle, 1000);
    };

    /**
     * ECCC Diagnostic Fetch: 
     * Queries the HRDPS-WEonG set for specific Lead Time and Coordinates
     */
    const fetchWEonGData = async (lat, lng, arrivalTime) => {
        // In a production environment, this would call the MSC GeoMet WFS API.
        // For this build, we calculate the deterministic diagnostic based on the grid index.
        const hour = arrivalTime.getHours();
        const isNight = hour >= 18 || hour < 6;
        
        // Lead Time Logic: Velocity-dependent offset
        const leadTime = Math.floor((arrivalTime - new Date()) / 3600000);
        
        // Deterministic Diagnostic Selection (Mocking the WEonG API response)
        const diagKey = (Math.abs(Math.floor(lat * 10)) % 5).toString();
        const data = state.weongMap[diagKey];

        return {
            temp: Math.round(-4 + (Math.sin(lat) * 2)),
            sky: isNight && data.icon === "☀️" ? "🌙" : data.icon,
            skyLabel: data.label,
            leadTime: leadTime
        };
    };

    const syncCycle = async () => {
        if (state.isLocked || !window.map || state.communities.length === 0) return;
        const route = Object.values(window.map._layers).find(l => l.feature?.geometry?.type === "LineString");
        if (!route) return;

        const coords = route.feature.geometry.coordinates;
        const currentKey = `${coords[0][0].toFixed(4)}-${coords.length}`;
        if (currentKey === state.anchorKey) return;

        state.isLocked = true;
        state.anchorKey = currentKey;

        // Velocity Widget Linkage
        const speed = window.currentCruisingSpeed || 100;
        const depTime = window.currentDepartureTime || new Date();
        const totalDistance = 900; // Estimated NL crossing

        state.activeWaypoints = await Promise.all(state.nodes.map(async (pct) => {
            const idx = Math.floor((coords.length - 1) * pct);
            const [lng, lat] = coords[idx];
            
            // Calculate Arrival Time based on Velocity Widget speed
            const travelHours = (totalDistance * pct) / speed;
            const arrival = new Date(depTime.getTime() + (travelHours * 3600000));
            
            const community = state.communities.reduce((prev, curr) => {
                const dPrev = Math.hypot(lat - prev.lat, lng - prev.lng);
                const dCurr = Math.hypot(lat - curr.lat, lng - curr.lng);
                return dCurr < dPrev ? curr : prev;
            });

            const weong = await fetchWEonGData(community.lat, community.lng, arrival);

            return {
                ...community,
                eta: arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                variant: weong
            };
        }));

        renderIcons();
        renderTable();
        state.isLocked = false;
    };

    const renderIcons = () => {
        state.layer.clearLayers();
        state.activeWaypoints.forEach(wp => {
            L.marker([wp.lat, wp.lng], {
                icon: L.divIcon({
                    className: 'w-node',
                    html: `<div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; border-radius:4px; width:55px; height:50px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#FFD700; box-shadow:0 0 10px #000; backdrop-filter:blur(3px);">
                            <span style="font-size:7px; font-weight:bold; background:#FFD700; color:#000; width:100%; text-align:center;">${wp.name.substring(0,10)}</span>
                            <span style="font-size:20px; line-height:1;">${wp.variant.sky}</span>
                            <span style="font-size:11px; font-weight:bold; color:${wp.variant.temp <= 0 ? '#00d4ff' : '#ff4500'}">${wp.variant.temp}°</span>
                        </div>`,
                    iconSize: [55, 50]
                })
            }).addTo(state.layer);
        });
    };

    const renderTable = () => {
        const container = document.getElementById('bulletin-rows');
        if (!container) return;
        container.innerHTML = state.activeWaypoints.map(wp => `
            <tr style="border-bottom:1px solid #222;">
                <td style="padding:8px 5px;">${wp.name}</td>
                <td style="padding:8px 5px;">${wp.eta}</td>
                <td style="padding:8px 5px; color:${wp.variant.temp <= 0 ? '#00d4ff' : '#ff4500'}">${wp.variant.temp}°C</td>
                <td style="padding:8px 5px;">${wp.variant.skyLabel} ${wp.variant.sky}</td>
            </tr>
        `).join('');
    };

    return { init };
})();

WeatherEngine.init();
