/**
 * R5 – Viva demo: simulate a password-guessing attack against a LOCAL Hive API.
 *
 *   npm run security:demo -- alex@volunteer.com 12
 *
 * Sends N (default 12) logins with a wrong password. With the default threshold
 * (SECURITY_ALERT_THRESHOLD=10 in SECURITY_ALERT_WINDOW_MINUTES=5) this opens a
 * brute-force alert and notifies every active admin.
 * API_URL defaults to http://127.0.0.1:5001/api. Only use against your own local server.
 */
const email = process.argv[2] || 'alex@volunteer.com';
const count = Math.min(Math.max(parseInt(process.argv[3], 10) || 12, 1), 100);
const apiUrl = (process.env.API_URL || 'http://127.0.0.1:5001/api').replace(/\/$/, '');

const main = async () => {
    const host = new URL(apiUrl).hostname;
    if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
        console.error(`Refusing to run against non-local API_URL (${apiUrl}).`);
        process.exit(2);
    }

    console.log(`Sending ${count} wrong-password logins for ${email} to ${apiUrl}/auth/login`);
    for (let i = 1; i <= count; i++) {
        const res = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'hive-security-demo' },
            body: JSON.stringify({ email, password: `wrong-password-demo-${i}` })
        });
        console.log(`  attempt ${String(i).padStart(2)} → HTTP ${res.status}`);
    }
    console.log('\nNow open the admin dashboard → Security tab to see the events, the alert and the notification.');
};

main().catch((err) => {
    console.error('Demo failed:', err.message, '(is the backend running?)');
    process.exit(2);
});
