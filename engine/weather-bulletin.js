/**
 * weather-bulletin.js
 * Project: [weong-bulletin]
 */

export const BulletinLogic = {
    formatPOP(popValue) {
        if (popValue === null || popValue === undefined) return null;
        // Rule: Report to the nearest 10%
        const roundedPop = Math.round(popValue / 10) * 10;
        // Rule: POP < 30% omitted (PubPro/Extended rules)
        return roundedPop >= 30 ? `${roundedPop}%` : null;
    },

    checkException(levels) {
        if (!levels) return false;
        // Primary exception trigger: Level 3 for all elements
        return Object.values(levels).some(level => level >= 3);
    },

    generate(community, weatherData) {
        const { pop, levels, uvIndex, isDaytime } = weatherData;

        return {
            location: community.name, 
            pop: this.formatPOP(pop),
            // Rule: Add UV index to daytime periods
            uvIndex: isDaytime ? uvIndex : null,
            isCritical: this.checkException(levels),
            timestamp: new Date().toLocaleTimeString('en-CA', { 
                timeZone: 'America/St_Johns',
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
    }
};
