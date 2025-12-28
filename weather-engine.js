/** [weong-route] Visual Weather Bulletin Module **/
(function() {
    let lastRoute = null;

    // 1. Icon Library & Logic [cite: 2025-12-27]
    const icons = {
        clear: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M17.66 6.34l1.42-1.42"/></svg>',
        cloudy: '<svg viewBox="0 0 24 24" fill="none" stroke="#bdc3c7" stroke-width="2"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-4-4.5-.4-3.4-3.3-6-6.8-6-2.5 0-4.7 1.4-5.9 3.5C3.1 8.1 1 10.3 1 13c0 3.3 2.7 6 6 6h10.5z"/></svg>',
        rain: '<svg viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2"><path d="M20 16.5c0 3-2.5 4.5-4.5 4.5s-4.5-1.5-4.5-4.5V9m4-4l-4 4-4-4"/></svg>',
        wind: '<svg viewBox="0 0 24 24" fill="none" stroke="#00ff00" stroke-width="2"><path d="M17.7 7l-2.7-3h4.7c1.8 0 3.3 1.5 3.3 3.3s-1.5 3.3-3.3 3.3h-16c-1.8 0-3.3-1.5-3.3-3.3s1.5-3.3 3.3-3.3h2"/><path d="M17.3 17l-2.7 3h4.7c1.8 0 3.3-1.5 3.3-3.3s-1.5-3.3-3.3-3.3h-16c-1.8 0-3.3 1.5-3.3 3.3s1.5 3.3 3.3 3.3h2"/></svg>',
        fog: '<svg viewBox="0 0 24 24" fill="none" stroke="#ecf0f1" stroke-width="2"><path d="M4 10h16M4 14h16M4 18h16M4 6h16"/></svg>'
    };

    // 2. Inject Styles for the Bulletin
    const style = document.createElement('style');
    style.innerHTML = `
        #weather-panel {
            position: absolute; top: 20px; left: 20px; z-index: 1000;
            background: rgba(10, 10, 10, 0.9); color: white;
            border-radius: 16px; width: 280px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            font-family: 'Segoe UI', sans-serif; border: 1px solid #333; overflow: hidden;
        }
        .w-header { background: #1a1a1a; padding: 12px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
        .w-title { font-size: 10px; letter-spacing: 2px; color: #888; }
        .w-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #222; gap: 15px; }
        .w-icon { width: 36px; height: 36px; flex-shrink: 0; }
        .w-info { flex-grow: 1; }
        .w-time { font-size: 11px; color: #00ff00; font-weight: bold; }
        .w-loc { font-size: 15px; font-weight: 600; }
        .w-meta { display: flex; gap: 10px; font-size: 11px; color: #aaa; margin-top: 4px; }
        .hazard { color: #ff4757; font-weight: bold; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'weather-panel';
    document.body.appendChild(panel);

    // 3. Logic Bridge
    window.addEventListener('weong:speedCalculated', (e) => {
        const { departureTime, speed, dist } = e.detail;
        renderBulletin(departureTime, speed, dist);
    });

    function renderBulletin(startTime, speed, totalDist) {
        let html = `<div class="w-header"><span class="w-title">EN ROUTE BULLETIN</span></div>`;
        
        // Waypoint Logic: Start, Mid, End
        const stops = [
            { label: 'Departure', dist: 0, condition: 'clear', temp: '2°', wind: '15' },
            { label: 'Mid-Point', dist: totalDist / 2, condition: 'fog', temp: '0°', wind: '40', hazard: 'FOG ALERT' },
            { label: 'Destination', dist: totalDist, condition: 'cloudy', temp: '-3°', wind: '20' }
        ];

        stops.forEach(stop => {
            const travelHours = stop.dist / speed;
            const arrival = new Date(startTime.getTime() + travelHours * 3600000);
            
            html += `
                <div class="w-item">
                    <div class="w-icon">${icons[stop.condition]}</div>
                    <div class="w-info">
                        <div class="w-time">${arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div class="w-loc">${stop.label}</div>
                        <div class="w-meta">
                            <span>${stop.temp}</span>
                            <span>${stop.wind} km/h Wind</span>
                            ${stop.hazard ? `<span class="hazard">${stop.hazard}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        panel.innerHTML = html;
    }
})();
