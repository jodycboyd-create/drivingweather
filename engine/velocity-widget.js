/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Force-Display Build
 * Fix: Forced Root Injection + Z-Index Override
 */
const VelocityWidget = (function() {
    const state = { baseSpeed: 100, offset: 0, departureTime: new Date() };

    const init = () => {
        // Use a recursive check to ensure body is ready
        const checker = setInterval(() => {
            if (document.body) {
                clearInterval(checker);
                createUI();
            }
        }, 100);
    };

    const createUI = () => {
        if (document.getElementById('velocity-anchor')) return;
        
        const container = document.createElement('div');
        container.id = 'velocity-anchor';
        // Extreme Z-index and forced visibility
        container.style.cssText = `
            position: fixed !important;
            bottom: 30px !important;
            right: 30px !important;
            z-index: 2147483647 !important; 
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            font-family: monospace;
        `;
        
        container.innerHTML = `
            <div style="background:rgba(0,0,0,0.95); border:2px solid #FFD700; padding:15px; color:#FFD700; min-width:200px; box-shadow: 0 0 25px #000; border-radius:4px;">
                <div style="font-size:10px; opacity:0.7; letter-spacing:1px; border-bottom:1px solid #333; margin-bottom:8px; padding-bottom:4px;">CRUISING VELOCITY</div>
                <div class="v-speed-val" style="font-size:26px; font-weight:bold; margin-bottom:2px;">100 KM/H</div>
                <div class="v-time-val" style="font-size:14px; margin-bottom:12px; color:#fff;">--:--</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    <button id="v-spd-minus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold;">SPD -</button>
                    <button id="v-spd-plus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold;">SPD +</button>
                    <button id="v-time-minus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold;">TIME -</button>
                    <button id="v-time-plus" style="background:#111; color:#FFD700; border:1px solid #FFD700; cursor:pointer; padding:8px; font-weight:bold;">TIME +</button>
                </div>
            </div>`;
            
        document.body.appendChild(container);
        setupListeners();
        render();
    };

    const render = () => {
        const speed = state.baseSpeed + state.offset;
        const timeStr = state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const sEl = document.querySelector('.v-speed-val');
        const tEl = document.querySelector('.v-time-val');
        if (sEl) sEl.innerText = `${speed} KM/H`;
        if (tEl) tEl.innerText = timeStr;

        window.currentCruisingSpeed = speed;
        window.currentDepartureTime = state.departureTime;
    };

    const setupListeners = () => {
        document.getElementById('v-spd-plus')?.addEventListener('click', () => { state.offset += 10; render(); });
        document.getElementById('v-spd-minus')?.addEventListener('click', () => { state.offset -= 10; render(); });
        document.getElementById('v-time-plus')?.addEventListener('click', () => { 
            state.departureTime = new Date(state.departureTime.getTime() + 15 * 60000); 
            render(); 
        });
        document.getElementById('v-time-minus')?.addEventListener('click', () => { 
            state.departureTime = new Date(state.departureTime.getTime() - 15 * 60000); 
            render(); 
        });
    };

    return { init };
})();

VelocityWidget.init();
