/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Velocity-Weather Handshake [FIXED]
 */
const VelocityWidget = (function() {
    const state = {
        baseSpeed: 100, 
        offset: 0,
        departureTime: new Date()
    };

    const init = () => {
        window.currentCruisingSpeed = state.baseSpeed;
        window.currentDepartureTime = state.departureTime;
        render();
        setupListeners();
    };

    const render = () => {
        const speed = state.baseSpeed + state.offset;
        const timeStr = state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const speedEl = document.querySelector('.speed-value');
        const timeEl = document.querySelector('.time-value');
        
        if (speedEl) speedEl.innerText = `${speed} KM/H`;
        if (timeEl) timeEl.innerText = timeStr;

        // CRITICAL FIX: Use CustomEvent to pass the speed/time data directly
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { speed: speed, departure: state.departureTime } 
        }));
    };

    const setupListeners = () => {
        // Time Plus/Minus
        document.getElementById('time-plus')?.addEventListener('click', () => {
            state.departureTime.setMinutes(state.departureTime.getMinutes() + 15);
            window.currentDepartureTime = state.departureTime;
            render();
        });
        document.getElementById('time-minus')?.addEventListener('click', () => {
            state.departureTime.setMinutes(state.departureTime.getMinutes() - 15);
            window.currentDepartureTime = state.departureTime;
            render();
        });

        // Speed Plus/Minus
        document.getElementById('speed-plus')?.addEventListener('click', () => {
            state.offset += 5;
            window.currentCruisingSpeed = state.baseSpeed + state.offset;
            render();
        });
        document.getElementById('speed-minus')?.addEventListener('click', () => {
            state.offset -= 5;
            window.currentCruisingSpeed = state.baseSpeed + state.offset;
            render();
        });
    };

    return { init };
})();
VelocityWidget.init();
