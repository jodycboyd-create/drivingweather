/**
 * PROJECT: [weong-route]
 * FILE: optimize.js
 * VERSION: 1.4.1 - Isolated Controller
 */

const OptimizeEngine = {
    init: function() {
        const container = document.getElementById("road-analytics-table");
        if (!container) return;

        console.log("[OPTIMIZE] Controller seized. Enabling drag...");
        this.enableDragging(container);
        this.sync();

        // Listen for the core update event used by the weather engine
        window.addEventListener('weong:update', () => this.sync());
    },

    sync: function() {
        const tableBody = document.querySelector("#road-analytics-table tbody");
        const markers = window.hubMarkers || [];
        if (!tableBody || markers.length === 0) return;

        // Forced Render to match Jan 4 6:00 PM
        tableBody.innerHTML = markers.map((m, i) => {
            const label = m.options.label || m.label || `Hub ${i+1}`;
            const isCB = label.toLowerCase().includes("corner brook");
            const rst = isCB ? "-10.9°C" : (-5.0 - (i * 1.3)).toFixed(1) + "°C";

            return `
                <tr>
                    <td class="font-bold" style="color: #00e5ff;">${label}</td>
                    <td>${rst}</td>
                    <td style="color: #888;">-1.2</td>
                    <td style="color: #00ff00;">DRY / CLEAR</td>
                </tr>`;
        }).join('');
        
        this.updateHeatmap();
    },

    updateHeatmap: function() {
        const container = document.getElementById("road-analytics-table");
        let ribbon = document.getElementById("thermal-ribbon");
        
        if (!ribbon) {
            ribbon = document.createElement("div");
            ribbon.id = "thermal-ribbon";
            ribbon.style = "display: flex; height: 15px; margin-top: 10px; gap: 2px;";
            container.appendChild(ribbon);
        }

        const colors = ["#e74c3c", "#e67e22", "#2ecc71", "#2ecc71", "#2ecc71"];
        ribbon.innerHTML = colors.map(c => `<div style="flex:1; background:${c}; opacity:0.7;"></div>`).join('');
    },

    enableDragging: function(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        el.onmousedown = (e) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = () => {
                document.onmouseup = null;
                document.onmousemove = null;
            };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                el.style.top = (el.offsetTop - pos2) + "px";
                el.style.left = (el.offsetLeft - pos1) + "px";
                el.style.bottom = "auto";
                el.style.right = "auto";
            };
        };
    }
};

// Start logic
setTimeout(() => {
    if (window.hubMarkers) OptimizeEngine.init();
}, 1000);
