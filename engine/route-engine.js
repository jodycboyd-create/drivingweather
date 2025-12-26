/**
 * route-engine.js 
 * Project: [weong-route]
 * Purpose: Fetches the locked Newfoundland community dataset.
 */

export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        try {
            // Relative fetch: Looks for 'data' folder in the same root as index.html
            const response = await fetch('data/nl/communities.json');
            
            if (!response.ok) {
                throw new Error(`404: File not found at ${response.url}`);
            }
            
            const geoData = await response.json();
            
            // Extract the 'name' from the GeoJSON properties for the Bulletin logic
            this.communities = geoData.features.map(f => ({
                name: f.properties.name,
                region: f.properties.region
            }));

            console.log(`Success: ${this.communities.length} NL communities loaded.`);
            return this.communities;
        } catch (error) {
            console.error("RouteEngine Error:", error);
            const status = document.getElementById('status-msg');
            if (status) status.innerHTML = `<span style="color:red;">Error: ${error.message}</span>`;
            return [];
        }
    }
}
