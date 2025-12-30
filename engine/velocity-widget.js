/** [weong-route] Velocity & Time Control Module **/
/** Locked: Dec 30, 2025 - Time Sync Build [cite: 2025-12-30] **/

let speedOffset = 0;
let timeOffsetMins = 0; // Tracks minutes from "Now"

const style = document.createElement('style');
style.innerHTML = `
    #v-ui { 
        background: rgba(10, 10, 10, 0.98); color: #fff; 
        padding: 15px; border-radius: 15px; font-family: 'Courier New', monospace; 
        border: 1px solid #FFD70044; width: 220px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.8); backdrop-filter: blur(10px);
    }
    .v-section { margin-bottom: 15px; }
    .v-label { font-size: 9px; color: #FFD700; letter-spacing: 2px; margin-bottom: 8px; opacity: 0.8; text-align: center; }
    .v-controls { display: flex; align-items: center; justify-content: space-between; background: #000; border-radius: 10px; padding: 4px; border: 1px solid #222; }
    .v-btn { 
        background: #111; color: #FFD700; border: 1px solid #333; 
        border-radius: 6px; width: 34px; height: 34px; cursor: pointer; 
        font-size: 16px; transition: all 0.1s;
    }
    .v-btn:active { background: #FFD700; color: #000; }
    .v-display { flex-grow: 1; text-align: center; display: flex; flex-direction: column; }
    .v-main-text { font-size: 14px; font-weight: bold; }
    .v-sub-text { font-size: 10px; color: #00FF00; font-weight: bold; }
`;
document.head.appendChild(style);

const container = document.getElementById('velocity-anchor');
container.innerHTML = `
    <div id="v-ui">
        <div class="v-section">
            <div class="v-label">DEPARTURE WINDOW</div>
            <div class="v-controls">
                <button class="v-btn" id="t-down">−</button>
                <div class="v-display">
                    <span id="t-val" class="v-main-text">00:00 AM</span>
                    <span id="t-offset" class="v-sub-text">LIVE</span>
                </div>
                <button class="v-btn" id="t-up">+</button>
            </div>
        </div>

        <div class="v-section" style="margin-bottom:0;">
            <div class="v-label">CRUISING PACE</div>
            <div class="v-controls">
                <button class="v-btn" id="v-down">−</button>
                <div class="v-display">
                    <span id="v-val" class="v-main-text">POSTED</span>
                    <span id="v-offset" class="v-sub-text"></span>
                </div>
                <button class="v-btn" id="v-up">+</button>
            </div>
        </div>
    </div>
`;

function updateSystem() {
    // 1. Update Time UI
    const now = new Date();
    const departureTime = new Date(now.getTime() + timeOffsetMins * 60000);
    
    document.getElementById('t-val').innerText = departureTime.toLocaleTimeString('en-CA', {
        timeZone: 'America/St_Johns', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('t-offset').innerText = timeOffsetMins === 0 ? "LIVE" : 
        (timeOffsetMins > 0 ? "+" : "") + timeOffsetMins + " MIN";

    // 2. Update Speed UI
    const vVal = document.getElementById('v-val');
    const vOff = document.getElementById('v-offset');
    if (speedOffset === 0) {
        vVal.innerText = "POSTED";
        vOff.innerText = "";
    } else {
        vVal.innerText = "ADJUSTED";
        vOff.innerText = (speedOffset > 0 ? "+" : "") + speedOffset + " KM/H";
    }

    // 3. Global Broadcast [cite: 2025-12-30]
    window.currentSpeedOffset = speedOffset;
    window.currentDepartureTime = departureTime;
    
    // Trigger recalculations in route-engine and weather-engine
    window.dispatchEvent(new CustomEvent('weong:speedCalculated', { 
        detail: { departureTime, speedOffset } 
    }));
    window.dispatchEvent(new Event('weong:update'));
}

// Event Listeners for Time (+/- 15 min increments)
document.getElementById('t-up').onclick = () => { timeOffsetMins += 15; updateSystem(); };
document.getElementById('t-down').onclick = () => { timeOffsetMins -= 15; updateSystem(); };

// Event Listeners for Speed (+/- 5 km/h increments)
document.getElementById('v-up').onclick = () => { speedOffset += 5; updateSystem(); };
document.getElementById('v-down').onclick = () => { speedOffset -= 5; updateSystem(); };

// Initialization
updateSystem();
