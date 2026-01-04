/**
 * PROJECT: [weong-route]
 * MODULE: optimize.js | L3 STABILITY PATCH 015
 * Feature: Compact Heat Ribbon + Fixed Interaction
 */

const OptimizeEngine = {
    containerId: "temporal-control-hub",
    currentOffset: 0,

    init() {
        this.injectUI();
        this.updateTimeline();
        this.setTime(0);
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        
        const html = `
            <div id="${this.containerId}" style="
                position: fixed; bottom: 20px; left: 20px;
                background: rgba(5, 5, 5, 0.9); border: 1px solid #333;
                border-left: 3px solid #00FFFF; padding: 8px; 
                border-radius: 2px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                font-family: 'Roboto Mono', monospace; z-index: 30000;
                width: 380px; pointer-events: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="color: #00FFFF; font-size: 9px; font-weight: 900; letter-spacing: 1px;">
                        48H PREDICTIVE HEAT RIBBON
                    </span>
                    <span id="active-lead-label" style="color: #FFD700; font-size: 9px; font-weight: bold;">
                        T+0
                    </span>
                </div>
                
                <div id="timeline-grid" style="
                    display: grid; 
                    grid-template-columns: repeat(24, 1fr); 
                    gap: 2px; 
                    height: 18px;
                "></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    updateTimeline() {
        const grid = document.getElementById("timeline-grid");
        if (!grid) return;

        grid.innerHTML = ""; // Clear for refresh

        for (let i = 0; i < 24; i++) {
            const leadTime = i * 2;
            const isSelected = this.currentOffset === leadTime;
            
            // Replicating Jan 4 Heatmap
            let heatColor = "#1B4332"; // Clear
            if (leadTime <= 8) heatColor = "#78291c"; // Hazard
            else if (leadTime <= 18) heatColor = "#7a6211"; // Caution

            if (isSelected) heatColor = (leadTime <= 8) ? "#e74c3c" : (leadTime <= 18) ? "#f1c40f" : "#2ecc71";

            const block = document.createElement('div');
            block.style.cssText = `
                background: ${heatColor}; 
                border: ${isSelected ? '1px solid #fff' : '1px solid rgba(255,255,255,0.05)'};
                cursor: pointer; transition: transform 0.1s;
                opacity: ${isSelected ? '1' : '0.6'};
            `;
            
            // FIXED INTERACTION: Direct Event Listener
            block.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.setTime(leadTime);
            });

            grid.appendChild(block);
        }
        document.getElementById("active-lead-label").innerText = `T+${this.currentOffset} HRS`;
    },

    setTime(hours) {
        this.currentOffset = hours;
        window.currentTemporalOffset = hours; 
        this.updateTimeline();

        // Broadcast to Road Analytics and Weather Matrix
        if (window.MetroTable) window.MetroTable.updateTable(hours);
        
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: hours, timestamp: new Date() } 
        }));
        
        console.log(`[SYSTEM] Temporal Shift: T+${hours} synced.`);
    }
};

OptimizeEngine.init();
