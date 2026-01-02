/** * Project: [weong-route] | MODULE: optimize.js
 * Feature: UI Vertical Clearance & Pointer Restore
 */

Optimizer.injectUI = function(container) {
    const now = new Date();
    const timeLabels = Array(12).fill(0).map((_, i) => {
        const d = new Date(now.getTime() + (i * 4) * 3600000);
        return `<div style="width: calc(100% / 12); text-align:center; border-left:1px solid #222;">
                    <div style="font-size:7px; color:#444;">${d.toLocaleDateString('en-CA', { weekday: 'short' }).toUpperCase()}</div>
                    <div style="font-size:9px; color:#888;">${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'PM' : 'AM'}</div>
                </div>`;
    }).join('');

    // MODIFIED: Higher z-index and increased top margin to clear headers
    const html = `
        <div id="opt-heat-map" style="
            margin-top: 110px; 
            margin-bottom: 20px; 
            border-bottom: 1px solid #00FFFF; 
            padding-bottom: 10px; 
            position: relative;
            z-index: 10000;
            pointer-events: auto;
            background: rgba(0,0,0,0.8);
        ">
            <div style="display:flex; margin-bottom:4px; background:#000; border:1px solid #222;">${timeLabels}</div>
            <div id="heat-grid" style="
                display:grid; grid-template-columns: repeat(24, 1fr); 
                gap:2px; height:45px; background:#111; 
                padding:4px; border:1px solid #333;
                cursor: pointer;
                pointer-events: all;
            ">
                ${Array(24).fill(0).map((_, i) => `<div class="heat-cell" data-h="${i*2}" style="background:#222; border:1px solid #111; pointer-events: all;"></div>`).join('')}
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:8px;">
                <span id="opt-consensus" style="color:#00FFFF; font-size:10px; font-weight:bold;">SYNCING GEOMET...</span>
                <span id="opt-count" style="color:#00FF00; font-size:10px;">STANDBY</span>
            </div>
        </div>`;

    // Prevent duplicates and re-inject
    if (document.getElementById('opt-heat-map')) document.getElementById('opt-heat-map').remove();
    container.children[0].insertAdjacentHTML('afterbegin', html);

    // Event Delegation with StopPropagation to prevent map clicks
    document.getElementById('heat-grid').addEventListener('click', (e) => {
        e.stopPropagation(); 
        const cell = e.target.closest('.heat-cell');
        if (cell && cell.dataset.h) {
            this.shiftTime(cell.dataset.h, cell);
        }
    }, true);
};
