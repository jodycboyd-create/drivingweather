/**
 * ROUTE-ENGINE.JS | v.2025.12.29.20
 * FORCE-OVERWRITE BUILD: Verifying File Path & Execution
 */
window.RouteEngine = {
    _control: null,
    _box: null,

    calculateRoute: function(start, end) {
        const map = window.map; 
        if (!map) return;

        // Cleanup previous layers
        if (this._control) map.removeControl(this._control);
        if (this._box) map.removeLayer(this._box);

        // 1. FORCE ROUTE COLOR TO RED [Confirmation Step]
        this._control = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            createMarker: () => null,
            addWaypoints: false,
            show: false,
            lineOptions: { 
                styles: [{ color: '#FF0000', weight: 10, opacity: 1 }] 
            }
        }).addTo(map);

        this._control.on('routesfound', (e) => {
            const route = e.routes[0];
            const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
            
            // 2. FORCE A LARGE BLUE RECTANGLE AT MIDPOINT
            const bounds = [
                [mid.lat - 0.05, mid.lng - 0.05], 
                [mid.lat + 0.05, mid.lng + 0.05]
            ];

            this._box = L.rectangle(bounds, {
                color: "#0000FF",
                fillColor: "#0000FF",
                fillOpacity: 1,
                weight: 5
            }).addTo(map);

            console.log("CRITICAL: Route Red / Box Blue. If not seen, file path is wrong.");
        });
    }
};
