const crypto = require('crypto');

const generateEmailVerificationToken = () => {
    const token = crypto.randomBytes(20).toString('hex');
    const expire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return { token, expire };
};

/**
 * Dev-mode: log verification link. Replace with SendGrid/Resend in production.
 */
const sendVerificationEmail = ({ email, name, token }) => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${baseUrl}/verify?token=${token}`;

    console.log('\n--- Hive email verification (dev mode) ---');
    console.log(`To: ${name} <${email}>`);
    console.log(`Verify: ${link}`);
    console.log('------------------------------------------\n');

    return link;
};

module.exports = { generateEmailVerificationToken, sendVerificationEmail };
