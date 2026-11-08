const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 2000,
  maxFreeSockets: 500,
  timeout: 15000
});

// Ensure port 5005 for clean isolated testing
process.env.BENCHMARK = 'true';
process.env.PORT = process.env.PORT || '5005';
const PORT = process.env.PORT;
const BASE_URL = process.env.API_URL || `http://127.0.0.1:${PORT}/api/v1`;

// Boot the server if not already running externally
let localServerInstance = null;
try {
  localServerInstance = require('../src/server');
} catch (e) {
  console.log('Using running external server instance.');
}

async function makeRequest(urlPath, headers = {}) {
  const start = performance.now();
  return new Promise((resolve) => {
    try {
      const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
      const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
      const url = new URL(cleanPath, normalizedBase);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(url, {
        method: 'GET',
        agent: isHttps ? undefined : httpAgent,
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          ...headers
        },
        timeout: 15000
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          const duration = performance.now() - start;
          const cacheStatus = res.headers['x-cache-status'] || 'NONE';
          resolve({
            statusCode: res.statusCode,
            duration,
            cacheStatus,
            success: res.statusCode >= 200 && res.statusCode < 400
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          statusCode: 0,
          duration: performance.now() - start,
          cacheStatus: 'ERROR',
          success: false,
          error: err.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          statusCode: 408,
          duration: performance.now() - start,
          cacheStatus: 'TIMEOUT',
          success: false,
          error: 'Request Timeout'
        });
      });

      req.end();
    } catch (err) {
      resolve({
        statusCode: 0,
        duration: performance.now() - start,
        cacheStatus: 'ERROR',
        success: false,
        error: err.message
      });
    }
  });
}

function calculatePercentile(values, p) {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}

async function runStage(concurrencyLevel, totalRequests, endpoint) {
  console.log(`\n======================================================`);
  console.log(`  BENCHMARK STAGE: ${concurrencyLevel} CONCURRENT USERS (${totalRequests} Requests)`);
  console.log(`  Target Endpoint: ${endpoint}`);
  console.log(`======================================================`);

  const results = [];
  let completed = 0;
  let active = 0;
  let queued = 0;

  const startTime = performance.now();

  await new Promise((resolve) => {
    function launchNext() {
      while (active < concurrencyLevel && queued < totalRequests) {
        queued++;
        active++;
        makeRequest(endpoint).then((res) => {
          results.push(res);
          active--;
          completed++;
          if (completed === totalRequests) {
            resolve();
          } else {
            launchNext();
          }
        });
      }
    }
    launchNext();
  });

  const totalTimeSec = (performance.now() - startTime) / 1000;
  const durations = results.map(r => r.duration);
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.length - successCount;
  const cacheHits = results.filter(r => r.cacheStatus === 'HIT').length;

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p95 = calculatePercentile([...durations], 95);
  const p99 = calculatePercentile([...durations], 99);
  const rps = (results.length / totalTimeSec).toFixed(1);
  const errorRate = ((errorCount / results.length) * 100).toFixed(2);
  const cacheHitRatio = ((cacheHits / results.length) * 100).toFixed(1);

  const mem = process.memoryUsage();

  console.log(`  Total Time:       ${totalTimeSec.toFixed(2)}s`);
  console.log(`  Throughput (RPS): ${rps} req/sec`);
  console.log(`  Average Latency:  ${avgDuration.toFixed(1)} ms`);
  console.log(`  P95 Latency:      ${p95.toFixed(1)} ms`);
  console.log(`  P99 Latency:      ${p99.toFixed(1)} ms`);
  console.log(`  Successful Reqs:  ${successCount} / ${results.length}`);
  console.log(`  Error Rate:       ${errorRate}%`);
  console.log(`  Cache Hit Ratio:  ${cacheHitRatio}%`);
  console.log(`  Memory (RSS):     ${Math.round(mem.rss / 1024 / 1024)} MB`);
  console.log(`  Memory (Heap):    ${Math.round(mem.heapUsed / 1024 / 1024)} MB / ${Math.round(mem.heapTotal / 1024 / 1024)} MB`);

  return {
    concurrencyLevel,
    totalRequests,
    rps: Number(rps),
    avgDuration: Number(avgDuration.toFixed(1)),
    p95: Number(p95.toFixed(1)),
    p99: Number(p99.toFixed(1)),
    errorRate: Number(errorRate),
    cacheHitRatio: Number(cacheHitRatio)
  };
}

async function runFullSuite() {
  // Give server 1.5 seconds to establish port binding and db connection
  await new Promise(r => setTimeout(r, 1500));

  console.log(`Checking backend server reachability at ${BASE_URL}/health...`);
  const initialCheck = await makeRequest('/health');
  if (!initialCheck.success) {
    console.error(`Cannot connect to backend server at ${BASE_URL}. Error:`, initialCheck.error, 'Status:', initialCheck.statusCode);
    process.exit(1);
  }
  console.log(`Backend server is ONLINE. Starting 1000+ Concurrent User Scalability Suite...\n`);

  const stages = [
    { users: 100,  total: 500,  endpoint: '/health' },
    { users: 250,  total: 1000, endpoint: '/health' },
    { users: 500,  total: 2000, endpoint: '/health' },
    { users: 1000, total: 3000, endpoint: '/health' },
  ];

  const summary = [];
  for (const s of stages) {
    const res = await runStage(s.users, s.total, s.endpoint);
    summary.push(res);
    // 1-second pause between stages
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n======================================================`);
  console.log(`              FINAL BENCHMARK SUMMARY                 `);
  console.log(`======================================================`);
  console.table(summary);
  process.exit(0);
}

runFullSuite();
