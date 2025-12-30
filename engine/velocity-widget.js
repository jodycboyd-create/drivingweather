/** [weong-route] Tactical Velocity & Time Module **/
(function() {
    let speedOffset = 0; 
    let lastRoute = null;
    let departureOffsetMins = 0; // Minutes from "Now"

    const style = document.createElement('style');
    style.innerHTML = `
        #v-ui { 
            background: rgba(15, 15, 15, 0.98); color: #00ff00; 
            padding: 18px; border-radius: 24px; font-family: 'Courier New', monospace; 
            border: 1px solid #00ff0033; text-align: center; width: 240px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6); backdrop-filter: blur(12px);
            user-select: none;
        }
        .v-section { margin-bottom: 20px; }
        .v-label { font-size: 10px; color: #555; letter-spacing: 2px; margin-bottom: 12px; font-weight: bold; }
        
        /* Time Scrubber Styling */
        .scrubber-container { position: relative; width: 100%; height: 40px; overflow: hidden; background: #000; border-radius: 8px; border: 1px solid #222; margin-bottom: 5px; cursor: ew-resize; }
        #v-time-display { font-size: 22px; font-weight: bold; line-height: 40px; color: #00ff00; text-shadow: 0 0 10px #00ff0066; }
        .scrubber-hint { font-size: 8px; color: #444; text-transform: uppercase; margin-top: 4px; }

        /* Speed Controls */
        .v-controls { display: flex; align-items: center; justify-content: space-around; background: #000; border-radius: 12px; padding: 10px; border: 1px solid #222; }
        .v-btn { 
            background: #1a1a1a; color: #00ff00; border: 1px solid #333; 
            border-radius: 10px; width: 44px; height: 44px; cursor: pointer; 
            font-size: 24px; transition: all 0.2s;
        }
        .v-btn:active { background: #00ff00; color: #000; transform: scale(0.9); }
        .v-val-box { display: flex; flex-direction: column; }
        .v-main-text { font-size: 16px; font-weight: bold; color: #fff; }
        .v-sub-text { font-size: 10px; color: #00ff00; height: 12px; }
    `;
    document.head.appendChild(style);

    const container = document.getElementById('velocity-anchor');
    container.innerHTML = `
        <div id="v-ui">
            <div class="v-section">
                <div class="v-label">DEPARTURE WINDOW</div>
                <div class="scrubber-container" id="time-scrubber">
                    <div id="v-time-display">LOADING...</div>
                </div>
                <div class="scrubber-hint">← SLIDE TO ADJUST TIME →</div>
            </div>

            <div class="v-section" style="margin-bottom:0">
                <div class="v-label">CRUISING PACE</div>
                <div class="v-controls">
                    <button class="v-btn" id="v-down">−</button>
                    <div class="v-val-box">
                        <span id="v-label" class="v-main-text">POSTED</span>
                        <span id="v-offset" class="v-sub-text"></span>
                    </div>
                    <button class="v-btn" id="v-up">+</button>
                </div>
            </div>
        </div>
    `;

    // Time Scrubber Logic (Mouse & Touch) [cite: 2025-12-27]
    let isDragging = false;
    let startX;
    const scrubber = document.getElementById('time-scrubber');

    const handleStart = (e) => { isDragging = true; startX = (e.pageX || e.touches[0].pageX); };
    const handleMove = (e) => {
        if (!isDragging) return;
        const x = (e.pageX || e.touches[0].pageX);
        const walk = (x - startX) * 2; // Sensitivity
        departureOffsetMins += (walk > 0 ? 5 : -5); // Snap to 5 min increments
        startX = x;
        update();
    };
    const handleEnd = () => { isDragging = false; };

    scrubber.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    scrubber.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

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
        
        // Update Time Display
        const depDate = new Date();
        depDate.setMinutes(depDate.getMinutes() + departureOffsetMins);
        document.getElementById('v-time-display').innerText = depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // Update Speed UI
        const offsetEl = document.getElementById('v-offset');
        const labelEl = document.getElementById('v-label');
        if (speedOffset === 0) {
            offsetEl.innerText = "";
            labelEl.innerText = "POSTED";
        } else {
            offsetEl.innerText = (speedOffset > 0 ? "+" : "") + speedOffset + " km/h";
            labelEl.innerText = "LIMIT";
        }

        const distKm = lastRoute.summary.totalDistance / 1000;
        const totalMins = (distKm / actualSpeed) * 60;
        
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

    window.addEventListener('weong:routeUpdated', (e) => { lastRoute = e.detail; update(); });
    document.getElementById('v-up').onclick = () => { speedOffset += 5; update(); };
    document.getElementById('v-down').onclick = () => { speedOffset -= 5; update(); };
})();
