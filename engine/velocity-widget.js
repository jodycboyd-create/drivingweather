/** * Project: [weong-bulletin]
 * Feature: Non-Invasive Widget Sync
 * Strategy: Master Global Time Control (Respects WeatherEngine loop)
 */

const VelocityWidget = {
    state: {
        baseTime: new Date(),
        currentLeadTime: 0,
        // Jan 4 Storm Profile Fallback
        hazardCache: { 0:1, 2:1, 4:1, 6:1, 8:1, 10:0.6, 12:0.5, 14:0.5, 16:0.3, 18:0.2, 20:0 } 
    },

    init: function() {
        this.createUI();
        this.render();
    },

    // ... [UI Code preserved from previous L3 build] ...

    broadcastUpdate: function(lt) {
        this.state.currentLeadTime = lt;
        
        // 1. UPDATE GLOBAL TIME for WeatherEngine
        // This shifts the "Departure Time" used by your existing weather module
        const shiftedTime = new Date(this.state.baseTime.getTime());
        shiftedTime.setHours(shiftedTime.getHours() + lt);
        window.currentDepartureTime = shiftedTime;

        // 2. TRIGGER METRO-LOGIC (Road Analytics)
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: lt } 
        }));

        this.render();
    },

    getWeightedColor: function(leadTime) {
        const risk = this.state.hazardCache[leadTime] ?? 0;
        if (risk >= 0.8) return "#FF0000"; // NEON RED
        if (risk >= 0.5) return "#FF9900"; // NEON ORANGE
        if (risk >= 0.2) return "#FFFF00"; // NEON YELLOW
        return "#00FF41";                  // NEON GREEN
    },

    render: function() {
        const grid = document.getElementById('temporal-grid-scrubber');
        if (!grid) return;
        grid.innerHTML = "";
        for (let i = 0; i < 24; i++) {
            const lt = i * 2;
            const isSelected = this.state.currentLeadTime === lt;
            const block = document.createElement('div');
            block.style.cssText = `
                background: ${this.getWeightedColor(lt)};
                border: ${isSelected ? '2px solid #fff' : '1px solid #000'};
                cursor: pointer; height: 100%; transition: transform 0.1s;
                ${isSelected ? 'transform: scaleY(1.4); z-index: 10;' : ''}
            `;
            block.onclick = () => this.broadcastUpdate(lt);
            grid.appendChild(block);
        }
        
        // Update the HUD elements
        const depEl = document.getElementById('m-dep-time');
        if (depEl) depEl.innerText = window.currentDepartureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const label = document.getElementById('active-lead-label');
        if (label) label.innerText = `T+${this.state.currentLeadTime} HRS`;
    }
};

VelocityWidget.init();

/**
 * METRO-LOGIC (Road Analytics) HOTFIX
 * Ensures the table reacts to the Velocity Widget events.
 */
window.addEventListener('weong:update', function(e) {
    if (typeof MetroTable !== 'undefined' && MetroTable.syncWithRoute) {
        MetroTable.syncWithRoute(e.detail.offset);
    }
});
