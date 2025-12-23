
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';

async function main() {
    console.log('Testing Approval Flow...');

    // 1. Login as Manager (Raj Kumar)
    console.log('Logging in as Manager (raj@techcorp.my)...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: 'raj@techcorp.my',
            password: 'password123'
        })
    });

    const loginData = await loginRes.json();
    if (!loginData.success) {
        console.error('Login failed:', loginData);
        process.exit(1);
    }

    const token = loginData.token;
    console.log('Login successful.');
    console.log('User:', loginData.user);
    console.log('Role:', loginData.user.role);
    console.log('Tenant:', loginData.user.tenantId);

    // 2. Get Pending Approvals
    console.log('Fetching pending approvals...');
    const pendingRes = await fetch(`${API_URL}/approvals/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const pendingData = await pendingRes.json();
    if (!pendingData.success) {
        console.error('Failed to get pending approvals:', pendingData);
        process.exit(1);
    }

    const approvals = pendingData.data;
    console.log(`Found ${approvals.length} pending approvals.`);

    if (approvals.length === 0) {
        console.log('No pending approvals to test.');
        return;
    }

    const targetId = approvals[0].id;
    console.log(`Attempting to approve request ID: ${targetId}`);

    // 3. Approve Request
    const approveRes = await fetch(`${API_URL}/approvals/${targetId}/approve`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: 'Auto-approved by test script' })
    });

    const approveData = await approveRes.json();
    console.log('Approve response:', approveData);

    if (approveData.success) {
        console.log('✅ Approval SUCCESS!');
    } else {
        console.error('❌ Approval FAILED!');
    }
}

main().catch(console.error);
