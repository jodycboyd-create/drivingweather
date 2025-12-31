/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Velocity-Weather Handshake FINAL
 */

const VelocityWidget = (function() {
    const state = {
        baseSpeed: 100, 
        offset: 0,
        departureTime: new Date()
    };

    const init = () => {
        updateGlobals();
        render();
        setupListeners();
    };

    const updateGlobals = () => {
        window.currentCruisingSpeed = state.baseSpeed + state.offset;
        window.currentDepartureTime = new Date(state.departureTime); // Clone to prevent mutation refs
    };

    const render = () => {
        const speed = state.baseSpeed + state.offset;
        const timeStr = state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const speedEl = document.querySelector('.speed-value');
        const timeEl = document.querySelector('.time-value');
        
        if (speedEl) speedEl.innerText = `${speed} KM/H`;
        if (timeEl) timeEl.innerText = timeStr;

        window.dispatchEvent(new CustomEvent('weong:update', { detail: { speed, departure: state.departureTime }}));
    };

    const setupListeners = () => {
        // Time Controls
        document.getElementById('time-plus')?.addEventListener('click', () => {
            state.departureTime.setMinutes(state.departureTime.getMinutes() + 30);
            updateGlobals();
            render();
        });
        document.getElementById('time-minus')?.addEventListener('click', () => {
            state.departureTime.setMinutes(state.departureTime.getMinutes() - 30);
            updateGlobals();
            render();
        });

        // Speed Controls
        document.getElementById('speed-plus')?.addEventListener('click', () => {
            state.offset += 5;
            updateGlobals();
            render();
        });
        document.getElementById('speed-minus')?.addEventListener('click', () => {
            state.offset -= 5;
            if ((state.baseSpeed + state.offset) < 20) state.offset = -80; // Safety floor
            updateGlobals();
            render();
        });
    };

    return { init };
})();

VelocityWidget.init();
