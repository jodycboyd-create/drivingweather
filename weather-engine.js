/** [weong-route] Weather Engine Module **/
(function() {
    let lastRoute = null;
    let currentSpeed = 80;

    // 1. Inject Weather UI Styles
    const style = document.createElement('style');
    style.innerHTML = `
        #weather-panel {
            position: absolute; top: 20px; right: 20px; z-index: 1000;
            background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
            border-radius: 12px; width: 220px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            font-family: sans-serif; display: none; overflow: hidden;
        }
        .w-header { background: #1A73E8; color: white; padding: 10px; font-weight: bold; font-size: 13px; }
        .w-point { padding: 10px; border-bottom: 1px solid #eee; }
        .w-time { font-size: 11px; color: #666; font-weight: bold; }
        .w-loc { font-size: 14px; font-weight: 700; margin: 2px 0; }
        .w-details { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px; margin-top: 5px; }
        .w-val { color: #1A73E8; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // Create Panel
    const panel = document.createElement('div');
    panel.id = 'weather-panel';
    document.body.appendChild(panel);

    // 2. Calculation Logic
    window.addEventListener('weong:routeUpdated', (e) => {
        lastRoute = e.detail;
        updateWeather();
    });

    // Listen for speed changes to update TOA
    window.addEventListener('weong:speedCalculated', (e) => {
        // We use the speed from the velocity widget to determine arrival times
        const distKm = parseFloat(e.detail.dist);
        const hoursTotal = distKm / (e.detail.h + (e.detail.m/60)); // Derived speed
        currentSpeed = isNaN(hoursTotal) ? 80 : hoursTotal; 
        updateWeather();
    });

    async function updateWeather() {
        if (!lastRoute) return;
        panel.style.display = 'block';
        
        const points = [
            { label: 'Departure', index: 0, offsetMins: 0 },
            { label: 'Mid-Point', index: Math.floor(lastRoute.coordinates.length / 2), offsetMins: null },
            { label: 'Destination', index: lastRoute.coordinates.length - 1, offsetMins: null }
        ];

        let html = `<div class="w-header">ROUTE WEATHER BULLETIN</div>`;
        
        const now = new Date();

        points.forEach(pt => {
            const coord = lastRoute.coordinates[pt.index];
            const distFromStart = (lastRoute.summary.totalDistance / 1000) * (pt.index / lastRoute.coordinates.length);
            const travelTimeMins = (distFromStart / currentSpeed) * 60;
            const arrivalTime = new Date(now.getTime() + travelTimeMins * 60000);
            
            // Mock Data for UI Prototype (Integration with Environment Canada API next)
            html += `
                <div class="w-point">
                    <div class="w-time">${arrivalTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div class="w-loc">${pt.label}</div>
                    <div class="w-details">
                        <span>Sky: <span class="w-val">Cloudy</span></span>
                        <span>Temp: <span class="w-val">-2°C</span></span>
                        <span>Precip: <span class="w-val">10%</span></span>
                        <span>Wind: <span class="w-val">25km/h</span></span>
                        <span>Fog: <span class="w-val">None</span></span>
                    </div>
                </div>
            `;
        });

        panel.innerHTML = html;
    }
})();
