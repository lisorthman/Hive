const MIN_LENGTH = 8;

const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Please provide a password' };
    }
    if (password.length < MIN_LENGTH) {
        return {
            valid: false,
            error: `Password must be at least ${MIN_LENGTH} characters`
        };
    }
    if (!/\d/.test(password)) {
        return {
            valid: false,
            error: 'Password must include at least one number'
        };
    }
    return { valid: true };
};

module.exports = { validatePassword, MIN_LENGTH };
