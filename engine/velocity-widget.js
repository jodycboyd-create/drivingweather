/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Velocity-Weather Handshake (Self-Injecting)
 */
const VelocityWidget = (function() {
    const state = {
        baseSpeed: 100, 
        offset: 0,
        departureTime: new Date()
    };

    const init = () => {
        // 1. Create and Inject the UI first
        createUI();
        
        // 2. Initialize global state for the engines
        window.currentCruisingSpeed = state.baseSpeed;
        window.currentDepartureTime = state.departureTime;
        
        // 3. Bind listeners to the newly created elements
        setupListeners();
        render();
    };

    const createUI = () => {
        // Prevents duplicate injection if init is called twice
        if (document.getElementById('velocity-anchor')) return;

        const html = `
            <div id="velocity-anchor" style="position:fixed; bottom:20px; right:20px; z-index:99999; font-family:monospace; pointer-events:auto;">
                <div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; padding:12px; color:#FFD700; box-shadow:0 0 15px rgba(0,0,0,0.5); min-width:160px;">
                    <div style="font-size:9px; letter-spacing:1px; margin-bottom:4px; opacity:0.8;">VELOCITY ENGINE</div>
                    <div class="speed-value" style="font-size:22px; font-weight:bold; margin-bottom:2px;">100 KM/H</div>
                    <div class="time-value" style="font-size:12px; margin-bottom:10px;">--:-- --</div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                        <button id="speed-minus" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">SPD -</button>
                        <button id="speed-plus" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">SPD +</button>
                        <button id="time-minus" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">TIME -</button>
                        <button id="time-plus" style="background:#222; color:#FFD700; border:1px solid #FFD700; cursor:pointer;">TIME +</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    const render = () => {
        const speed = state.baseSpeed + state.offset;
        const timeStr = state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        document.querySelector('.speed-value').innerText = `${speed} KM/H`;
        document.querySelector('.time-value').innerText = timeStr;

        // Signal the Weather Engine to update
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { speed: speed, departure: state.departureTime } 
        }));
    };

    const setupListeners = () => {
        const handle = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);

        handle('time-plus', () => {
            state.departureTime.setMinutes(state.departureTime.getMinutes() + 15);
            window.currentDepartureTime = state.departureTime;
            render();
        });
        handle('time-minus', () => {
            state.departureTime.setMinutes(state.departureTime.getMinutes() - 15);
            window.currentDepartureTime = state.departureTime;
            render();
        });
        handle('speed-plus', () => {
            state.offset += 5;
            window.currentCruisingSpeed = state.baseSpeed + state.offset;
            render();
        });
        handle('speed-minus', () => {
            state.offset -= 5;
            window.currentCruisingSpeed = state.baseSpeed + state.offset;
            render();
        });
    };

    return { init };
})();

// Start the widget
VelocityWidget.init();
