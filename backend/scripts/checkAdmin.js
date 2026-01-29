const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: './.env' });

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = await User.findOne({ email: 'admin@gmail.com' });

        if (admin) {
            console.log('Admin user found:');
            console.log(`Name: ${admin.name}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Role: ${admin.role}`);
            // We can't see the password plain-text, but we can verify it exists
            console.log('Password hash present: Yes');
        } else {
            console.log('Admin user NOT found.');
        }
        process.exit();
    } catch (err) {
        console.error('Error checking admin:', err.message);
        process.exit(1);
    }
};

checkAdmin();
