/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Velocity-Weather Handshake (Self-Injecting)
 * Methodology: Stealth-Sync Integration
 */

const VelocityWidget = (function() {
    const state = {
        baseSpeed: 100, 
        offset: 0,
        departureTime: new Date()
    };

    const init = () => {
        // Ensure DOM is ready for injection
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", injectAndStart);
        } else {
            injectAndStart();
        }
    };

    const injectAndStart = () => {
        createUI();
        syncGlobals();
        setupListeners();
        render();
    };

    const syncGlobals = () => {
        // Essential handshake variables for your WeatherEngine syncCycle
        window.currentCruisingSpeed = state.baseSpeed + state.offset;
        window.currentDepartureTime = state.departureTime;
    };

    const createUI = () => {
        if (document.getElementById('velocity-anchor')) return;

        const html = `
            <div id="velocity-anchor" style="position:fixed; bottom:20px; right:20px; z-index:99999; font-family:monospace;">
                <div style="background:rgba(0,0,0,0.9); border:2px solid #FFD700; padding:12px; color:#FFD700; box-shadow:0 0 20px #000; min-width:180px;">
                    <div style="font-size:9px; letter-spacing:1px; margin-bottom:5px; opacity:0.8; border-bottom:1px solid #333; padding-bottom:3px;">VELOCITY ENGINE</div>
                    <div class="v-speed-val" style="font-size:22px; font-weight:bold; margin-bottom:2px;">100 KM/H</div>
                    <div class="v-time-val" style="font-size:13px; margin-bottom:12px; color:#fff;">--:--</div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                        <button id="v-spd-minus" style="background:#000; color:#FFD700; border:1px solid #FFD700; cursor:pointer; font-weight:bold; padding:4px;">SPD -</button>
                        <button id="v-spd-plus" style="background:#000; color:#FFD700; border:1px solid #FFD700; cursor:pointer; font-weight:bold; padding:4px;">SPD +</button>
                        <button id="v-time-minus" style="background:#000; color:#FFD700; border:1px solid #FFD700; cursor:pointer; font-weight:bold; padding:4px;">TIME -</button>
                        <button id="v-time-plus" style="background:#000; color:#FFD700; border:1px solid #FFD700; cursor:pointer; font-weight:bold; padding:4px;">TIME +</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };

    const render = () => {
        const speed = state.baseSpeed + state.offset;
        const timeStr = state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const sEl = document.querySelector('.v-speed-val');
        const tEl = document.querySelector('.v-time-val');
        
        if (sEl) sEl.innerText = `${speed} KM/H`;
        if (tEl) tEl.innerText = timeStr;

        syncGlobals();

        // Forces your WeatherEngine syncCycle to trigger immediately
        // By clearing the anchorKey, we force the engine to re-render everything
        if (window.WeatherEngine) {
            // Note: Since WeatherEngine doesn't expose state, we rely on the 1000ms interval 
            // to pick up the global window changes we just made.
        }
    };

    const setupListeners = () => {
        const handle = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);

        handle('v-spd-plus', () => { state.offset += 10; render(); });
        handle('v-spd-minus', () => { state.offset -= 10; render(); });
        handle('v-time-plus', () => { 
            state.departureTime = new Date(state.departureTime.getTime() + 30 * 60000); 
            render(); 
        });
        handle('v-time-minus', () => { 
            state.departureTime = new Date(state.departureTime.getTime() - 30 * 60000); 
            render(); 
        });
    };

    return { init };
})();

VelocityWidget.init();
