// weather-bulletin.js - Logic for [weong-bulletin]
export const BulletinLogic = {
    // Rule: POPs reported to the nearest 10%
    formatPOP(pop, isExtendedRange) {
        const rounded = Math.round(pop / 10) * 10;
        
        // Rule: Under 30% omitted from extended range
        if (isExtendedRange && rounded < 30) return null;
        
        // Rule: Short range follows pubpro rules (under 30% omitted)
        if (!isExtendedRange && rounded < 30) return null;

        return `${rounded}%`;
    },

    // Rule: Level 3 is the primary exception trigger
    checkException(data) {
        // Checks all elements for Level 3 severity
        return Object.values(data.levels).some(level => level >= 3);
    },

    generateReport(community, weather) {
        const isExtended = weather.range === 'extended';
        const hasException = this.checkException(weather);

        return {
            location: community.name,
            pop: this.formatPOP(weather.pop, isExtended),
            // Rule: Add UV index to daytime periods in short range
            uvIndex: (!isExtended && weather.isDaytime) ? weather.uv : null,
            isAlert: hasException,
            timestamp: new Date().toISOString()
        };
    }
};
