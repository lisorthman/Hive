const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('../models/Event');
const User = require('../models/User');

dotenv.config({ path: './.env' });

const seedEvents = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // Find an NGO or Admin to own the events
        const user = await User.findOne({ role: { $in: ['ngo', 'admin'] } });
        if (!user) {
            console.error('No NGO or Admin found. Please seed users first.');
            process.exit(1);
        }

        const events = [
            {
                title: "Beach Cleanup Initiative",
                description: "Join us for a massive cleanup effort at the local beach. We provide gloves and bags!",
                organization: user._id,
                ngoName: user.name || "Default NGO",
                date: new Date('2026-03-15'),
                location: {
                    name: "Santa Monica Beach",
                    coordinates: [-118.4912, 34.0195] // [lng, lat]
                },
                category: "Environmental",
                capacity: 50,
                status: 'upcoming'
            },
            {
                title: "Tech for Seniors",
                description: "Help seniors learn how to use modern smartphones and stay connected with their families.",
                organization: user._id,
                ngoName: user.name || "Default NGO",
                date: new Date('2026-04-10'),
                location: {
                    name: "Downtown Library",
                    coordinates: [-118.2437, 34.0522]
                },
                category: "Education",
                capacity: 10,
                status: 'upcoming'
            },
            {
                title: "Community Kitchen",
                description: "Help prepare and serve meals to those in need in our local community.",
                organization: user._id,
                ngoName: user.name || "Default NGO",
                date: new Date('2026-03-20'),
                location: {
                    name: "St. Mark's Hall",
                    coordinates: [-118.2912, 34.0895]
                },
                category: "Social Work",
                capacity: 20,
                status: 'upcoming'
            }
        ];

        await Event.deleteMany();
        await Event.insertMany(events);
        console.log('Events seeded successfully!');
        process.exit();
    } catch (err) {
        console.error('Error seeding events:', err.message);
        process.exit(1);
    }
};

seedEvents();
