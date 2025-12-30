/**
 * ROUTE-ENGINE.JS | CUSTOM RIBBON BUILD
 * Requirements: Grey/Yellow Ribbon, Midpoint Flag, Multi-Speed Math.
 * [cite: 2025-12-30]
 */
window.RouteEngine = {
    _layers: L.layerGroup(),
    _flag: null,

    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        // Clear previous route immediately to prevent ghosting
        this._layers.clearLayers();
        if (this._flag) window.map.removeLayer(this._flag);

        const pts = window.hubMarkers.map(m => m.getLatLng());

        // 1. Fetch Route Geometry via OSRM (Silent) [cite: 2025-12-30]
        const url = `https://router.project-osrm.org/route/v1/driving/${pts[0].lng},${pts[0].lat};${pts[1].lng},${pts[1].lat}?overview=full&geometries=geojson`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!data.routes || data.routes.length === 0) return;
                
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
                const distanceKm = route.distance / 1000;

                // 2. Multi-Speed Time Calculation [cite: 2025-12-30]
                // Weighted average: 70% TCH (100), 20% Branch (80), 10% Local (50)
                const weightedSpeed = (100 * 0.7) + (80 * 0.2) + (50 * 0.1); 
                const travelTimeHrs = distanceKm / weightedSpeed;
                const hours = Math.floor(travelTimeHrs);
                const mins = Math.round((travelTimeHrs - hours) * 60);

                // 3. Draw the Ribbon (Grey Base + Yellow Dashes) [cite: 2025-12-30]
                const baseLine = L.polyline(coordinates, {
                    color: '#444444', weight: 10, opacity: 0.9
                }).addTo(this._layers);

                const dashLine = L.polyline(coordinates, {
                    color: '#FFD700', weight: 2, dashArray: '10, 20', opacity: 1
                }).addTo(this._layers);

                this._layers.addTo(window.map);

                // 4. Stylized Midpoint Flag [cite: 2025-12-30]
                const midIndex = Math.floor(coordinates.length / 2);
                const midPoint = coordinates[midIndex];

                const flagContent = `
                    <div style="background:#222; color:#fff; padding:5px 10px; border-radius:15px; border:2px solid #FFD700; font-family:sans-serif; font-size:11px; white-space:nowrap;">
                        🏁 <b>${distanceKm.toFixed(1)} km</b> | ${hours}h ${mins}m
                    </div>`;

                this._flag = L.marker(midPoint, {
                    icon: L.divIcon({
                        className: 'custom-flag',
                        html: flagContent,
                        iconSize: [120, 30],
                        iconAnchor: [60, 15]
                    })
                }).addTo(window.map);
            });
    }
};

// HANDSHAKE: Trigger on pin drop (dragend) [cite: 2025-12-30]
window.addEventListener('shell-live', () => {
    window.hubMarkers.forEach(m => {
        m.on('dragend', () => window.RouteEngine.calculate());
    });
    // Initial draw
    window.RouteEngine.calculate();
});
