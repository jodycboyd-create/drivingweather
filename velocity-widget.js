/** [weong-route] Velocity & Time Widget Module **/
(function() {
    let speedOffset = 0; 
    let lastRoute = null;
    let departureTime = new Date(); // Defaults to "Now"

    // 1. Sleek UI Styles
    const style = document.createElement('style');
    style.innerHTML = `
        #v-ui { 
            background: rgba(20, 20, 20, 0.95); color: #00ff00; 
            padding: 20px; border-radius: 16px; font-family: 'Courier New', monospace; 
            border: 1px solid #333; text-align: center; width: 220px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5); backdrop-filter: blur(8px);
        }
        .v-section { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #333; }
        .v-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        
        .v-label { font-size: 9px; color: #888; letter-spacing: 2px; margin-bottom: 8px; }
        .v-controls { display: flex; align-items: center; justify-content: center; gap: 12px; }
        
        /* Interactive Inputs */
        .v-time-input {
            background: #000; color: #00ff00; border: 1px solid #444;
            padding: 5px; border-radius: 4px; font-family: monospace; font-size: 16px;
            cursor: pointer; outline: none; text-align: center;
        }
        .v-btn { 
            background: #2a2a2a; color: #00ff00; border: 1px solid #444; 
            border-radius: 50%; width: 30px; height: 30px; cursor: pointer; 
            font-weight: bold; font-size: 18px; line-height: 1;
        }
        .v-btn:hover { background: #00ff00; color: #000; }
        
        .v-val-box { min-width: 90px; }
        .v-main-text { font-size: 18px; font-weight: bold; color: #fff; }
        .v-sub-text { font-size: 11px; color: #00ff00; display: block; height: 14px; }
    `;
    document.head.appendChild(style);

    const container = document.getElementById('velocity-anchor');
    container.innerHTML = `
        <div id="v-ui">
            <div class="v-section">
                <div class="v-label">DEPARTURE TIME</div>
                <input type="time" id="v-time-picker" class="v-time-input">
            </div>

            <div class="v-section">
                <div class="v-label">CRUISING PACE</div>
                <div class="v-controls">
                    <button class="v-btn" id="v-down">-</button>
                    <div class="v-val-box">
                        <span id="v-label" class="v-main-text">POSTED</span>
                        <span id="v-offset" class="v-sub-text"></span>
                    </div>
                    <button class="v-btn" id="v-up">+</button>
                </div>
            </div>
            <div style="font-size:9px; color:#444">WEonG VELOCITY ENGINE v1.2</div>
        </div>
    `;

    // Initialize time picker to current time
    const now = new Date();
    document.getElementById('v-time-picker').value = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    function getBaseSpeed(route) {
        const dist = route.summary.totalDistance / 1000;
        const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
        let speed = 80;
        if (dist > 40 && mid.lat > 48.8) speed = 100;
        const inGrosMorne = (mid.lat > 49.3 && mid.lng < -57.5);
        const inTerraNova = (mid.lat > 48.3 && mid.lat < 48.7 && mid.lng > -54.3);
        if (inGrosMorne || inTerraNova) speed = 90;
        if (dist < 8) speed = 50;
        return speed;
    }

    function update() {
        if (!lastRoute) return;
        
        const base = getBaseSpeed(lastRoute);
        const actualSpeed = base + speedOffset;
        
        // Update UI
        const offsetEl = document.getElementById('v-offset');
        const labelEl = document.getElementById('v-label');
        if (speedOffset === 0) {
            offsetEl.innerText = "";
            labelEl.innerText = "POSTED";
        } else {
            offsetEl.innerText = (speedOffset > 0 ? "+" : "") + speedOffset + " km/h";
            labelEl.innerText = "LIMIT";
        }

        // Calculate Times
        const timeVal = document.getElementById('v-time-picker').value.split(':');
        const depDate = new Date();
        depDate.setHours(parseInt(timeVal[0]), parseInt(timeVal[1]), 0);

        const distKm = lastRoute.summary.totalDistance / 1000;
        const totalMins = (distKm / actualSpeed) * 60;
        
        // Broadcast to Map and Weather Engine
        window.dispatchEvent(new CustomEvent('weong:speedCalculated', { 
            detail: { 
                h: Math.floor(totalMins / 60), 
                m: Math.round(totalMins % 60), 
                dist: distKm.toFixed(1), 
                mid: lastRoute.coordinates[Math.floor(lastRoute.coordinates.length / 2)],
                departureTime: depDate,
                speed: actualSpeed
            } 
        }));
    }

    // Event Listeners
    window.addEventListener('weong:routeUpdated', (e) => {
        lastRoute = e.detail;
        update();
    });

    document.getElementById('v-time-picker').onchange = update;
    document.getElementById('v-up').onclick = () => { speedOffset += 5; update(); };
    document.getElementById('v-down').onclick = () => { speedOffset -= 5; update(); };
})();
