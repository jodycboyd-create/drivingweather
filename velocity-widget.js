/** [weong-route] Velocity Widget Module **/
(function() {
    let currentSpeed = 80;
    let lastRoute = null;

    // 1. Inject UI and Styles [cite: 2025-12-27]
    const style = document.createElement('style');
    style.innerHTML = `
        #v-ui { background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 12px; font-family: 'Courier New', monospace; border: 1px solid #333; text-align: center; width: 150px; }
        .v-controls { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0; }
        .v-btn { background: #333; color: #00ff00; border: 1px solid #444; border-radius: 4px; cursor: pointer; padding: 2px 8px; }
        .v-val { font-size: 24px; font-weight: bold; }
    `;
    document.head.appendChild(style);

    const container = document.getElementById('velocity-anchor');
    container.innerHTML = `
        <div id="v-ui">
            <div style="font-size:10px; color:#888" id="v-mode">POSTED LIMIT</div>
            <div class="v-controls">
                <button class="v-btn" id="v-down">-</button>
                <div class="v-val" id="v-display">0</div>
                <button class="v-btn" id="v-up">+</button>
            </div>
            <div style="font-size:10px">km/h</div>
        </div>
    `;

    // 2. Logic [cite: 2025-12-27]
    function calculateDefaultSpeed(route) {
        const dist = route.summary.totalDistance / 1000;
        const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
        let speed = 80;
        if (dist > 40 && mid.lat > 48.8) speed = 100;
        if ((mid.lat > 49.3 && mid.lng < -57.5) || (mid.lat > 48.3 && mid.lat < 48.7 && mid.lng > -54.3)) speed = 90;
        if (dist < 8) speed = 50;
        return speed;
    }

    function update() {
        if (!lastRoute) return;
        document.getElementById('v-display').innerText = currentSpeed;
        const distKm = lastRoute.summary.totalDistance / 1000;
        const mins = (distKm / currentSpeed) * 60;
        
        window.dispatchEvent(new CustomEvent('weong:speedCalculated', { 
            detail: { 
                h: Math.floor(mins / 60), m: Math.round(mins % 60), 
                dist: distKm.toFixed(1), 
                mid: lastRoute.coordinates[Math.floor(lastRoute.coordinates.length / 2)] 
            } 
        }));
    }

    // 3. Listeners [cite: 2025-12-27]
    window.addEventListener('weong:routeUpdated', (e) => {
        lastRoute = e.detail;
        currentSpeed = calculateDefaultSpeed(lastRoute);
        document.getElementById('v-mode').innerText = "POSTED LIMIT";
        update();
    });

    document.getElementById('v-up').onclick = () => { currentSpeed += 5; document.getElementById('v-mode').innerText = "OVERRIDE"; update(); };
    document.getElementById('v-down').onclick = () => { currentSpeed -= 5; document.getElementById('v-mode').innerText = "OVERRIDE"; update(); };
})();
