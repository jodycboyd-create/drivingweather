export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        try {
            // Path relative to index.html
            const response = await fetch('./data/nl/communities.json');
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            this.communities = await response.json();
            console.log("Newfoundland Dataset Locked.");
            return this.communities;
        } catch (error) {
            console.error("RouteEngine Error:", error);
            return [];
        }
    }
}
