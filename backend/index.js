const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// R5 (§8.3.2): the logged client IP is req.ip. X-Forwarded-For is only trusted when the
// operator says the app runs behind a proxy (TRUST_PROXY=1, a hop count, or e.g. "loopback");
// otherwise a client could forge the IP recorded in the security log.
if (process.env.TRUST_PROXY) {
    const trust = process.env.TRUST_PROXY.trim();
    app.set('trust proxy', /^\d+$/.test(trust) ? Number(trust) : trust === 'true' ? 1 : trust);
}

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// R5 – security event capture (§8.3.1). Must run before the routers.
app.use(require('./middleware/securityMonitor').securityMonitor);

// Route files
const auth = require('./routes/auth');
const events = require('./routes/events');
const admin = require('./routes/admin');
const notifications = require('./routes/notifications');
const attendance = require('./routes/attendance');
const reviews = require('./routes/reviews');
const comments = require('./routes/comments');
const ngos = require('./routes/ngos');
const reports = require('./routes/reports');
const series = require('./routes/series');
const instances = require('./routes/instances');
const impactPosts = require('./routes/impactPosts');
const impactComments = require('./routes/impactComments');
const crisis = require('./routes/crisis');

// Mount routers
app.use('/api/auth', auth);
app.use('/api/events', events);
app.use('/api/admin', admin);
app.use('/api/notifications', notifications);
app.use('/api/attendance', attendance);
app.use('/api/reviews', reviews);
app.use('/api/comments', comments);
app.use('/api/ngos', ngos);
app.use('/api/reports', reports);
app.use('/api/series', series);
app.use('/api/instances', instances);
app.use('/api/impact-posts', impactPosts);
app.use('/api/impact-comments', impactComments);
app.use('/api/crisis', crisis);

// Serve public uploads (impact story photos only). NGO documents are private.
app.use('/uploads', require('./middleware/publicUploads'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// R5 (§8.3.4/§8.3.7): verify the security log hash chain on a schedule (default every
// 24 hours, first run 1 minute after start-up). A failed check raises a critical alert.
const { verifyAndRecord } = require('./utils/securityLog');
const verifyHours = Number(process.env.SECURITY_VERIFY_INTERVAL_HOURS || 24);
if (verifyHours > 0) {
    const runCheck = () => verifyAndRecord({ source: 'scheduled' }).catch((err) => {
        console.error('[security-log] scheduled integrity check failed:', err.message);
    });
    setTimeout(runCheck, 60 * 1000).unref();
    setInterval(runCheck, verifyHours * 60 * 60 * 1000).unref();
}
