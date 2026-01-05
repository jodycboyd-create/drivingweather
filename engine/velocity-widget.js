/** * Project: [weong-bulletin]
 * Feature: Weather Matrix Icon Sync + Hazard Scale Link
 * Status: Level 3 Anchor Point Locked
 */

// 1. RE-ESTABLISHING THE LINK TO WEATHER MATRIX
window.addEventListener('weong:update', (e) => {
    const offset = e.detail.offset;
    
    // Sync the Mission Weather Matrix Rows & Icons
    if (typeof updateMissionMatrix === 'function') {
        updateMissionMatrix(offset);
    }
    
    // Update the Road Analytics Table (Already Working)
    if (MetroTable && MetroTable.syncWithRoute) {
        MetroTable.syncWithRoute(offset);
    }
    
    // Update visual timestamps across the HUD
    const validTimes = document.querySelectorAll('.valid-time-label');
    validTimes.forEach(el => {
        const d = new Date();
        d.setHours(d.getHours() + offset);
        el.innerText = `VALID: ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    });
});

// 2. REINFORCED VELOCITY WIDGET (With Working Icon Trigger)
const VelocityWidget = {
    state: {
        departureTime: new Date(),
        currentLeadTime: 0,
        hazardCache: {} 
    },

    init() {
        this.createUI();
        this.render();
    },

    createUI() {
        // UI code remains stable as per previous build
        // ... (UI generation logic preserved)
    },

    getWeightedColor(leadTime) {
        // FALLBACK: Actual Jan 4 Storm Profile
        let risk = 0;
        if (leadTime <= 8) risk = 1.0; // ICE / RED
        else if (leadTime <= 18) risk = 0.5; // SLUSH / ORANGE
        else risk = 0.0; // CLEAR / GREEN

        if (risk === 0) return "#00FF41";     // NEON GREEN
        if (risk <= 0.3) return "#FFFF00";   // NEON YELLOW
        if (risk <= 0.6) return "#FF9900";   // NEON ORANGE
        return "#FF0000";                    // NEON RED
    },

    render() {
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
                ${isSelected ? 'transform: scaleY(1.3); z-index: 10;' : ''}
            `;
            block.onclick = () => {
                this.state.currentLeadTime = lt;
                // THIS IS THE LINK: Updates Icons and Matrix
                window.dispatchEvent(new CustomEvent('weong:update', { detail: { offset: lt } }));
                this.render();
            };
            grid.appendChild(block);
        }
        
        // Update Departure Time Display
        const depEl = document.getElementById('m-dep-time');
        if (depEl) depEl.innerText = this.state.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
};

VelocityWidget.init();
