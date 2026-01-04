/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * FEATURE: 48-Hour Lead-Time Controller (2-hour increments)
 * STATUS: System Master Control - Jan 4 Baseline
 */

const OptimizeEngine = {
    containerId: "temporal-control-hub",
    currentOffset: 0, // Hours from departure

    init() {
        console.log("[OPTIMIZE] 48-Hour Temporal Controller Active.");
        this.injectUI();
        this.makeMovable();
        this.updateTimeline();
        
        // Ensure initial sync with other engines
        this.setTime(0);
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        
        const html = `
            <div id="${this.containerId}" style="
                position: fixed; bottom: 120px; right: 30px; 
                background: rgba(5, 5, 5, 0.95); border: 1px solid #333;
                border-top: 3px solid #00FFFF; padding: 12px; 
                border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.9);
                font-family: 'Roboto Mono', monospace; z-index: 10005;
                width: 340px; pointer-events: auto; cursor: grab;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #222; padding-bottom: 5px;">
                    <span style="color: #00FFFF; font-size: 10px; font-weight: 900; letter-spacing: 1.5px;">
                        48H PREDICTIVE TIMELINE
                    </span>
                    <span id="active-lead-label" style="color: #FFD700; font-size: 10px; font-weight: bold;">T+0 HRS</span>
                </div>
                <div id="timeline-grid" style="
                    display: grid; grid-template-columns: repeat(6, 1fr); 
                    gap: 5px; margin-bottom: 10px;
                "></div>
                <div style="font-size: 8px; color: #444; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                    Click block to shift fleet temporal state
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    /**
     * GENERATE 24 BLOCKS (T+0 to T+46)
     * Heat scale reflects Jan 4 storm progression
     */
    updateTimeline() {
        const grid = document.getElementById("timeline-grid");
        if (!grid) return;

        let boxes = "";
        for (let i = 0; i < 24; i++) {
            const leadTime = i * 2;
            const isSelected = this.currentOffset === leadTime;
            
            // DYNAMIC COLOR SCALE:
            // Red (Critical/Icing) -> Yellow (Caution) -> Green (Clearance)
            let heatColor = "#2ecc71"; // Green (Clear)
            if (leadTime <= 8) heatColor = "#e74c3c"; // Red (L3 Alert - Corner Brook Ice)
            else if (leadTime <= 20) heatColor = "#f1c40f"; // Yellow (Slush/Caution)

            boxes += `
                <div onclick="OptimizeEngine.setTime(${leadTime})" style="
                    height: 28px; background: ${heatColor}; 
                    border: ${isSelected ? '2px solid #00FFFF' : '1px solid rgba(0,0,0,0.5)'};
                    opacity: ${isSelected ? '1' : '0.4'};
                    cursor: pointer; display: flex; align-items: center; 
                    justify-content: center; font-size: 9px; font-weight: 900;
                    color: #000; border-radius: 2px; transition: transform 0.1s, opacity 0.2s;
                    ${isSelected ? 'transform: scale(1.05);' : ''}
                " onmouseover="this.style.opacity='0.8'" onmouseout="if(!${isSelected}) this.style.opacity='0.4'">
                    ${leadTime}h
                </div>`;
        }
        grid.innerHTML = boxes;
        document.getElementById("active-lead-label").innerText = `T+${this.currentOffset} HRS`;
    },

    /**
     * GLOBAL SYSTEM SYNC
     * Broadcasts the offset to all other modules
     */
    setTime(hours) {
        this.currentOffset = hours;
        window.currentTemporalOffset = hours; 
        
        this.updateTimeline();

        // Trigger Road Analytics (MetroTable) if present
        if (window.MetroTable && typeof window.MetroTable.updateTable === 'function') {
            window.MetroTable.updateTable(hours);
        }

        // Trigger Weather Engine & Map Icon refresh
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: hours, timestamp: new Date() } 
        }));
        
        console.log(`[SYSTEM] Temporal Shift: T+${hours}h synchronized.`);
    },

    makeMovable() {
        const el = document.getElementById(this.containerId);
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        el.onmousedown = (e) => {
            if (e.target.hasAttribute('onclick')) return;
            p3 = e.clientX; p4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                p1 = p3 - e.clientX; p2 = p4 - e.clientY;
                p3 = e.clientX; p4 = e.clientY;
                el.style.top = (el.offsetTop - p2) + "px";
                el.style.left = (el.offsetLeft - p1) + "px";
                el.style.bottom = "auto";
            };
        };
    }
};

// Auto-boot sequence
setTimeout(() => OptimizeEngine.init(), 800);
