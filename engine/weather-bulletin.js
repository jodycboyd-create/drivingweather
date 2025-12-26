/**
 * weather-bulletin.js
 * Project: [weong-bulletin]
 */

export const BulletinLogic = {
    formatPOP(popValue, isExtendedRange) {
        if (popValue === null || popValue === undefined) return null;
        const roundedPop = Math.round(popValue / 10) * 10;

        // Rule: Omit < 30% for both short and extended range
        if (roundedPop < 30) return null;

        return `${roundedPop}%`;
    },

    checkException(elementLevels) {
        if (!elementLevels) return false;
        // Level 3 is the primary trigger
        return Object.values(elementLevels).some(level => level >= 3);
    },

    generate(community, weatherData) {
        const { pop, levels, uvIndex, isDaytime, range } = weatherData;
        const isExtended = range === 'extended';

        return {
            location: community.name, // Mapping community.name to 'location'
            pop: this.formatPOP(pop, isExtended),
            uvIndex: (!isExtended && isDaytime) ? uvIndex : null,
            isCritical: this.checkException(levels),
            timestamp: new Date().toLocaleTimeString('en-CA', { timeZone: 'America/St_Johns' })
        };
    }
};
