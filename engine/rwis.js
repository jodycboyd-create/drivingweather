/** * Project: [weong-route] | MODULE: rwis.js
 * Version: L3_FULL_RESTORE_003
 * Feature: Temporal Sync (Forecasted Ground Truth)
 */

// 1. Explicit Global Initialization
window.RWIS = {
    // Baseline Newfoundland RWIS Stations for Route Sync
    stations: [
        { id: 'WRECKHOUSE', lat: 47.71, lng: -59.32 },
        { id: 'GOOBIES', lat: 47.93, lng: -53.95 },
        { id: 'GANDER_TCH', lat: 48.95, lng: -54.61 },
        { id: 'PADDY_HEAD', lat: 47.51, lng: -52.88 }
    ],
    group: L.layerGroup(),
    
    // 2. The Core Update Logic
    updatePills: async function(offset = 0) {
        // Prevent crashes if map hasn't loaded yet
        if (!window.map) return;
        
        // Ensure the group is on the map
        if (!window.map.hasLayer(this.group)) {
            this.group.addTo(window.map);
        }
        
        this.group.clearLayers();
        
        // Format time for Open-Meteo indexing (YYYY-MM-DDTHH)
        const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];

        for (const stn of this.stations) {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${stn.lat}&longitude=${stn.lng}&hourly=temperature_2m,windspeed_10m`);
                const data = await res.json();
                
                // Find index matching the projected offset
                const idx = data.hourly.time.findIndex(t => t.startsWith(time));
                
                if (idx !== -1) {
                    const temp = data.hourly.temperature_2m[idx].toFixed(1);
                    const wind = Math.round(data.hourly.windspeed_10m[idx]);

                    const icon = L.divIcon({
                        className: 'rwis-pill',
                        html: `<div style="background:rgba(10,10,10,0.9); border:1px solid #00FFFF; border-radius:4px; padding:2px 4px; color:#FFF; font-family:monospace; min-width:45px; text-align:center; box-shadow: 0 0 5px #000;">
                                <div style="color:#00FFFF; font-size:8px; font-weight:900;">${stn.id}</div>
                                <div style="font-size:11px;">${temp}°</div>
                                <div style="color:#00FFFF; font-size:7px;">${wind}KPH</div>
                               </div>`,
                        iconSize: [50, 40]
                    });

                    L.marker([stn.lat, stn.lng], { icon }).addTo(this.group);
                }
            } catch (err) {
                console.warn(`[RWIS] Data Skip for ${stn.id}:`, err);
            }
        }
        console.log(`[RWIS] Temporal Sync Complete: +${offset}H`);
    }
};

// 3. Auto-Initialize if Map exists
if (window.map) {
    RWIS.updatePills(0);
}
