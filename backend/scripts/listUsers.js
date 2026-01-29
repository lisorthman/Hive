const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: './.env' });

const listUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        const count = await User.countDocuments();
        console.log(`Total users in database: ${count}`);

        const users = await User.find({}, 'name email role createdAt');
        console.log('Users found:');
        console.table(users.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role,
            joined: u.createdAt
        })));

        process.exit();
    } catch (err) {
        console.error('Error listing users:', err.message);
        process.exit(1);
    }
};

listUsers();
