/** [weong-route] Core Routing Engine - Flag Priority Build **/

// Priority 1: Define Global Flag Handshake immediately
window.updateMetricFlag = function(detail) {
    const { h, m, dist, speed, mid } = detail;
    if (!mid || !window.map) return;
    
    if (window.metricFlagMarker) window.map.removeLayer(window.metricFlagMarker);

    const flagHtml = `
        <div style="background: rgba(10,10,10,0.95); border: 1px solid #FFD700; color: #fff; padding: 10px; border-radius: 4px; font-family: monospace; width: 140px; box-shadow: 0 4px 15px #000; backdrop-filter: blur(4px); pointer-events: none;">
            <div style="font-size: 9px; color: #FFD700; border-bottom: 1px solid #333; margin-bottom: 6px; font-weight: bold;">SECTOR DATA</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
                <span style="color: #888;">DIST:</span><span style="text-align: right;">${dist}km</span>
                <span style="color: #888;">TIME:</span><span style="text-align: right;">${h}h ${m}m</span>
                <span style="color: #888;">PACE:</span><span style="color: #00FF00; text-align: right;">${speed}</span>
            </div>
        </div>`;

    window.metricFlagMarker = L.marker([mid.lat, mid.lng], {
        icon: L.divIcon({ html: flagHtml, className: 'tactical-flag', iconSize: [150, 70], iconAnchor: [75, 80] }),
        interactive: false
    }).addTo(window.map);
};

// ... keep existing drawTacticalRoute and calculateRoute functions ...
