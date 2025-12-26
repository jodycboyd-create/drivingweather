/**
 * route-engine.js 
 * Project: [weong-route]
 * Purpose: Manages the Newfoundland geographic dataset.
 */

export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        try {
            // Path tailored to your GitHub structure: data/nl/communities.json
            const response = await fetch('./data/nl/communities.json');
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            this.communities = await response.json();
            console.log("Newfoundland Dataset Locked and Loaded.");
            return this.communities;
        } catch (error) {
            console.error("RouteEngine Error:", error);
            return [];
        }
    }
}
