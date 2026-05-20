const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const LOG_FILE = '/Users/lisorthman/.gemini/antigravity/scratch/test_results.txt';
// Clear previous log
fs.writeFileSync(LOG_FILE, '=== STARTING ATTENDANCE TEST ===\n');

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg);
}

const User = require('../models/User');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');

const MONGO_URI = 'mongodb+srv://Scholarshare:scholarshare@cluster0.mmj1r.mongodb.net/Hive?retryWrites=true&w=majority';

async function runTests() {
    try {
        log('Connecting to MongoDB...');
        // We set a very short timeout of 5 seconds so it fails fast if blocked
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        log('Connected successfully to database.');

        // 1. Clean up any previous test data
        log('Cleaning up old test users...');
        await User.deleteMany({ email: { $in: ['test_vol@test.com', 'test_ngo@test.com'] } });
        await Event.deleteMany({ title: 'Test Attendance Event' });
        
        // 2. Create Volunteer and NGO users
        log('Creating test volunteer user...');
        const volunteer = await User.create({
            name: 'Test Volunteer',
            email: 'test_vol@test.com',
            password: 'password123',
            role: 'volunteer'
        });

        log('Creating test NGO user...');
        const ngo = await User.create({
            name: 'Test NGO',
            email: 'test_ngo@test.com',
            password: 'password123',
            role: 'ngo',
            verificationStatus: 'verified'
        });
        log(`Volunteer created: ${volunteer._id}`);
        log(`NGO created: ${ngo._id}`);

        // 3. Create a Test Event
        log('Creating test event...');
        const event = await Event.create({
            title: 'Test Attendance Event',
            description: 'This is a test event for verifying attendance implementation.',
            organization: ngo._id,
            ngoName: ngo.name,
            date: new Date(),
            location: {
                name: 'Test Park',
                coordinates: [0, 0]
            },
            category: 'Environmental',
            capacity: 5
        });
        log(`Event created: ${event._id}`);

        // 4. Simulate joining the event
        log('Simulating Volunteer joining the event...');
        event.volunteersJoined.push(volunteer._id);
        await event.save();

        // Create the attendance record
        const attendanceJoin = await Attendance.create({
            event: event._id,
            volunteer: volunteer._id,
            status: 'joined'
        });
        log(`Attendance record created on join: ${attendanceJoin._id}, status: ${attendanceJoin.status}`);

        // 5. Generate Check-in Code as NGO
        log('Generating secure check-in code...');
        const secureCode = 'xyz-test-123';
        event.checkInCode = secureCode;
        await event.save();
        log(`Event check-in code set to: ${event.checkInCode}`);

        // 6. Simulate Volunteer Check-in
        log('Simulating volunteer check-in via QR code...');
        const verifiedEvent = await Event.findById(event._id);
        if (!verifiedEvent.checkInCode || verifiedEvent.checkInCode !== secureCode) {
            throw new Error('Check-in code mismatch verification failed!');
        }

        const attendanceCheckIn = await Attendance.findOneAndUpdate(
            { event: event._id, volunteer: volunteer._id },
            {
                status: 'checked-in',
                checkedInAt: new Date(),
                hoursWorked: 4
            },
            { new: true }
        );
        log(`Attendance checked in. Status: ${attendanceCheckIn.status}, Hours: ${attendanceCheckIn.hoursWorked}`);

        // 7. Simulate NGO manual adjustments (updating hours to 6)
        log('Simulating NGO updating hours manually to 6...');
        const updatedAttendance = await Attendance.findOneAndUpdate(
            { event: event._id, volunteer: volunteer._id },
            { hoursWorked: 6 },
            { new: true }
        );
        log(`Attendance updated by NGO. Status: ${updatedAttendance.status}, Hours: ${updatedAttendance.hoursWorked}`);

        // 8. Fetch Volunteer Stats
        log('Fetching volunteer stats...');
        const allRecords = await Attendance.find({ volunteer: volunteer._id });
        const checkedInRecords = allRecords.filter(r => r.status === 'checked-in');
        const totalHours = checkedInRecords.reduce((sum, r) => sum + r.hoursWorked, 0);

        log('--- STATS REPORT ---');
        log(`Total Hours: ${totalHours} (Expected: 6)`);
        log(`Missions Joined: ${allRecords.length} (Expected: 1)`);
        log(`Missions Checked In: ${checkedInRecords.length} (Expected: 1)`);

        if (totalHours !== 6 || allRecords.length !== 1 || checkedInRecords.length !== 1) {
            throw new Error('Stats assertion failed!');
        }
        log('All DB assertions passed successfully!');

        // 9. Clean up test data
        log('Cleaning up test data...');
        await Attendance.deleteMany({ event: event._id });
        await Event.deleteOne({ _id: event._id });
        await User.deleteMany({ _id: { $in: [volunteer._id, ngo._id] } });
        log('Cleanup finished successfully.');

        process.exit(0);
    } catch (err) {
        log(`Test execution failed: ${err.message}`);
        if (err.stack) {
            log(err.stack);
        }
        process.exit(1);
    }
}

runTests();
