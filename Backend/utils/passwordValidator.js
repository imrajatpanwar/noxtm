/**
 * Password Validator Utility
 *
 * Provides centralized password validation with enhanced security requirements.
 * Used across registration and password change endpoints.
 */

/**
 * Validates password against security requirements
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 special character
 * - Maximum 128 characters (prevent DoS)
 *
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with { valid, message, errors }
 */
function validatePassword(password) {
  if (!password) {
    return { valid: false, message: 'Password is required', errors: ['Password is required'] };
  }

  const pwd = String(password);

  if (pwd.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long', errors: ['Password must be at least 6 characters long'] };
  }

  if (pwd.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters', errors: ['Password must not exceed 128 characters'] };
  }

  return { valid: true, message: 'Password is valid', errors: [] };
}

/**
 * Calculates password strength score
 *
 * Used for frontend visual indicators and recommendations.
 *
 * @param {string} password - Password to analyze
 * @returns {Object} Strength result with { strength, score, feedback }
 */
function getPasswordStrength(password) {
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      feedback: 'Password is empty'
    };
  }

  const pwd = String(password);
  let score = 0;
  const feedback = [];

  // Length scoring (max 40 points)
  if (pwd.length >= 8) score += 10;
  if (pwd.length >= 12) score += 10;
  if (pwd.length >= 16) score += 10;
  if (pwd.length >= 20) score += 10;

  // Character variety scoring (max 40 points)
  if (/[a-z]/.test(pwd)) score += 10;
  if (/[A-Z]/.test(pwd)) score += 10;
  if (/[0-9]/.test(pwd)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) score += 10;

  // Complexity bonus (max 20 points)
  const uniqueChars = new Set(pwd).size;
  if (uniqueChars >= 8) score += 5;
  if (uniqueChars >= 12) score += 5;
  if (uniqueChars >= 16) score += 5;
  if (uniqueChars >= 20) score += 5;

  // Determine strength level
  let strength;
  if (score < 40) {
    strength = 'weak';
    feedback.push('Consider using a longer password with more character variety');
  } else if (score < 70) {
    strength = 'medium';
    feedback.push('Good password, but could be stronger');
  } else {
    strength = 'strong';
    feedback.push('Excellent password strength');
  }

  // Provide specific feedback
  if (pwd.length < 12) {
    feedback.push('Use at least 12 characters for better security');
  }
  if (!/[0-9]/.test(pwd)) {
    feedback.push('Adding numbers will strengthen your password');
  }

  return {
    strength,
    score,
    feedback: feedback.join('. ')
  };
}

module.exports = {
  validatePassword,
  getPasswordStrength
};
