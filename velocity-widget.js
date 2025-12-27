<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WEonG - Frame-Locked Stability [Locked]</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
    <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #001220; }
        .snapping-label {
            font-weight: bold; color: #0047AB; background: white;
            border: 2px solid #0047AB; padding: 6px 12px; border-radius: 8px;
            pointer-events: none; white-space: nowrap; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            font-family: sans-serif;
        }
        /* Lock the SVG to the map tiles to prevent "Ocean Drift" [cite: 2025-12-27] */
        .leaflet-overlay-pane svg { 
            transition: none !important; 
            pointer-events: none !important; 
            will-change: transform;
        }
        .leaflet-routing-container { display: none !important; }
    </style>
</head>
<body>
<div id="map"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>

<script>
    /**
     * [weong-route] - FRAME-LOCKED STABILITY ANCHOR
     * Logic: High-frequency re-projection during map animations [cite: 2025-12-27]
     */
    let map, communities = [], markers = [null, null], routingControl;

    async function init() {
        map = L.map('map', { 
            zoomControl: false, 
            fadeAnimation: false,
            zoomAnimation: true 
        }).setView([48.8, -55.5], 7); 
        
        window.weongMap = map; 
        
        L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }).addTo(map);

        try {
            const response = await fetch('data/nl/communities.json');
            const data = await response.json();
            communities = data.features;
            if (communities.length > 0) setupRoutingPins();
        } catch (e) { console.error("Dataset Load Error"); }

        // [1] THE FRAME LOCK: Constantly re-sync the SVG layer during map changes [cite: 2025-12-27]
        function syncLoop() {
            if (routingControl && (map.dragging.moving() || map._animatingZoom)) {
                // Accessing internal renderer to force pixel realignment
                if (routingControl._line) {
                    routingControl._line.pxBounds = null; 
                    routingControl._line.draw(); 
                }
            }
            requestAnimationFrame(syncLoop);
        }
        syncLoop();
    }

    function findNearestNode(latlng) {
        return communities.reduce((prev, curr) => {
            const p = L.latLng(prev.geometry.coordinates[1], prev.geometry.coordinates[0]);
            const c = L.latLng(curr.geometry.coordinates[1], curr.geometry.coordinates[0]);
            return latlng.distanceTo(c) < latlng.distanceTo(p) ? curr : prev;
        });
    }

    function setupRoutingPins() {
        const anchors = [[48.9454, -57.9415], [47.5615, -52.7126]];
        anchors.forEach((coord, i) => {
            const nearest = findNearestNode(L.latLng(coord));
            const marker = L.marker([nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]], { 
                draggable: true 
            }).addTo(map);
            
            marker.bindTooltip(nearest.properties.name, { permanent: true, className: 'snapping-label' }).openTooltip();
            markers[i] = marker;
            
            marker.on('dragend', () => {
                const final = findNearestNode(marker.getLatLng());
                marker.setLatLng([final.geometry.coordinates[1], final.geometry.coordinates[0]]);
                marker.setTooltipContent(final.properties.name);
                syncRoute(true); 
            });
        });

        routingControl = L.Routing.control({
            waypoints: [], 
            createMarker: () => null,
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: false, 
            show: false,
            lineOptions: {
                styles: [{ color: '#1A73E8', weight: 8, opacity: 0.8 }],
                extendToWaypoints: true
            }
        }).addTo(map);

        window.weongRouter = routingControl;

        routingControl.on('routesfound', (e) => {
            if (routingControl._shouldFly) {
                // [2] INTERRUPT: Kill zoom instantly if user touches the map [cite: 2025-12-27]
                map.once('mousedown touchstart dragstart', () => { map.stop(); });

                map.flyToBounds(L.latLngBounds(e.routes[0].coordinates), { 
                    padding: [100, 100], 
                    duration: 0.8 
                });
                routingControl._shouldFly = false;
            }
        });

        // [3] MOVEEND FAILSAVE: Hard alignment of pixels when movement stops [cite: 2025-12-27]
        map.on('moveend', () => {
            if (routingControl && markers[0] && markers[1]) {
                routingControl.setWaypoints([markers[0].getLatLng(), markers[1].getLatLng()]);
            }
        });

        setTimeout(() => syncRoute(false), 500); 
    }

    function syncRoute(shouldFly = false) {
        if (!markers[0] || !markers[1] || !routingControl) return;
        routingControl._shouldFly = shouldFly;
        routingControl.setWaypoints([markers[0].getLatLng(), markers[1].getLatLng()]);
    }

    window.onload = init;
</script>

<script src="velocity-widget.js"></script>
</body>
</html>
