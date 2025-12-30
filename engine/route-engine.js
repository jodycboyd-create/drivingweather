/**
 * ROUTE-ENGINE.JS | RAPID-FIRE BUILD
 * Optimized for real-time movement without request lag.
 */
window.RouteEngine = {
    _control: null,
    _isCalculating: false, // Guard to prevent request stacking

    calculate: function() {
        if (!window.map || !window.hubMarkers || window.hubMarkers.length < 2) return;
        if (this._isCalculating) return; // Skip if a request is already in flight

        const pts = window.hubMarkers.map(m => m.getLatLng());

        // 1. FAST UPDATE (No re-initialization)
        if (this._control) {
            this._isCalculating = true;
            this._control.setWaypoints(pts);
            
            // Release the guard after a tiny buffer
            setTimeout(() => { this._isCalculating = false; }, 50); 
            return;
        }

        // 2. SILENT INITIALIZATION
        this._control = L.Routing.control({
            waypoints: pts,
            router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
            lineOptions: { styles: [{ color: '#0070bb', weight: 8, opacity: 0.7 }] },
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            createMarker: () => null
        }).addTo(window.map);

        // 3. NUCLEAR PANEL KILLER
        const container = this._control.getContainer();
        if (container) {
            container.style.display = 'none';
            container.innerHTML = ''; 
        }
    }
};

window.addEventListener('shell-live', () => {
    setTimeout(() => window.RouteEngine.calculate(), 200);
});
