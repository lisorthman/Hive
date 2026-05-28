const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// Serve uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
