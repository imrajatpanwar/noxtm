import crypto from 'crypto-js';

/**
 * Generate Gravatar URL from email address
 * Gravatar uses MD5 hash of lowercase, trimmed email
 * 
 * @param {string} email - Email address
 * @param {number} size - Image size (default 200px)
 * @param {string} defaultImage - Default image type (404, mp, identicon, monsterid, wavatar, retro, robohash, blank)
 * @returns {string} Gravatar URL
 */
export const getGravatarUrl = (email, size = 200, defaultImage = 'identicon') => {
    if (!email) return null;

    // Gravatar requires lowercase trimmed email
    const normalizedEmail = email.trim().toLowerCase();

    // Generate MD5 hash
    const hash = crypto.MD5(normalizedEmail).toString();

    // Build Gravatar URL
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
};

/**
 * Check if user has a custom Gravatar (not default)
 * @param {string} email - Email address
 * @returns {Promise<boolean>} True if user has custom Gravatar
 */
export const hasGravatar = async (email) => {
    if (!email) return false;

    try {
        const url = getGravatarUrl(email, 80, '404');
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok; // 200 = has custom gravatar, 404 = using default
    } catch (error) {
        console.error('Error checking Gravatar:', error);
        return false;
    }
};

/**
 * Get Gravatar profile URL
 * @param {string} email - Email address
 * @returns {string} Gravatar profile URL
 */
export const getGravatarProfileUrl = (email) => {
    if (!email) return 'https://gravatar.com';

    const normalizedEmail = email.trim().toLowerCase();
    const hash = crypto.MD5(normalizedEmail).toString();

    return `https://gravatar.com/${hash}`;
};

/**
 * Open Gravatar setup page
 * @param {string} email - Email address to pre-fill
 */
export const openGravatarSetup = (email) => {
    const baseUrl = 'https://gravatar.com';
    window.open(baseUrl, '_blank');
};
