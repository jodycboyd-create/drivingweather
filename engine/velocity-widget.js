/** [weong-route] Velocity Control Module **/
/** Locked: Dec 30, 2025 - Clean Build [cite: 2025-12-30] **/

let speedOffset = 0;

// Initialize UI
const style = document.createElement('style');
style.innerHTML = `
    #v-ui { 
        background: rgba(15, 15, 15, 0.95); color: #fff; 
        padding: 15px; border-radius: 20px; font-family: 'Courier New', monospace; 
        border: 1px solid #FFD70033; text-align: center; width: 200px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.8); backdrop-filter: blur(10px);
    }
    .v-label { font-size: 10px; color: #FFD700; letter-spacing: 1px; margin-bottom: 8px; font-weight: bold; }
    .v-controls { display: flex; align-items: center; justify-content: space-between; background: #000; border-radius: 12px; padding: 5px; border: 1px solid #222; }
    .v-btn { 
        background: #1a1a1a; color: #FFD700; border: 1px solid #333; 
        border-radius: 8px; width: 40px; height: 40px; cursor: pointer; 
        font-size: 20px; transition: all 0.2s;
    }
    .v-btn:active { background: #FFD700; color: #000; transform: scale(0.9); }
    #v-display { font-size: 16px; font-weight: bold; min-width: 80px; }
    .v-subtext { font-size: 9px; color: #00FF00; display: block; }
`;
document.head.appendChild(style);

const container = document.getElementById('velocity-anchor');
container.innerHTML = `
    <div id="v-ui">
        <div class="v-label">SPEED ADJUST</div>
        <div class="v-controls">
            <button class="v-btn" id="v-down">−</button>
            <div id="v-display">
                <span id="v-val">POSTED</span>
                <span id="v-offset" class="v-subtext"></span>
            </div>
            <button class="v-btn" id="v-up">+</button>
        </div>
    </div>
`;

function update() {
    const valEl = document.getElementById('v-val');
    const offsetEl = document.getElementById('v-offset');
    
    if (speedOffset === 0) {
        valEl.innerText = "POSTED";
        offsetEl.innerText = "";
    } else {
        valEl.innerText = "OFFSET";
        offsetEl.innerText = (speedOffset > 0 ? "+" : "") + speedOffset + " km/h";
    }

    // Broadcast the offset to the system
    window.currentSpeedOffset = speedOffset;
    window.dispatchEvent(new Event('weong:update')); // Re-triggers route-engine calc
}

document.getElementById('v-up').onclick = () => { speedOffset += 5; update(); };
document.getElementById('v-down').onclick = () => { speedOffset -= 5; update(); };

// Set initial global state
window.currentSpeedOffset = 0;
