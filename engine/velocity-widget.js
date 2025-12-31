/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Velocity-Weather Handshake (Self-Injecting Fix)
 */
const VelocityWidget = (function() {
    const state = { baseSpeed: 100, offset: 0, departureTime: new Date() };

    const init = () => {
        if (!document.body) {
            setTimeout(init, 50); // Retry if body isn't ready
            return;
        }
        createUI();
        setupListeners();
        render(); // Initial draw
    };

    const createUI = () => {
        if (document.getElementById('velocity-anchor')) return;
        const html = `
            <div id="velocity-anchor" style="position:fixed; bottom:20px; right:20px; z-index:99999; font-family:monospace;">
                <div style="background:rgba(0,0,0,0.95); border:2px solid #FFD700; padding:12px; color:#FFD700; min-width:180px; box-shadow: 0 0 10px #000;">
                    <div style="font-size:10px; opacity:0.7;">CRUISING VELOCITY</div>
                    <div class="speed-value" style="font-size:24px; font-weight:bold;">100 KM/H</div>
                    <div class="time-value" style="font-size:14px; margin-bottom:10px;">--:--</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                        <button id="v-spd-minus" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">SPD -</button>
                        <button id="v-spd-plus" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">SPD +</button>
                        <button id="v-time-minus" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">TIME -</button>
                        <button id="v-time-plus" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">TIME +</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    const render = () => {
        const speed = state.baseSpeed + state.offset;
        const timeStr = state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Safety check to ensure DOM is ready
        const sEl = document.querySelector('.speed-value');
        const tEl = document.querySelector('.time-value');
        if (sEl) sEl.innerText = `${speed} KM/H`;
        if (tEl) tEl.innerText = timeStr;

        window.currentCruisingSpeed = speed;
        window.currentDepartureTime = state.departureTime;
        window.dispatchEvent(new CustomEvent('weong:update', { detail: { speed, time: state.departureTime } }));
    };

    const setupListeners = () => {
        document.getElementById('v-spd-plus')?.addEventListener('click', () => { state.offset += 5; render(); });
        document.getElementById('v-spd-minus')?.addEventListener('click', () => { state.offset -= 5; render(); });
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
