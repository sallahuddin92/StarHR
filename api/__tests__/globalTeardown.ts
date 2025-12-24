/**
 * Jest Global Teardown
 * Runs once after all test suites complete
 */

export default async function globalTeardown() {
  const startTime = (global as any).__TEST_START_TIME__ || Date.now();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ All tests completed in ${duration}s`);
}
