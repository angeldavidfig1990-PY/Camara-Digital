// ── Smoke Test for Congress API Integration ──────────────────────────────────────
//
// This script verifies that the API integration is working correctly by:
// 1. Fetching at least 50 projects (proyectos de ley)
// 2. Fetching the complete list of deputies (diputados)
// 3. Testing all major endpoints with proper error handling
// 4. Logging results for verification

import { 
  getLegisladores, 
  getProyectos, 
  getComisiones, 
  getSesiones, 
  getVotaciones,
  logger
} from './lib/congress';

interface SmokeTestResult {
  test: string;
  status: 'pass' | 'fail';
  message: string;
  count?: number;
  duration: number;
}

async function runSmokeTest(): Promise<void> {
  console.log('='.repeat(60));
  console.log('SMOKE TEST: Congreso de Paraguay API Integration');
  console.log('='.repeat(60));
  console.log('');

  const results: SmokeTestResult[] = [];

  // Test 1: Fetch Legisladores (Diputados)
  console.log('Test 1: Fetching Legisladores (Diputados)...');
  const start1 = Date.now();
  try {
    const legisladores = (await getLegisladores()).data ?? [];
    const duration1 = Date.now() - start1;
    
    if (legisladores.length > 0) {
      results.push({
        test: 'getLegisladores',
        status: 'pass',
        message: `Successfully fetched ${legisladores.length} deputies`,
        count: legisladores.length,
        duration: duration1
      });
      console.log(`✓ PASS: Fetched ${legisladores.length} deputies in ${duration1}ms`);
      console.log(`  Sample: ${legisladores[0].nombre} ${legisladores[0].apellido} (${legisladores[0].partido})`);
    } else {
      results.push({
        test: 'getLegisladores',
        status: 'fail',
        message: 'No deputies fetched',
        duration: duration1
      });
      console.log(`✗ FAIL: No deputies fetched in ${duration1}ms`);
    }
  } catch (error) {
    const duration1 = Date.now() - start1;
    results.push({
      test: 'getLegisladores',
      status: 'fail',
      message: (error as Error).message,
      duration: duration1
    });
    console.log(`✗ FAIL: Error fetching deputies - ${(error as Error).message}`);
  }
  console.log('');

  // Test 2: Fetch Proyectos (at least 50)
  console.log('Test 2: Fetching Proyectos (target: 50+)...');
  const start2 = Date.now();
  try {
    const proyectosResult = await getProyectos({ limit: 50 });
    const proyectos = proyectosResult.data ?? [];
    const duration2 = Date.now() - start2;
    
    if (proyectos.length >= 50) {
      results.push({
        test: 'getProyectos (50+)',
        status: 'pass',
        message: `Successfully fetched ${proyectos.length} projects (target: 50)`,
        count: proyectos.length,
        duration: duration2
      });
      console.log(`✓ PASS: Fetched ${proyectos.length} projects in ${duration2}ms`);
      console.log(`  Sample: ${proyectos[0].numero} - ${proyectos[0].titulo.substring(0, 50)}...`);
    } else {
      results.push({
        test: 'getProyectos (50+)',
        status: 'fail',
        message: `Only ${proyectos.length} projects fetched (target: 50)`,
        count: proyectos.length,
        duration: duration2
      });
      console.log(`✗ FAIL: Only ${proyectos.length} projects fetched (target: 50) in ${duration2}ms`);
    }
  } catch (error) {
    const duration2 = Date.now() - start2;
    results.push({
      test: 'getProyectos (50+)',
      status: 'fail',
      message: (error as Error).message,
      duration: duration2
    });
    console.log(`✗ FAIL: Error fetching projects - ${(error as Error).message}`);
  }
  console.log('');

  // Test 3: Fetch Comisiones
  console.log('Test 3: Fetching Comisiones...');
  const start3 = Date.now();
  try {
    const comisiones = (await getComisiones()).data ?? [];
    const duration3 = Date.now() - start3;
    
    if (comisiones.length > 0) {
      results.push({
        test: 'getComisiones',
        status: 'pass',
        message: `Successfully fetched ${comisiones.length} commissions`,
        count: comisiones.length,
        duration: duration3
      });
      console.log(`✓ PASS: Fetched ${comisiones.length} commissions in ${duration3}ms`);
      console.log(`  Sample: ${comisiones[0].nombre}`);
    } else {
      results.push({
        test: 'getComisiones',
        status: 'fail',
        message: 'No commissions fetched',
        duration: duration3
      });
      console.log(`✗ FAIL: No commissions fetched in ${duration3}ms`);
    }
  } catch (error) {
    const duration3 = Date.now() - start3;
    results.push({
      test: 'getComisiones',
      status: 'fail',
      message: (error as Error).message,
      duration: duration3
    });
    console.log(`✗ FAIL: Error fetching commissions - ${(error as Error).message}`);
  }
  console.log('');

  // Test 4: Fetch Sesiones
  console.log('Test 4: Fetching Sesiones...');
  const start4 = Date.now();
  try {
    const sesionesResult = await getSesiones();
    const sesiones = sesionesResult.data ?? [];
    const duration4 = Date.now() - start4;
    
    if (sesiones.length > 0) {
      results.push({
        test: 'getSesiones',
        status: 'pass',
        message: `Successfully fetched ${sesiones.length} sessions`,
        count: sesiones.length,
        duration: duration4
      });
      console.log(`✓ PASS: Fetched ${sesiones.length} sessions in ${duration4}ms`);
      console.log(`  Sample: ${sesiones[0].fecha} - ${sesiones[0].tipo}`);
    } else {
      results.push({
        test: 'getSesiones',
        status: 'fail',
        message: 'No sessions fetched',
        duration: duration4
      });
      console.log(`✗ FAIL: No sessions fetched in ${duration4}ms`);
    }
  } catch (error) {
    const duration4 = Date.now() - start4;
    results.push({
      test: 'getSesiones',
      status: 'fail',
      message: (error as Error).message,
      duration: duration4
    });
    console.log(`✗ FAIL: Error fetching sessions - ${(error as Error).message}`);
  }
  console.log('');

  // Test 5: Fetch Votaciones
  console.log('Test 5: Fetching Votaciones...');
  const start5 = Date.now();
  try {
    const votaciones = (await getVotaciones({ limit: 20 })).data ?? [];
    const duration5 = Date.now() - start5;
    
    if (votaciones.length > 0) {
      results.push({
        test: 'getVotaciones',
        status: 'pass',
        message: `Successfully fetched ${votaciones.length} votes`,
        count: votaciones.length,
        duration: duration5
      });
      console.log(`✓ PASS: Fetched ${votaciones.length} votes in ${duration5}ms`);
      console.log(`  Sample: ${votaciones[0].titulo.substring(0, 50)}...`);
    } else {
      results.push({
        test: 'getVotaciones',
        status: 'fail',
        message: 'No votes fetched',
        duration: duration5
      });
      console.log(`✗ FAIL: No votes fetched in ${duration5}ms`);
    }
  } catch (error) {
    const duration5 = Date.now() - start5;
    results.push({
      test: 'getVotaciones',
      status: 'fail',
      message: (error as Error).message,
      duration: duration5
    });
    console.log(`✗ FAIL: Error fetching votes - ${(error as Error).message}`);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('SMOKE TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log('');
  
  console.log('Detailed Results:');
  console.log('-'.repeat(60));
  results.forEach(r => {
    const icon = r.status === 'pass' ? '✓' : '✗';
    console.log(`${icon} ${r.test}: ${r.message} (${r.duration}ms)`);
  });
  console.log('-'.repeat(60));
  console.log('');

  // Log entries
  console.log('Recent Log Entries:');
  console.log('-'.repeat(60));
  const logs = logger.getLogs().slice(-10);
  logs.forEach(log => {
    console.log(`[${log.timestamp}] [${log.level.toUpperCase()}] [${log.component}] ${log.message}`);
  });
  console.log('-'.repeat(60));
  console.log('');

  // Exit with appropriate code
  if (failed > 0) {
    console.log('❌ SMOKE TEST FAILED');
    process.exit(1);
  } else {
    console.log('✅ SMOKE TEST PASSED');
    process.exit(0);
  }
}

// Run the smoke test
runSmokeTest().catch(error => {
  console.error('Fatal error running smoke test:', error);
  process.exit(1);
});
