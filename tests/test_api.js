const BASE_URL = 'http://127.0.0.1:5001/api';

async function run() {
    try {
        console.log('=== STARTING HTTP API INTEGRATION TESTS ===');
        
        // 1. Register a volunteer user
        console.log('Registering volunteer...');
        const email = `alex_${Date.now()}@volunteer.com`;
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Alex Volunteer',
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

        // 2. Fetch events to find one we can join
        console.log('Fetching events...');
        const eventsRes = await fetch(`${BASE_URL}/events`);
        const eventsData = await eventsRes.json();
        if (!eventsData.success) throw new Error('Failed to fetch events');
        
        const event = eventsData.data[0];
        if (!event) throw new Error('No events found in DB to test with. Seed events first.');
        console.log(`Found event: "${event.title}" (ID: ${event._id})`);

        // 3. Join the event
        console.log(`Joining event ${event._id}...`);
        const joinRes = await fetch(`${BASE_URL}/events/${event._id}/join`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const joinData = await joinRes.json();
        console.log('Join response success:', joinData.success);

        // 4. Fetch volunteer stats (should have 0 hours initially)
        console.log('Fetching volunteer stats before check-in...');
        const statsRes = await fetch(`${BASE_URL}/attendance/my-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        console.log('Volunteer Stats:', statsData.data);
        if (statsData.data.totalHours !== 0) {
            throw new Error('Initial hours should be 0!');
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
        if (!loginData.success) throw new Error('Admin login failed: ' + JSON.stringify(loginData));
        const adminToken = loginData.token;

        console.log('Generating check-in code as admin...');
        const codeRes = await fetch(`${BASE_URL}/attendance/event/${event._id}/code`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const codeData = await codeRes.json();
        if (!codeData.success) throw new Error('Generate code failed: ' + JSON.stringify(codeData));
        const code = codeData.code;
        console.log('Generated check-in code:', code);

        // 6. Perform volunteer check-in using the code
        console.log('Checking in volunteer...');
        const checkInRes = await fetch(`${BASE_URL}/attendance/event/${event._id}/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ code })
        });
        const checkInData = await checkInRes.json();
        console.log('Check-in response message:', checkInData.message);
        if (!checkInData.success) throw new Error('Check-in failed: ' + JSON.stringify(checkInData));

        // 7. Fetch stats again (should be 4 hours now)
        console.log('Fetching volunteer stats after check-in...');
        const statsRes2 = await fetch(`${BASE_URL}/attendance/my-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData2 = await statsRes2.json();
        console.log('Volunteer Stats after check-in:', statsData2.data);
        if (statsData2.data.totalHours !== 4) {
            throw new Error('Hours should be 4!');
        }

        // 8. NGO updates attendance hours manually to 7.5 hours
        console.log('Updating attendance manually as admin...');
        const updateRes = await fetch(`${BASE_URL}/attendance/event/${event._id}/manual`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                records: [{
                    volunteerId: volunteerId,
                    status: 'checked-in',
                    hoursWorked: 7.5
                }]
            })
        });
        const updateData = await updateRes.json();
        console.log('Manual update success:', updateData.success);

        // 9. Fetch stats again (should be 7.5 hours now)
        console.log('Fetching volunteer stats after NGO update...');
        const statsRes3 = await fetch(`${BASE_URL}/attendance/my-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData3 = await statsRes3.json();
        console.log('Volunteer Stats after manual update:', statsData3.data);
        if (statsData3.data.totalHours !== 7.5) {
            throw new Error('Hours should be 7.5!');
        }

        // 10. Leave event to clean up
        console.log('Leaving event to clean up...');
        const leaveRes = await fetch(`${BASE_URL}/events/${event._id}/leave`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const leaveData = await leaveRes.json();
        console.log('Leave response success:', leaveData.success);

        console.log('\n======================================');
        console.log('🎉 ALL INTEGRATION API TESTS PASSED! 🎉');
        console.log('======================================');
    } catch (error) {
        console.error('❌ API TEST FAILED:', error.message);
    }
}

run();
