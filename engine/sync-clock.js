/** * Project: [weong-route] | MODULE: sync-clock.js
 * Feature: Global Master Clock HUD
 */

const MasterClock = {
    id: "master-temporal-hud",

    init() {
        if (document.getElementById(this.id)) return;
        this.injectUI();
        this.update(0);
    },

    injectUI() {
        const html = `
            <div id="${this.id}" style="
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                z-index: 2000; background: rgba(5, 5, 5, 0.9); border: 1px solid #00FFFF;
                padding: 8px 20px; border-radius: 50px; color: #00FFFF;
                font-family: 'Roboto Mono', monospace; font-size: 12px; font-weight: 900;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.3); pointer-events: none;
                display: flex; align-items: center; gap: 15px; letter-spacing: 1px;
            ">
                <span style="font-size: 8px; color: #444;">ACTIVE_WINDOW:</span>
                <span id="master-clock-date" style="color: #FFF;">---</span>
                <span id="master-clock-time" style="color: #00FFFF;">00:00</span>
                <div id="sync-pulse" style="width: 8px; height: 8px; border-radius: 50%; background: #00FF00; box-shadow: 0 0 5px #00FF00;"></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    update(offset) {
        const target = new Date(Date.now() + offset * 3600000);
        const dateStr = target.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
        const hour = target.getHours() % 12 || 12;
        const ampm = target.getHours() >= 12 ? 'PM' : 'AM';
        
        document.getElementById('master-clock-date').innerText = dateStr.toUpperCase();
        document.getElementById('master-clock-time').innerText = `${hour}:00 ${ampm}`;
        
        // Brief pulse effect on update
        const pulse = document.getElementById('sync-pulse');
        pulse.style.background = "#FFF";
        setTimeout(() => pulse.style.background = "#00FF00", 300);
    }
};

/** * INTEGRATION: Hooking MasterClock into the Optimizer shift logic
 */
if (window.Optimizer) {
    const prevShift = Optimizer.shiftTime;
    Optimizer.shiftTime = function(hours, target) {
        prevShift.call(this, hours, target);
        MasterClock.update(parseInt(hours));
    };
}

MasterClock.init();
