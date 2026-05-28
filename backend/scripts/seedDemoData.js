/**
 * Demo seed for manual QA — run from backend/:  npm run seed:demo
 *
 * Logins (password for all: 123456):
 *   Admin:     admin@gmail.com
 *   NGO:       save@earth.org        (verified)
 *   Volunteer: alex@volunteer.com    (email verified, checked-in on completed mission)
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const User = require('../models/User');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const ImpactPost = require('../models/ImpactPost');
const ImpactComment = require('../models/ImpactComment');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DEMO_PASSWORD = '123456';

const upsertUser = async ({ email, name, password, role, fields = {} }) => {
    const normalized = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalized });

    if (user) {
        user.name = name;
        user.password = password;
        Object.assign(user, fields);
        await user.save();
        console.log(`  Updated user: ${normalized} (${role})`);
    } else {
        user = await User.create({
            name,
            email: normalized,
            password,
            role,
            ...fields
        });
        console.log(`  Created user: ${normalized} (${role})`);
    }

    return user;
};

const upsertEvent = async (ngo, spec) => {
    let event = await Event.findOne({ organization: ngo._id, title: spec.title });
    const payload = {
        ...spec,
        organization: ngo._id,
        ngoName: ngo.name
    };

    if (event) {
        Object.assign(event, payload);
        await event.save();
        console.log(`  Updated event: ${spec.title}`);
    } else {
        event = await Event.create(payload);
        console.log(`  Created event: ${spec.title}`);
    }

    return event;
};

const main = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected.\n');
        console.log('=== Seeding Hive demo data ===\n');

        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const placeholderDoc = path.join(uploadsDir, 'seed-demo-ngo.pdf');
        if (!fs.existsSync(placeholderDoc)) {
            fs.writeFileSync(placeholderDoc, '%PDF-1.4 demo placeholder');
        }

        console.log('1) Users');
        const admin = await upsertUser({
            email: 'admin@gmail.com',
            name: 'System Admin',
            password: DEMO_PASSWORD,
            role: 'admin',
            fields: { accountStatus: 'active' }
        });

        const ngo = await upsertUser({
            email: 'save@earth.org',
            name: 'Save Earth',
            password: DEMO_PASSWORD,
            role: 'ngo',
            fields: {
                verificationStatus: 'verified',
                verificationDocument: 'uploads/seed-demo-ngo.pdf',
                accountStatus: 'active',
                bio: 'Protecting coastlines and communities through volunteer action.'
            }
        });

        const alex = await upsertUser({
            email: 'alex@volunteer.com',
            name: 'Alex Volunteer',
            password: DEMO_PASSWORD,
            role: 'volunteer',
            fields: {
                emailVerified: true,
                allowStoryTagging: true,
                accountStatus: 'active',
                bio: 'Passionate about environmental cleanup and community kitchens.',
                interests: ['Environmental', 'Social Work'],
                skills: ['Team leadership', 'First aid'],
                availability: 'Weekends and weekday evenings'
            }
        });

        await upsertUser({
            email: 'maya@volunteer.com',
            name: 'Maya Chen',
            password: DEMO_PASSWORD,
            role: 'volunteer',
            fields: {
                emailVerified: true,
                allowStoryTagging: false,
                accountStatus: 'active',
                bio: 'Education volunteer (tagging disabled for consent demo).',
                interests: ['Education'],
                skills: ['Teaching']
            }
        });

        console.log('\n2) Events (Save Earth)');
        const beachCleanup = await upsertEvent(ngo, {
            title: 'Beach Cleanup – Colombo Coast',
            description:
                'Join us to remove plastic waste along the coast. Gloves and bags provided. Great for first-time volunteers.',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            location: {
                name: 'Colombo Coast, Sri Lanka',
                coordinates: [79.8612, 6.9271]
            },
            category: 'Environmental',
            capacity: 30,
            volunteersJoined: [alex._id],
            waitlist: [],
            status: 'completed',
            averageRating: 4.8,
            reviewCount: 1
        });

        const communityKitchen = await upsertEvent(ngo, {
            title: 'Community Kitchen – Weekend Shift',
            description: 'Help prepare and serve meals. Morning and afternoon shifts available.',
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            location: {
                name: 'Downtown Community Hall',
                coordinates: [79.85, 6.93]
            },
            category: 'Social Work',
            capacity: 20,
            useShiftSlots: true,
            shiftSlots: [
                {
                    label: 'Morning shift',
                    startTime: '09:00',
                    endTime: '12:00',
                    capacity: 10,
                    volunteersJoined: [alex._id],
                    waitlist: []
                },
                {
                    label: 'Afternoon shift',
                    startTime: '13:00',
                    endTime: '16:00',
                    capacity: 10,
                    volunteersJoined: [],
                    waitlist: []
                }
            ],
            volunteersJoined: [],
            waitlist: [],
            status: 'upcoming'
        });

        const treePlanting = await upsertEvent(ngo, {
            title: 'Urban Tree Planting Day',
            description: 'Plant native trees in the city park. No experience needed.',
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            location: {
                name: 'Viharamahadevi Park',
                coordinates: [79.86, 6.91]
            },
            category: 'Environmental',
            capacity: 40,
            volunteersJoined: [],
            waitlist: [],
            status: 'upcoming'
        });

        console.log('\n3) Attendance');
        await Attendance.deleteMany({ volunteer: alex._id });

        const morningSlotId = communityKitchen.shiftSlots[0]._id.toString();

        await Attendance.create({
            event: beachCleanup._id,
            volunteer: alex._id,
            shiftSlotId: 'default',
            status: 'checked-in',
            hoursWorked: 4,
            checkedInAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        });
        console.log('  Alex: checked-in on Beach Cleanup (4h)');

        await Attendance.create({
            event: communityKitchen._id,
            volunteer: alex._id,
            shiftSlotId: morningSlotId,
            status: 'joined'
        });
        console.log('  Alex: joined Morning shift on Community Kitchen');

        console.log('\n4) Impact stories');
        await ImpactPost.deleteMany({ ngo: ngo._id });
        await ImpactComment.deleteMany({});

        const story1 = await ImpactPost.create({
            ngo: ngo._id,
            event: beachCleanup._id,
            title: 'Beach Cleanup – Colombo Coast',
            description:
                'Today, together with 24 volunteers, we removed 450kg of plastic waste along the Colombo coast. Thank you to everyone who showed up — your work made a visible difference.\n\nSpecial thanks to our core team for leading sorting stations.',
            photos: [],
            taggedVolunteers: [alex._id],
            hashtags: ['Environmental', 'BeachCleanup', 'Colombo'],
            visibility: 'public',
            likes: [alex._id],
            likesCount: 1,
            commentsCount: 1,
            sharesCount: 2,
            savesCount: 1
        });

        await ImpactComment.create({
            post: story1._id,
            author: alex._id,
            text: 'Proud to be part of this cleanup. The shoreline looks amazing now!'
        });

        await ImpactPost.create({
            ngo: ngo._id,
            event: communityKitchen._id,
            title: 'Community Kitchen – Next Weekend',
            description:
                'We are preparing for our next community kitchen with morning and afternoon shifts. Sign up on the mission page — spots are filling fast.',
            photos: [],
            taggedVolunteers: [],
            hashtags: ['SocialWork', 'Community'],
            visibility: 'public',
            likes: [],
            likesCount: 0,
            commentsCount: 0
        });

        console.log('  2 impact posts (1 tags Alex, 1 with comment from Alex)');

        console.log('\n=== DONE ===\n');
        console.log('Login credentials (password: 123456 for all):');
        console.log('  Admin:     admin@gmail.com');
        console.log('  NGO:       save@earth.org');
        console.log('  Volunteer: alex@volunteer.com');
        console.log('  Extra:     maya@volunteer.com (tagging consent OFF)\n');
        console.log('What to test in the UI:\n');
        console.log('  NGO  → /ngo-dashboard → Impact Story Management');
        console.log('       → /ngo-mission/<beach event id> → Publish impact story');
        console.log('       → /impact-feed → publish / filter / trending');
        console.log('  Alex → /impact-feed → like & comment on Beach story');
        console.log('       → /profile → Activity Timeline (tagged post + completed mission)');
        console.log('  Admin → /admin → Audit Log → Impact moderation (after reporting a post)\n');
        console.log('Event IDs (for deep links):');
        console.log(`  Beach cleanup:      ${beachCleanup._id}`);
        console.log(`  Community kitchen:  ${communityKitchen._id}`);
        console.log(`  Impact story 1:     ${story1._id}\n`);

        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
};

main();
