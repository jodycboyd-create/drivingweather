/**
 * ROUTE-ENGINE.JS | EFFICIENCY BUILD
 * Requirements: Grey/Yellow Ribbon, Midpoint Flag, 100/80/50 km/h Math.
 * [cite: 2025-12-30]
 */
window.RouteEngine = {
    _layers: L.layerGroup(),
    _flag: null,

    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        // Clear previous route to save memory
        this._layers.clearLayers();
        if (this._flag) window.map.removeLayer(this._flag);

        const pts = window.hubMarkers.map(m => m.getLatLng());

        // Efficiency: Fetch ONLY coordinates. No instructions, no extra metadata.
        const url = `https://router.project-osrm.org/route/v1/driving/${pts[0].lng},${pts[0].lat};${pts[1].lng},${pts[1].lat}?overview=full&geometries=geojson&steps=false`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!data.routes || data.routes.length === 0) return;
                
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
                const distanceKm = route.distance / 1000;

                // MULTI-SPEED CALCULATION (Weighted for NL roads)
                // 100 km/h (TCH), 80 km/h (Connectors), 50 km/h (Towns)
                const weightedSpeed = (100 * 0.70) + (80 * 0.20) + (50 * 0.10); 
                const travelTimeHrs = distanceKm / weightedSpeed;
                const hours = Math.floor(travelTimeHrs);
                const mins = Math.round((travelTimeHrs - hours) * 60);

                // DRAW THE RIBBON (Grey Highway / Yellow Dash)
                L.polyline(coordinates, {
                    color: '#444444', weight: 9, opacity: 0.9, lineCap: 'round'
                }).addTo(this._layers);

                L.polyline(coordinates, {
                    color: '#FFD700', weight: 2, dashArray: '10, 20', opacity: 1
                }).addTo(this._layers);

                this._layers.addTo(window.map);

                // THE MIDPOINT FLAG
                const midIndex = Math.floor(coordinates.length / 2);
                this._flag = L.marker(coordinates[midIndex], {
                    icon: L.divIcon({
                        className: 'route-flag',
                        html: `
                            <div style="background:#111; color:#FFD700; padding:5px 12px; border:2px solid #FFD700; border-radius:15px; font-weight:bold; white-space:nowrap; font-family:sans-serif; font-size:12px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                                🏁 ${distanceKm.toFixed(1)} km | ${hours}h ${mins}m
                            </div>`,
                        iconSize: [140, 30],
                        iconAnchor: [70, 15]
                    })
                }).addTo(window.map);
            })
            .catch(err => console.error("Efficiency Engine: Request Failed", err));
    }
};

// HANDSHAKE
window.addEventListener('shell-live', () => {
    // Only update when the pin is dropped to save bandwidth [cite: 2025-12-30]
    window.hubMarkers.forEach(m => {
        m.on('dragend', () => window.RouteEngine.calculate());
    });
    
    // Initial draw
    window.RouteEngine.calculate();
});
