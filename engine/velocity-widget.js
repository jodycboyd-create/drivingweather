function update() {
    if (!lastRoute) return;
    
    // ... (keep all speed and time calculation logic) ...

    const metrics = { 
        h: Math.floor(totalMins / 60), 
        m: Math.round(totalMins % 60), 
        dist: distKm.toFixed(1), 
        mid: lastRoute.coordinates[Math.floor(lastRoute.coordinates.length / 2)],
        departureTime: depDate,
        speed: actualSpeed
    };

    // Robust Flag Trigger
    if (typeof window.updateMetricFlag === 'function') {
        window.updateMetricFlag(metrics);
    } else {
        console.warn("System: Route Engine Flag handler not yet attached.");
    }
}
