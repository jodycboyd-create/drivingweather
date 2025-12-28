/** [weong-route] Community-Based Weather Bulletin **/
(function() {
    let lastRoute = null;

    // 1. Icon Library (LOCKED from previous step)
    const icons = {
        clear: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M17.66 6.34l1.42-1.42"/></svg>',
        cloudy: '<svg viewBox="0 0 24 24" fill="none" stroke="#bdc3c7" stroke-width="2"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-4-4.5-.4-3.4-3.3-6-6.8-6-2.5 0-4.7 1.4-5.9 3.5C3.1 8.1 1 10.3 1 13c0 3.3 2.7 6 6 6h10.5z"/></svg>',
        fog: '<svg viewBox="0 0 24 24" fill="none" stroke="#ecf0f1" stroke-width="2"><path d="M4 10h16M4 14h16M4 18h16M4 6h16"/></svg>'
    };

    // 2. Waypoint Detection Logic
    function getCommunitiesAlongRoute(route) {
        // Access the global communities list loaded in index.html
        if (!window.communities || window.communities.length === 0) return [];
        
        const path = route.coordinates;
        const selected = [];
        const step = Math.floor(path.length / 5); // Pick ~5-6 towns for the list

        for (let i = 0; i < path.length; i += step) {
            const point = L.latLng(path[i].lat, path[i].lng);
            // Find the closest town to this specific point on the line
            const closest = window.communities.reduce((prev, curr) => {
                const cPos = L.latLng(curr.geometry.coordinates[1], curr.geometry.coordinates[0]);
                const pPos = L.latLng(prev.geometry.coordinates[1], prev.geometry.coordinates[0]);
                return point.distanceTo(cPos) < point.distanceTo(pPos) ? curr : prev;
            });
            
            // Avoid duplicates
            if (!selected.find(s => s.properties.name === closest.properties.name)) {
                selected.push({
                    name: closest.properties.name,
                    dist: (route.summary.totalDistance / 1000) * (i / path.length)
                });
            }
        }
        return selected;
    }

    // 3. Render Engine
    window.addEventListener('weong:speedCalculated', (e) => {
        const { departureTime, speed, mid } = e.detail;
        if (!lastRoute) return;

        const waypoints = getCommunitiesAlongRoute(lastRoute);
        let html = `<div class="w-header"><span class="w-title">ROUTE WEATHER BULLETIN</span></div>`;

        waypoints.forEach(wp => {
            const travelHours = wp.dist / speed;
            const arrival = new Date(departureTime.getTime() + travelHours * 3600000);
            
            // Simulated Weather Logic (Integration with API next)
            const cond = wp.name === "Goobies" ? "fog" : "clear"; 

            html += `
                <div class="w-item">
                    <div class="w-icon">${icons[cond]}</div>
                    <div class="w-info">
                        <div class="w-time">${arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div class="w-loc">${wp.name.toUpperCase()}</div>
                        <div class="w-meta">
                            <span>Waypoint ${wp.dist.toFixed(0)} km</span>
                            ${cond === 'fog' ? '<span class="hazard">FOG ALERT</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        document.getElementById('weather-panel').innerHTML = html;
        document.getElementById('weather-panel').style.display = 'block';
    });

    window.addEventListener('weong:routeUpdated', (e) => {
        lastRoute = e.detail;
    });
})();
