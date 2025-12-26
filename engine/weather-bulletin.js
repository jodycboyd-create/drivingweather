export const BulletinLogic = {
    formatPOP(popValue) {
        if (popValue === null || popValue === undefined) return null;
        const roundedPop = Math.round(popValue / 10) * 10;
        return roundedPop >= 30 ? `${roundedPop}%` : null;
    },

    checkException(levels) {
        if (!levels) return false;
        return Object.values(levels).some(level => level >= 3);
    },

    generate(community, weatherData) {
        return {
            location: community.name,
            pop: this.formatPOP(weatherData.pop),
            uvIndex: weatherData.isDaytime ? weatherData.uvIndex : null,
            isCritical: this.checkException(weatherData.levels),
            timestamp: new Date().toLocaleTimeString('en-CA', { timeZone: 'America/St_Johns' })
        };
    }
};
