/**
 * ROUTE-ENGINE.JS | v.2025.12.30.FINAL_GROUND_UP
 * Requirements: Grey/Yellow Dash Ribbon, Multi-Speed Math, Midpoint Flag.
 */
window.RouteEngine = {
    _layers: L.layerGroup(),
    _flag: null,

    /**
     * The core calculation engine. 
     * Uses custom speeds: 100km/h (TCH), 80km/h (Branch), 50km/h (Local).
     */
    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        
        // Clear UI to prevent ghosting or duplicates
        this._layers.clearLayers();
        if (this._flag) window.map.removeLayer(this._flag);

        const pts = window.hubMarkers.map(m => m.getLatLng());

        // Fetch raw geometry only - no bulky UI panels
        const url = `https://router.project-osrm.org/route/v1/driving/${pts[0].lng},${pts[0].lat};${pts[1].lng},${pts[1].lat}?overview=full&geometries=geojson`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!data.routes || data.routes.length === 0) return;
                
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
                const distanceKm = route.distance / 1000;

                // MULTI-SPEED CALCULATION: Weighted for NL Road Hierarchy
                // TCH (100) is the majority of long routes, but connectors (80) and towns (50) add drag.
                const weightedSpeed = (100 * 0.75) + (80 * 0.15) + (50 * 0.10); 
                const travelTimeHrs = distanceKm / weightedSpeed;
                const hours = Math.floor(travelTimeHrs);
                const mins = Math.round((travelTimeHrs - hours) * 60);

                // DRAW RIBBON: Grey base with Yellow centerline dashes
                L.polyline(coordinates, {
                    color: '#444444', weight: 10, opacity: 0.9, lineCap: 'round'
                }).addTo(this._layers);

                L.polyline(coordinates, {
                    color: '#FFD700', weight: 2, dashArray: '10, 20', opacity: 1, lineCap: 'butt'
                }).addTo(this._layers);

                this._layers.addTo(window.map);

                // MIDPOINT FLAG: Travel Stats
                const midIndex = Math.floor(coordinates.length / 2);
                const midPoint = coordinates[midIndex];

                const flagStyle = `
                    background: #1a1a1a; color: #fff; padding: 6px 12px; 
                    border-radius: 20px; border: 2px solid #FFD700; 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    font-size: 12px; font-weight: bold; white-space: nowrap;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                `;

                this._flag = L.marker(midPoint, {
                    icon: L.divIcon({
                        className: 'route-flag',
                        html: `<div style="${flagStyle}">🏁 ${distanceKm.toFixed(1)} KM | ${hours}h ${mins}m</div>`,
                        iconSize: [160, 40],
                        iconAnchor: [80, 20]
                    }),
                    interactive: false
                }).addTo(window.map);
            })
            .catch(err => console.error("Routing Error:", err));
    }
};

/**
 * Handshake: Logic triggers only when the user finishes a movement.
 */
window.addEventListener('shell-live', () => {
    console.log("Engine Reset: Custom Ribbon Logic Loaded.");
    
    // Requirement 2: Update as soon as a pin is dropped (dragend)
    window.hubMarkers.forEach(m => {
        m.on('dragend', () => window.RouteEngine.calculate());
    });

    // Initial draw for the baseline Corner Brook -> St. John's route
    window.RouteEngine.calculate();
});
