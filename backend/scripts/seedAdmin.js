const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: './.env' });

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for seeding...');

        const adminEmail = 'admin@gmail.com';
        const adminPassword = '123456';
        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log('Admin already exists. Updating password...');
            admin.password = adminPassword;
            await admin.save();
            console.log('Admin password updated successfully.');
        } else {
            admin = await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: adminPassword,
                role: 'admin'
            });
            console.log('Admin account created successfully.');
        }

        process.exit();
    } catch (err) {
        console.error('Error seeding admin:', err.message);
        process.exit(1);
    }
};

seedAdmin();
