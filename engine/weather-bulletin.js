/**
 * weather-bulletin.js
 * Project: [weong-bulletin]
 * Rules: 
 * - POP rounded to nearest 10%
 * - Omit POP < 30% in extended range
 * - Short range follows PubPro rules for POP < 30%
 * - UV Index included in short-range daytime periods
 * - Primary Exception Trigger: Level 3 for all elements
 */

export const BulletinLogic = {
    /**
     * Formats Probability of Precipitation based on project constraints.
     */
    formatPOP(popValue, isExtendedRange) {
        if (popValue === null || popValue === undefined) return null;

        // Rule: Report to the nearest 10%
        const roundedPop = Math.round(popValue / 10) * 10;

        // Rule: Under 30% omitted from extended range
        if (isExtendedRange && roundedPop < 30) {
            return null;
        }

        // Rule: Short range follows pubpro rules (POP < 30% omitted)
        if (!isExtendedRange && roundedPop < 30) {
            return null;
        }

        return `${roundedPop}%`;
    },

    /**
     * Checks for Level 3 exception triggers across all weather elements.
     */
    checkException(elementLevels) {
        if (!elementLevels) return false;
        // Primary exception trigger: Level 3 for all elements
        return Object.values(elementLevels).some(level => level >= 3);
    },

    /**
     * Generates the final bulletin object for a community.
     */
    generate(community, weatherData) {
        const { pop, levels, uvIndex, isDaytime, range } = weatherData;
        const isExtended = range === 'extended';

        return {
            location: community.name,
            pop: this.formatPOP(pop, isExtended),
            // Rule: Add UV index to daytime periods in short range logic
            uvIndex: (!isExtended && isDaytime) ? uvIndex : null,
            isCritical: this.checkException(levels),
            timestamp: new Date().toLocaleTimeString('en-CA', { timeZone: 'America/St_Johns' })
        };
    }
};
