export class RouteEngine {
    constructor() {
        this.communities = [];
    }

    async loadCommunities() {
        try {
            // Path relative to index.html sitting in the root
            const response = await fetch('data/nl/communities.json');
            if (!response.ok) {
                throw new Error(`Failed to load JSON: ${response.status}`);
            }
            this.communities = await response.json();
            console.log("Newfoundland communities loaded successfully.");
            return this.communities;
        } catch (error) {
            console.error("RouteEngine Fetch Error:", error);
            return [];
        }
    }
}
