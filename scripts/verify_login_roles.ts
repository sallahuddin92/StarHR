import { api } from '../src/lib/api';
// Note: We can't easily import frontend 'api' in node script due to 'window'/'localStorage' dependencies in it usually.
// Instead, let's use node-fetch to hit the running API directly.

async function verifyLogins() {
  const users = [
    { id: 'EMP-001', role: 'HR_ADMIN' },
    { id: 'EMP-004', role: 'MANAGER' },
    { id: 'EMP-002', role: 'WORKER' },
  ];

  console.log('Verifying Login Roles against http://localhost:3001...');

  for (const u of users) {
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: u.id, password: 'password123' }),
      });

      const data = await res.json();

      if (data.success) {
        const receivedRole = data.user.role;
        const status = receivedRole === u.role ? '✅ MATCH' : '❌ MISMATCH';
        console.log(`[${u.id}] Expected: ${u.role} | Got: ${receivedRole} | ${status}`);
        // console.log(JSON.stringify(data.user, null, 2));
      } else {
        console.log(`[${u.id}] Login Failed:`, data.error);
      }
    } catch (e) {
      console.error(`[${u.id}] Request Error:`, e.message);
    }
  }
}

verifyLogins();
