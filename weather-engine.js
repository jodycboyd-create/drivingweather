/** [weong-route] Weather Engine - Hardened Build **/
(function() {
    let lastRoute = null;

    // 1. Setup the Panel immediately
    const anchor = document.getElementById('weather-anchor');
    if (!anchor) return;
    anchor.innerHTML = `<div id="weather-panel" style="display:none;"></div>`;
    const panel = document.getElementById('weather-panel');

    const icons = {
        clear: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M17.66 6.34l1.42-1.42"/></svg>',
        cloudy: '<svg viewBox="0 0 24 24" fill="none" stroke="#bdc3c7" stroke-width="2"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-4-4.5-.4-3.4-3.3-6-6.8-6-2.5 0-4.7 1.4-5.9 3.5C3.1 8.1 1 10.3 1 13c0 3.3 2.7 6 6 6h10.5z"/></svg>',
        fog: '<svg viewBox="0 0 24 24" fill="none" stroke="#ecf0f1" stroke-width="2"><path d="M4 10h16M4 14h16M4 18h16M4 6h16"/></svg>'
    };

    // 2. The community-finding logic
    function getWaypoints(route) {
        if (!window.communities) return [];
        const selected = [];
        const path = route.coordinates;
        const total = route.summary.totalDistance / 1000;
        
        // Pick 4 strategic points along the route
        [0, 0.3, 0.7, 1].forEach(pct => {
            const idx = Math.floor((path.length - 1) * pct);
            const pt = L.latLng(path[idx].lat, path[idx].lng);
            const closest = window.communities.reduce((prev, curr) => {
                const cPos = L.latLng(curr.geometry.coordinates[1], curr.geometry.coordinates[0]);
                const pPos = L.latLng(prev.geometry.coordinates[1], prev.geometry.coordinates[0]);
                return pt.distanceTo(cPos) < pt.distanceTo(pPos) ? curr : prev;
            });
            selected.push({ name: closest.properties.name, dist: total * pct });
        });
        return selected;
    }

    // 3. Listener for the custom event
    window.addEventListener('weong:speedCalculated', (e) => {
        if (!lastRoute) return;
        const { departureTime, speed } = e.detail;
        const waypoints = getWaypoints(lastRoute);

        let html = `<div class="w-header"><span class="w-title">ROUTE WEATHER BULLETIN</span></div>`;
        waypoints.forEach(wp => {
            const arr = new Date(departureTime.getTime() + (wp.dist / speed) * 3600000);
            const cond = wp.name.includes("Goobies") ? "fog" : "clear";
            html += `
                <div class="w-item">
                    <div class="w-icon">${icons[cond]}</div>
                    <div class="w-info">
                        <div class="w-time">${arr.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div class="w-loc">${wp.name.toUpperCase()}</div>
                        <div class="w-meta">${wp.dist.toFixed(0)} km | ${cond === 'fog' ? '<span class="hazard">FOG</span>' : 'Clear'}</div>
                    </div>
                </div>`;
        });
        panel.innerHTML = html;
        panel.style.display = 'block';
    });

    window.addEventListener('weong:routeUpdated', (e) => { 
        lastRoute = e.detail; 
    });
})();
