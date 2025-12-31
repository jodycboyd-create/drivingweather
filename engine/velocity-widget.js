/** * Project: [weong-route] + [weong-bulletin]
 * Status: L3 Velocity-Weather Handshake [cite: 2025-12-30]
 */

const VelocityWidget = (function() {
    const state = {
        baseSpeed: 100, // km/h
        offset: 0,
        departureTime: new Date()
    };

    const init = () => {
        // Expose state globally for engines to read
        window.currentCruisingSpeed = state.baseSpeed;
        window.currentDepartureTime = state.departureTime;
        
        render();
        setupListeners();
    };

    const render = () => {
        const speed = state.baseSpeed + state.offset;
        const timeStr = state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Update the UI display based on your established aesthetic
        const speedEl = document.querySelector('.speed-value'); // Ensure these classes exist in your HTML
        const timeEl = document.querySelector('.time-value');
        
        if (speedEl) speedEl.innerText = `${speed} KM/H`;
        if (timeEl) timeEl.innerText = timeStr;

        // Trigger engines to recalculate
        window.dispatchEvent(new Event('weong:update'));
    };

    const setupListeners = () => {
        // Example for Departure Window adjustment
        document.getElementById('time-plus')?.addEventListener('click', () => {
            state.departureTime.setMinutes(state.departureTime.getMinutes() + 15);
            window.currentDepartureTime = state.departureTime;
            render();
        });

        document.getElementById('speed-plus')?.addEventListener('click', () => {
            state.offset += 5;
            window.currentCruisingSpeed = state.baseSpeed + state.offset;
            render();
        });
        
        // Add corresponding minus listeners here...
    };

    return { init };
})();

VelocityWidget.init();
