/** * Project: [weong-route] | MODULE: optimize.js
 * Feature: Unified Temporal Broadcast (Fixes Weather Matrix & Icons)
 */

Optimizer.shiftTime = function(hours, target) {
    if (hours === undefined || hours === null) return;
    const offset = parseInt(hours);
    
    // 1. UI Synchronization
    document.querySelectorAll('.heat-cell').forEach(c => c.style.outline = "none");
    if (target) target.style.outline = "2px solid #00FFFF";

    // 2. Global State Update
    window.currentDepartureTime = new Date(Date.now() + offset * 3600000);

    // 3. Trigger Synchronized Module Updates
    
    // Update the Road Analytics Table (METRo)
    if (window.MetroTable && typeof MetroTable.updateTable === 'function') {
        MetroTable.updateTable(offset);
    }

    // Update the Mission Weather Matrix (Atmospheric)
    if (window.WeatherEngine && typeof WeatherEngine.updateMatrix === 'function') {
        WeatherEngine.updateMatrix(offset);
    }

    // Update Map Hub Icons (The Yellow Labels)
    if (window.HubManager && typeof HubManager.refreshIcons === 'function') {
        HubManager.refreshIcons(offset);
    }

    // Update Global Master Clock HUD
    if (window.MasterClock) {
        MasterClock.update(offset);
    }

    // 4. Intensity Re-Scan (Refreshes Heatmap Icons)
    const route = Object.values(window.map._layers).find(l => l._latlngs && l._latlngs.length > 20);
    if (route) this.runScan(route); 

    console.log(`SYSTEM: Global Lead-Time Sync to +${offset}H Successful.`);
};
