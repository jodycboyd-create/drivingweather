/** [weong-route] Relative Velocity Widget Module **/
(function() {
    let speedOffset = 0; 
    let lastRoute = null;

    // UI Styles [cite: 2025-12-27]
    const style = document.createElement('style');
    style.innerHTML = `
        #v-ui { background: #1a1a1a; color: #00ff00; padding: 15px; border-radius: 12px; font-family: 'Courier New', monospace; border: 1px solid #333; text-align: center; width: 180px; box-shadow: 0 0 15px rgba(0,0,0,0.5); }
        .v-controls { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 8px 0; }
        .v-btn { background: #333; color: #00ff00; border: 1px solid #444; border-radius: 4px; cursor: pointer; padding: 5px 12px; font-weight: bold; font-size: 18px; }
        .v-btn:hover { background: #444; }
        .v-val { font-size: 18px; font-weight: bold; min-width: 80px; color: #fff; line-height: 1.2; }
        .v-offset { font-size: 13px; color: #00ff00; display: block; margin-top: 2px; }
    `;
    document.head.appendChild(style);

    // Initial UI Setup [cite: 2025-12-27]
    const container = document.getElementById('velocity-anchor');
    container.innerHTML = `
        <div id="v-ui">
            <div style="font-size:10px; color:#888; letter-spacing: 1px;">CRUISING SPEED</div>
            <div class="v-controls">
                <button class="v-btn" id="v-down">-</button>
                <div class="v-val">
                    <span id="v-label">POSTED</span>
                    <span id="v-offset" class="v-offset"></span>
                </div>
                <button class="v-btn" id="v-up">+</button>
            </div>
            <div style="font-size:9px; color:#555">ADJUST IN 5km/h STEPS</div>
        </div>
    `;

    // Speed Hierarchy Logic [cite: 2025-12-27]
    function getBaseSpeed(route) {
        const dist = route.summary.totalDistance / 1000;
        const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
        
        let speed = 80; // Branch default
        if (dist > 40 && mid.lat > 48.8) speed = 100; // TCH
        
        const inGrosMorne = (mid.lat > 49.3 && mid.lng < -57.5);
        const inTerraNova = (mid.lat > 48.3 && mid.lat < 48.7 && mid.lng > -54.3);
        if (inGrosMorne || inTerraNova) speed = 90; // Park
        
        if (dist < 8) speed = 50; // Local
        return speed;
    }

    function update() {
        if (!lastRoute) return;
        
        const base = getBaseSpeed(lastRoute);
        const actualSpeed = base + speedOffset;
        
        // Update UI Text [cite: 2025-12-27]
        const offsetEl = document.getElementById('v-offset');
        const labelEl = document.getElementById('v-label');
        
        if (speedOffset === 0) {
            offsetEl.innerText = "";
            labelEl.innerText = "POSTED";
        } else {
            offsetEl.innerText = (speedOffset > 0 ? "+" : "") + speedOffset + " km/h";
            labelEl.innerText = "LIMIT";
        }

        // Calculate and Broadcast [cite: 2025-12-27]
        const distKm = lastRoute.summary.totalDistance / 1000;
        const mins = (distKm / actualSpeed) * 60;
        
        window.dispatchEvent(new CustomEvent('weong:speedCalculated', { 
            detail: { 
                h: Math.floor(mins / 60), m: Math.round(mins % 60), 
                dist: distKm.toFixed(1), 
                mid: lastRoute.coordinates[Math.floor(lastRoute.coordinates.length / 2)] 
            } 
        }));
    }

    // Communication bridge [cite: 2025-12-27]
    window.addEventListener('weong:routeUpdated', (e) => {
        lastRoute = e.detail;
        update();
    });

    document.getElementById('v-up').onclick = () => { speedOffset += 5; update(); };
    document.getElementById('v-down').onclick = () => { speedOffset -= 5; update(); };
})();
