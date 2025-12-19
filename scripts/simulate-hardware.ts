/**
 * Hardware Clock-In Simulator
 * Simulates morning shift clock-in for all employees
 * Usage: tsx scripts/simulate-hardware.ts
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
}

async function getAuthToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: process.env.ADMIN_USER || 'EMP-001',
      password: process.env.ADMIN_PASS || 'password123',
    }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }

  const data = await res.json();
  return data.token;
}

async function getEmployees(token: string): Promise<Employee[]> {
  const res = await fetch(`${API_BASE}/api/employees`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch employees: ${res.status}`);
  }

  const data = await res.json();
  return data.data || [];
}

async function clockIn(token: string, workerId: string, deviceId: string): Promise<void> {
  // Create a 7 AM clock-in time in Malaysia timezone (UTC+8)
  // 7:00 AM Malaysia = 23:00 UTC (previous day)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Start of today in UTC
  
  // 7:00 AM in Malaysia (UTC+8) = 23:00 UTC previous day
  // So we need: today's date at 23:00 UTC - 24 hours = yesterday 23:00 UTC
  // Or simpler: today at -1:00 UTC = yesterday 23:00 UTC
  // Actually: 7 AM MYT = 7 - 8 = -1 UTC = 23:00 previous day
  const sevenAmMalaysiaInUTC = new Date(today.getTime() - 1 * 60 * 60 * 1000); // -1 hour from midnight = 23:00 yesterday
  
  // Random offset between -15 and +15 minutes to simulate realistic clock-in times
  const offsetMinutes = Math.floor(Math.random() * 31) - 15;
  const clockTime = new Date(sevenAmMalaysiaInUTC.getTime() + offsetMinutes * 60 * 1000);

  const body = {
    workerId,
    timestamp: clockTime.toISOString(),
    deviceId,
    gps: {
      latitude: 3.139 + Math.random() * 0.01,
      longitude: 101.6869 + Math.random() * 0.01,
      accuracy: 10,
    },
  };

  const res = await fetch(`${API_BASE}/api/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`✅ ${workerId}: Clock-in at ${clockTime.toLocaleTimeString()}`);
  } else {
    console.log(`❌ ${workerId}: ${data.error || data.message || 'Failed'}`);
  }
}

async function main() {
  console.log('🏭 Hardware Clock-In Simulator');
  console.log(`📡 API: ${API_BASE}`);
  console.log('');

  try {
    console.log('🔑 Authenticating...');
    const token = await getAuthToken();
    console.log('✅ Authenticated\n');

    console.log('👥 Fetching employees...');
    const employees = await getEmployees(token);
    console.log(`✅ Found ${employees.length} employees\n`);

    if (employees.length === 0) {
      console.log('⚠️  No employees found. Run seed first: npm run seed');
      return;
    }

    const limit = Math.min(employees.length, 50);
    console.log(`⏰ Simulating morning clock-in for ${limit} workers...\n`);

    const deviceId = `TERMINAL-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`;

    for (let i = 0; i < limit; i++) {
      const emp = employees[i];
      await clockIn(token, emp.id, deviceId);
      // Small delay between requests
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log('\n✅ Simulation complete!');
  } catch (err) {
    console.error('❌ Simulation failed:', err);
    process.exit(1);
  }
}

main();
