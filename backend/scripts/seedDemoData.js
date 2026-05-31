/**
 * Full demo seed for end-to-end QA — run from backend/:  npm run seed:demo
 *
 * Password for ALL accounts: 123456
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const User = require('../models/User');
const Event = require('../models/Event');
const EventSeries = require('../models/EventSeries');
const EventInstance = require('../models/EventInstance');
const Attendance = require('../models/Attendance');
const EventReview = require('../models/EventReview');
const EventComment = require('../models/EventComment');
const ImpactPost = require('../models/ImpactPost');
const ImpactComment = require('../models/ImpactComment');
const generateSeriesInstances = require('../utils/generateSeriesInstances');

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
    const payload = { ...spec, organization: ngo._id, ngoName: ngo.name };

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
        console.log('=== Seeding Hive full demo data ===\n');

        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const placeholderDoc = path.join(uploadsDir, 'seed-demo-ngo.pdf');
        if (!fs.existsSync(placeholderDoc)) {
            fs.writeFileSync(placeholderDoc, '%PDF-1.4 demo placeholder');
        }

        // ── 1) Users ──────────────────────────────────────────────────────
        console.log('1) Users');
        await upsertUser({
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

        await upsertUser({
            email: 'pending@ngo.org',
            name: 'Green Hope (Pending)',
            password: DEMO_PASSWORD,
            role: 'ngo',
            fields: {
                verificationStatus: 'pending',
                verificationDocument: 'uploads/seed-demo-ngo.pdf',
                accountStatus: 'active',
                bio: 'Awaiting admin approval — use to test NGO verification flow.'
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
                availability: 'Weekends and weekday evenings',
                emergencyProfile: {
                    availableForEmergencies: true,
                    availabilityWindow: 'anytime',
                    maxRadiusKm: 50,
                    remoteSupportOk: false
                }
            }
        });

        const maya = await upsertUser({
            email: 'maya@volunteer.com',
            name: 'Maya Chen',
            password: DEMO_PASSWORD,
            role: 'volunteer',
            fields: {
                emailVerified: true,
                allowStoryTagging: false,
                accountStatus: 'active',
                bio: 'Education volunteer — tagging consent OFF.',
                interests: ['Education', 'Environmental'],
                skills: ['Teaching', 'Translation']
            }
        });

        const sam = await upsertUser({
            email: 'sam@volunteer.com',
            name: 'Sam Rivera',
            password: DEMO_PASSWORD,
            role: 'volunteer',
            fields: {
                emailVerified: true,
                allowStoryTagging: true,
                accountStatus: 'active',
                bio: 'New volunteer exploring missions.',
                interests: ['Social Work'],
                skills: ['Cooking']
            }
        });

        // ── 2) One-off events ───────────────────────────────────────────────
        console.log('\n2) Events (Save Earth)');

        const beachCleanup = await upsertEvent(ngo, {
            title: 'Beach Cleanup – Colombo Coast',
            description:
                'Remove plastic waste along the coast. Gloves and bags provided. Completed mission — good for reviews, impact stories, and resume.',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            location: { name: 'Colombo Coast, Sri Lanka', coordinates: [79.8612, 6.9271] },
            category: 'Environmental',
            capacity: 30,
            volunteersJoined: [alex._id, maya._id],
            waitlist: [],
            status: 'completed',
            checkInCode: null,
            prepNotes: 'Bring reusable water bottle. Sunscreen recommended.',
            averageRating: 5,
            reviewCount: 1
        });

        const communityKitchen = await upsertEvent(ngo, {
            title: 'Community Kitchen – Weekend Shift',
            description: 'Prepare and serve meals. Morning and afternoon shifts. Use check-in code HIVE2026.',
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            location: { name: 'Downtown Community Hall', coordinates: [79.85, 6.93] },
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
                    volunteersJoined: [sam._id],
                    waitlist: []
                }
            ],
            volunteersJoined: [],
            waitlist: [],
            status: 'upcoming',
            checkInCode: 'HIVE2026',
            prepNotes: 'Wear closed-toe shoes. Hair net provided on site.'
        });

        const treePlanting = await upsertEvent(ngo, {
            title: 'Urban Tree Planting Day',
            description: 'Plant native trees in the city park. Open spots — join from discovery.',
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            location: { name: 'Viharamahadevi Park', coordinates: [79.86, 6.91] },
            category: 'Environmental',
            capacity: 40,
            volunteersJoined: [maya._id],
            waitlist: [],
            status: 'upcoming'
        });

        const fullMission = await upsertEvent(ngo, {
            title: 'First Aid Workshop (FULL – waitlist demo)',
            description: 'Small workshop — capacity 1 so second volunteer lands on waitlist.',
            date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            location: { name: 'Red Cross Training Room', coordinates: [79.87, 6.92] },
            category: 'Healthcare',
            capacity: 1,
            volunteersJoined: [alex._id],
            waitlist: [maya._id],
            status: 'upcoming'
        });

        const floodRelief = await upsertEvent(ngo, {
            title: 'Flood Relief — Colombo',
            description:
                'Urgent sandbagging and evacuation support after heavy rains. Volunteers with first aid or logistics experience especially needed.',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            location: { name: 'Kolonnawa, Colombo', coordinates: [79.895, 6.915] },
            category: 'Disaster Relief',
            capacity: 100,
            volunteersJoined: [alex._id],
            waitlist: [],
            status: 'upcoming',
            missionMode: 'emergency',
            crisis: {
                urgency: 'critical',
                disasterType: 'flood',
                responseDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                affectedAreaName: 'Kolonnawa & surrounding wards',
                radiusKm: 15,
                immediateNeeds: ['Sandbagging', 'Evacuation support', 'Food distribution'],
                requiredSkills: ['First aid', 'Team leadership'],
                deploymentMode: 'rapid',
                crisisStatus: 'active'
            }
        });

        // ── 3) Recurring series ─────────────────────────────────────────────
        console.log('\n3) Recurring series (Food Bank Fridays)');
        await EventInstance.deleteMany({ organization: ngo._id });
        await EventSeries.deleteMany({ organization: ngo._id, title: 'Food Bank Friday' });

        const seriesStart = new Date();
        seriesStart.setDate(seriesStart.getDate() + 3);
        const seriesEnd = new Date(seriesStart);
        seriesEnd.setDate(seriesEnd.getDate() + 28);

        const foodSeries = await EventSeries.create({
            title: 'Food Bank Friday',
            description: 'Weekly food sorting and packing. Recurring mission with generated instances.',
            organization: ngo._id,
            ngoName: ngo.name,
            location: { name: 'City Food Bank', coordinates: [79.855, 6.925] },
            category: 'Social Work',
            recurrence: { frequency: 'weekly', dayOfWeek: 5 },
            seriesStart,
            seriesEnd,
            defaultCapacity: 15,
            useShiftSlots: false,
            status: 'active'
        });

        const instances = await generateSeriesInstances(foodSeries);
        if (instances[0]) {
            instances[0].volunteersJoined = [sam._id];
            await instances[0].save();
            console.log(`  Created series + ${instances.length} instances (Sam joined first instance)`);
        }

        // ── 4) Attendance ───────────────────────────────────────────────────
        console.log('\n4) Attendance');
        await Attendance.deleteMany({
            volunteer: { $in: [alex._id, maya._id, sam._id] }
        });

        await Attendance.create({
            event: beachCleanup._id,
            volunteer: alex._id,
            shiftSlotId: 'default',
            status: 'checked-in',
            hoursWorked: 4,
            checkedInAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        });
        await Attendance.create({
            event: beachCleanup._id,
            volunteer: maya._id,
            shiftSlotId: 'default',
            status: 'checked-in',
            hoursWorked: 3,
            checkedInAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        });

        const morningSlotId = communityKitchen.shiftSlots[0]._id.toString();
        await Attendance.create({
            event: communityKitchen._id,
            volunteer: alex._id,
            shiftSlotId: morningSlotId,
            status: 'joined'
        });
        await Attendance.create({
            event: communityKitchen._id,
            volunteer: sam._id,
            shiftSlotId: communityKitchen.shiftSlots[1]._id.toString(),
            status: 'joined'
        });

        if (instances[0]) {
            await Attendance.create({
                eventInstance: instances[0]._id,
                volunteer: sam._id,
                shiftSlotId: 'default',
                status: 'joined'
            });
        }

        console.log('  Alex + Maya checked-in on Beach Cleanup');
        console.log('  Alex + Sam joined shift missions');

        // ── 5) Reviews & event discussion ───────────────────────────────────
        console.log('\n5) Reviews & event discussion');
        await EventReview.deleteMany({ event: beachCleanup._id });
        await EventComment.deleteMany({ event: beachCleanup._id });

        await EventReview.create({
            event: beachCleanup._id,
            volunteer: alex._id,
            rating: 5,
            comment: 'Well organized! Great team spirit and clear instructions from Save Earth.'
        });

        const rootComment = await EventComment.create({
            event: beachCleanup._id,
            author: alex._id,
            body: 'What should we bring for the next cleanup?'
        });
        await EventComment.create({
            event: beachCleanup._id,
            author: ngo._id,
            body: 'Reusable gloves if you have them — we provide extras on site.',
            parentComment: rootComment._id
        });
        console.log('  1 review + 2 discussion comments on Beach Cleanup');

        // ── 6) Impact stories ───────────────────────────────────────────────
        console.log('\n6) Impact stories');
        await ImpactPost.deleteMany({ ngo: ngo._id });
        await ImpactComment.deleteMany({});

        const story1 = await ImpactPost.create({
            ngo: ngo._id,
            event: beachCleanup._id,
            title: 'Beach Cleanup – Colombo Coast',
            description:
                'Together with 24 volunteers we removed 450kg of plastic waste along the Colombo coast. Thank you to everyone who showed up!',
            photos: [],
            taggedVolunteers: [alex._id],
            hashtags: ['Environmental', 'BeachCleanup', 'Colombo'],
            visibility: 'public',
            likes: [alex._id],
            likesCount: 1,
            commentsCount: 1,
            sharesCount: 2,
            savesCount: 1,
            volunteerContributions: [
                {
                    author: maya._id,
                    text: 'The sorting station was my favorite part — learned a lot about recycling!',
                    status: 'pending'
                }
            ]
        });

        await ImpactComment.create({
            post: story1._id,
            author: alex._id,
            text: 'Proud to be part of this cleanup. The shoreline looks amazing now!'
        });

        await ImpactPost.create({
            ngo: ngo._id,
            event: beachCleanup._id,
            title: 'Behind the scenes – Beach team only',
            description: 'Community-only recap for volunteers who joined the beach mission.',
            photos: [],
            taggedVolunteers: [alex._id],
            hashtags: ['Environmental'],
            visibility: 'community',
            likes: [],
            likesCount: 0,
            commentsCount: 0
        });

        alex.savedImpactPosts = [story1._id];
        await alex.save();

        console.log('  2 impact posts (public + community), 1 pending volunteer addition');

        // ── Summary ─────────────────────────────────────────────────────────
        console.log('\n=== SEED COMPLETE ===\n');
        console.log('All passwords: 123456\n');
        console.log('ACCOUNTS');
        console.log('  Admin (verify NGOs, audit, moderation):  admin@gmail.com');
        console.log('  NGO verified (missions, attendance, stories): save@earth.org');
        console.log('  NGO pending (admin approval test):       pending@ngo.org');
        console.log('  Volunteer (main tester):                 alex@volunteer.com');
        console.log('  Volunteer (tagging OFF):                 maya@volunteer.com');
        console.log('  Volunteer (extra / waitlist):            sam@volunteer.com\n');
        console.log('KEY URLS (frontend http://127.0.0.1:5173)');
        console.log('  Discovery:        /discovery');
        console.log('  Impact feed:      /impact-feed');
        console.log('  Crisis hub:       /crisis');
        console.log('  NGO dashboard:    /ngo-dashboard');
        console.log('  Admin:            /admin');
        console.log('  Leaderboard:      /leaderboard');
        console.log('  Impact resume:    /resume\n');
        console.log('EVENT IDS');
        console.log(`  Beach cleanup (completed):  ${beachCleanup._id}`);
        console.log(`  Community kitchen (shifts): ${communityKitchen._id}`);
        console.log(`  Tree planting (open):       ${treePlanting._id}`);
        console.log(`  Full + waitlist:            ${fullMission._id}`);
        console.log(`  Flood relief (emergency):   ${floodRelief._id}`);
        if (instances[0]) console.log(`  Food Bank instance:         ${instances[0]._id}`);
        console.log(`  Impact story (public):      ${story1._id}`);
        console.log(`  Check-in code (kitchen):    HIVE2026\n`);
        console.log('See TESTING.md in repo root for full feature checklist.\n');

        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
};

main();
