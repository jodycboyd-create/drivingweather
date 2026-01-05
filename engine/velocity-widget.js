/** * Project: [weong-bulletin]
 * Version: L3_FINAL_SYNC_002 (HOTFIX)
 * Fix: TypeError on 'offset' + Reinstated Icon Sync
 */

const VelocityWidget = {
    state: {
        departureTime: new Date(),
        currentLeadTime: 0,
        // Jan 4 Storm Profile Fallback
        hazardCache: { 0:1, 2:1, 4:1, 6:1, 8:1, 10:0.6, 12:0.5, 14:0.5, 16:0.3, 18:0.2, 20:0 } 
    },

    init() {
        this.createUI();
        this.render();
        // Initial sync trigger with safety check for 'offset'
        this.triggerUpdate(0);
    },

    triggerUpdate(lt) {
        this.state.currentLeadTime = lt;
        const updateEvent = new CustomEvent('weong:update', { 
            detail: { offset: lt } // Explicitly defining offset
        });
        window.dispatchEvent(updateEvent);
        this.render();
    },

    getWeightedColor(leadTime) {
        const risk = this.state.hazardCache[leadTime] ?? 0;
        // BRIGHT NEON SCALE
        if (risk >= 0.8) return "#FF0000"; // NEON RED (Ice/Packed)
        if (risk >= 0.5) return "#FF9900"; // NEON ORANGE (Slush/Wet)
        if (risk >= 0.2) return "#FFFF00"; // NEON YELLOW (Trace)
        return "#00FF41";                  // NEON GREEN (Dry/Clear)
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
                ${isSelected ? 'transform: scaleY(1.3);' : 'opacity: 0.8;'}
            `;
            block.onclick = () => this.triggerUpdate(lt);
            grid.appendChild(block);
        }
    }
};

// GLOBAL LISTENER: Links Hazard Scale to Weather Matrix & Icons
window.addEventListener('weong:update', (e) => {
    // Safety check to prevent the TypeError seen in build 001
    if (!e.detail || typeof e.detail.offset === 'undefined') return;
    
    const offset = e.detail.offset;
    console.log(`[RWIS] Temporal Sync: +${offset}H`);

    // 1. Sync Weather Matrix Icons
    if (typeof updateMissionMatrix === 'function') {
        updateMissionMatrix(offset);
    }

    // 2. Sync Road Analytics Table
    if (typeof MetroTable !== 'undefined' && MetroTable.syncWithRoute) {
        MetroTable.syncWithRoute(offset);
    }
});

VelocityWidget.init();
