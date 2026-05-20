const BASE_URL = 'http://127.0.0.1:5001/api';

async function run() {
    try {
        console.log('=== STARTING HTTP API GAMIFICATION & LEADERBOARD TESTS ===');
        
        // 1. Register a volunteer user
        console.log('Registering volunteer...');
        const email = `alex_game_${Date.now()}@volunteer.com`;
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Alex Gamer',
                email: email,
                password: 'password123',
                role: 'volunteer'
            })
        });
        const regData = await regRes.json();
        if (!regData.success) throw new Error('Registration failed: ' + JSON.stringify(regData));
        const token = regData.token;
        const volunteerId = regData.user.id;
        console.log(`Volunteer registered successfully: ${email} (ID: ${volunteerId})`);

        // 2. Fetch volunteer stats (initial state: 0 hours, 0 score, 0 badges, level 1)
        console.log('Fetching volunteer stats initially...');
        const statsRes = await fetch(`${BASE_URL}/attendance/my-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        console.log('Initial stats:', statsData.data);
        if (statsData.data.communityScore !== 0 || statsData.data.level !== 1 || statsData.data.badges.length !== 0) {
            throw new Error('Initial gamification stats should be empty/zero!');
        }

        // 3. Fetch events to find one to join
        console.log('Fetching events...');
        const eventsRes = await fetch(`${BASE_URL}/events`);
        const eventsData = await eventsRes.json();
        if (!eventsData.success) throw new Error('Failed to fetch events');
        const event = eventsData.data[0];
        if (!event) throw new Error('No events found in DB to test with. Seed events first.');
        console.log(`Found event: "${event.title}" (ID: ${event._id})`);

        // 4. Join the event (stats should update to joinedCount: 1, communityScore: 100, and badge: First Step)
        console.log(`Joining event ${event._id}...`);
        const joinRes = await fetch(`${BASE_URL}/events/${event._id}/join`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        await joinRes.json();

        console.log('Fetching stats after joining...');
        const statsRes2 = await fetch(`${BASE_URL}/attendance/my-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData2 = await statsRes2.json();
        console.log('Stats after join:', statsData2.data);
        if (statsData2.data.communityScore !== 100) {
            throw new Error('Score should be 100 after joining 1 event!');
        }
        if (statsData2.data.badges.length !== 1 || statsData2.data.badges[0].id !== 'first_step') {
            throw new Error('First Step badge should be awarded!');
        }

        // 5. Login as admin/NGO to generate a check-in code
        console.log('Logging in as admin...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@gmail.com',
                password: '123456'
            })
        });
        const loginData = await loginRes.json();
        if (!loginData.success) throw new Error('Admin login failed');
        const adminToken = loginData.token;

        console.log('Generating check-in code as admin...');
        const codeRes = await fetch(`${BASE_URL}/attendance/event/${event._id}/code`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const codeData = await codeRes.json();
        const code = codeData.code;

        // 6. Perform check-in (score: 100 + 40 = 140)
        console.log('Checking in volunteer...');
        await fetch(`${BASE_URL}/attendance/event/${event._id}/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
        });

        // 7. Manually update hours to 5 (should unlock Bronze Helper badge, score: 100 + 50 = 150)
        console.log('Updating attendance manually to 5 hours as NGO...');
        await fetch(`${BASE_URL}/attendance/event/${event._id}/manual`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                records: [{
                    volunteerId: volunteerId,
                    status: 'checked-in',
                    hoursWorked: 5
                }]
            })
        });

        // 8. Fetch stats again to verify Bronze Helper badge is unlocked and score is 150
        console.log('Fetching stats after hour update...');
        const statsRes3 = await fetch(`${BASE_URL}/attendance/my-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData3 = await statsRes3.json();
        console.log('Stats after hour update:', statsData3.data);
        if (statsData3.data.communityScore !== 150) {
            throw new Error('Score should be 150 after 5 hours and 1 event!');
        }
        const badgeIds = statsData3.data.badges.map(b => b.id);
        if (!badgeIds.includes('first_step') || !badgeIds.includes('bronze_helper')) {
            throw new Error('Should have both First Step and Bronze Helper badges!');
        }

        // 9. Fetch the leaderboard
        console.log('Fetching leaderboard...');
        const leaderRes = await fetch(`${BASE_URL}/attendance/leaderboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const leaderData = await leaderRes.json();
        console.log('Leaderboard Count:', leaderData.data.length);
        console.log('Top ranked volunteer:', leaderData.data[0]);

        // Verify correct sorting in leaderboard
        for (let i = 0; i < leaderData.data.length - 1; i++) {
            if (leaderData.data[i].score < leaderData.data[i+1].score) {
                throw new Error('Leaderboard is not correctly sorted in descending order of score!');
            }
        }

        // Verify our test user is present in leaderboard with correct properties
        const leaderboardUser = leaderData.data.find(u => u.id === volunteerId);
        if (!leaderboardUser) throw new Error('Test volunteer is missing from leaderboard!');
        console.log('Verified test volunteer in leaderboard:', leaderboardUser);

        // 10. Leave event to clean up
        console.log('Leaving event to clean up...');
        await fetch(`${BASE_URL}/events/${event._id}/leave`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('\n======================================================');
        console.log('🎉 ALL GAMIFICATION & LEADERBOARD API TESTS PASSED! 🎉');
        console.log('======================================================');
    } catch (error) {
        console.error('❌ GAMIFICATION TEST FAILED:', error.message);
    }
}

run();
