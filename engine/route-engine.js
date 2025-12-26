/**
 * route-engine.js 
 * Project: [weong-route]
 * Updated: Dec 2025 - Path correction for /data/nl/
 */

export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        try {
            // Updated path to match your GitHub structure exactly
            const response = await fetch('data/nl/communities.json');
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            this.communities = await response.json();
            console.log("Newfoundland Dataset Loaded successfully.");
            return this.communities;
        } catch (error) {
            console.error("RouteEngine failed to load JSON:", error);
            return [];
        }
    }
}
