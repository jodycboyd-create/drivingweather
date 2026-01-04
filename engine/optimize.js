/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * FEATURE: 48-Hour Linear Timeline (Single Row)
 * STATUS: System Master Control - Jan 4 Sync
 */

const OptimizeEngine = {
    containerId: "temporal-control-hub",
    currentOffset: 0,

    init() {
        console.log("[OPTIMIZE] 48H Linear Scrubber Initialized.");
        this.injectUI();
        this.makeMovable();
        this.updateTimeline();
        this.setTime(0);
    },

    injectUI() {
        if (document.getElementById(this.containerId)) return;
        
        // Using width: 850px to fit all 24 boxes in one row comfortably
        const html = `
            <div id="${this.containerId}" style="
                position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                background: rgba(5, 5, 5, 0.95); border: 1px solid #333;
                border-top: 3px solid #00FFFF; padding: 10px 15px; 
                border-radius: 4px; box-shadow: 0 10px 50px rgba(0,0,0,0.9);
                font-family: 'Roboto Mono', monospace; z-index: 20000;
                width: 900px; pointer-events: auto; cursor: grab;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="color: #00FFFF; font-size: 10px; font-weight: 900; letter-spacing: 2px;">
                        48H TEMPORAL PREDICTIVE MATRIX
                    </span>
                    <span id="active-lead-label" style="color: #FFD700; font-size: 11px; font-weight: bold; background: rgba(255,215,0,0.1); padding: 2px 8px; border-radius: 3px;">
                        T+0 HRS
                    </span>
                </div>
                
                <div id="timeline-grid" style="
                    display: grid; 
                    grid-template-columns: repeat(24, 1fr); 
                    gap: 3px; 
                    pointer-events: auto;
                "></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    updateTimeline() {
        const grid = document.getElementById("timeline-grid");
        if (!grid) return;

        let boxes = "";
        for (let i = 0; i < 24; i++) {
            const leadTime = i * 2;
            const isSelected = this.currentOffset === leadTime;
            
            // Heat scale matching the Jan 4 storm profile
            let heatColor = "#2ecc71"; // Clear
            if (leadTime <= 8) heatColor = "#e74c3c"; // Icing Alert (-10.9°C)
            else if (leadTime <= 18) heatColor = "#f1c40f"; // Slush/Caution

            // Fix: Explicitly setting z-index and pointer-events on each block 
            // to ensure they aren't blocked by the parent's drag listener.
            boxes += `
                <div onclick="event.stopPropagation(); OptimizeEngine.setTime(${leadTime})" style="
                    height: 32px; background: ${heatColor}; 
                    border: ${isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)'};
                    opacity: ${isSelected ? '1' : '0.4'};
                    cursor: pointer; display: flex; align-items: center; 
                    justify-content: center; font-size: 9px; font-weight: 900;
                    color: #000; transition: all 0.15s ease;
                    pointer-events: auto;
                    position: relative;
                    z-index: 20001;
                " class="timeline-block">
                    ${leadTime}
                </div>`;
        }
        grid.innerHTML = boxes;
        document.getElementById("active-lead-label").innerText = `T+${this.currentOffset} HRS`;
    },

    setTime(hours) {
        this.currentOffset = hours;
        window.currentTemporalOffset = hours; 
        
        this.updateTimeline();

        // 1. Refresh Road Analytics (MetroTable)
        if (window.MetroTable && typeof window.MetroTable.updateTable === 'function') {
            window.MetroTable.updateTable(hours);
        }

        // 2. Refresh Weather Engine (Map Pins & Mission Matrix)
        window.dispatchEvent(new CustomEvent('weong:update', { 
            detail: { offset: hours } 
        }));
        
        console.log(`[SYSTEM] Temporal Sync: T+${hours} activated.`);
    },

    makeMovable() {
        const el = document.getElementById(this.containerId);
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        
        el.onmousedown = (e) => {
            // Prevent dragging if clicking a timeline block
            if (e.target.classList.contains('timeline-block')) return;
            
            p3 = e.clientX; p4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                p1 = p3 - e.clientX; p2 = p4 - e.clientY;
                p3 = e.clientX; p4 = e.clientY;
                el.style.top = (el.offsetTop - p2) + "px";
                el.style.left = (el.offsetLeft - p1 + (el.offsetWidth/2)) + "px"; // Maintain center-alignment logic
                el.style.bottom = "auto";
                el.style.transform = "translateX(-50%)";
            };
        };
    }
};

setTimeout(() => OptimizeEngine.init(), 500);
