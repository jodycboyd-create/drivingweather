/** * Project: [weong-route] | MODULE: rwis.js
 * Feature: Temporal Sync (Forecasted Ground Truth)
 */
RWIS.updatePills = async function(offset = 0) {
    this.group.clearLayers();
    const time = new Date(Date.now() + offset * 3600000).toISOString().split(':')[0];

    for (const stn of this.stations) {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${stn.lat}&longitude=${stn.lng}&hourly=temperature_2m,windspeed_10m`);
        const data = await res.json();
        const idx = data.hourly.time.findIndex(t => t.startsWith(time));
        
        const temp = data.hourly.temperature_2m[idx].toFixed(1);
        const wind = Math.round(data.hourly.windspeed_10m[idx]);

        const icon = L.divIcon({
            className: 'rwis-pill',
            html: `<div style="background:rgba(10,10,10,0.9); border:1px solid #00FFFF; border-radius:4px; padding:2px 4px; color:#FFF; font-family:monospace; min-width:45px; text-align:center;">
                    <div style="color:#00FFFF; font-size:8px; font-weight:900;">${stn.id}</div>
                    <div style="font-size:11px;">${temp}°</div>
                    <div style="color:#00FFFF; font-size:7px;">${wind}KPH</div>
                   </div>`,
            iconSize: [50, 40]
        });
        L.marker([stn.lat, stn.lng], { icon }).addTo(this.group);
    }
};
