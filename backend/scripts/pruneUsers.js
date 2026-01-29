const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: './.env' });

const pruneUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // Delete all users who are not admin
        const result = await User.deleteMany({ role: { $ne: 'admin' } });
        console.log(`Deleted ${result.deletedCount} non-admin users.`);

        // List remaining users
        const remaining = await User.find({}, 'name email role');
        console.log('Remaining users:');
        console.table(remaining.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role
        })));

        process.exit();
    } catch (err) {
        console.error('Error pruning users:', err.message);
        process.exit(1);
    }
};

pruneUsers();
