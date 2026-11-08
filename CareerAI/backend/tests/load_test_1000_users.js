import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Testing Configuration for 1000+ Concurrent Active Users
export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Stage 1: Warm up to 100 concurrent users
    { duration: '1m',  target: 250 },  // Stage 2: Scale up to 250 concurrent users
    { duration: '1m',  target: 500 },  // Stage 3: Scale up to 500 concurrent users
    { duration: '2m',  target: 1000 }, // Stage 4: Scale up to 1000 concurrent users
    { duration: '1m',  target: 1000 }, // Stage 5: Sustain 1000 concurrent users
    { duration: '30s', target: 0 },    // Stage 6: Graceful ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'], // 95% of requests must finish within 400ms
    http_req_failed: ['rate<0.01'],                // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'https://gnani-ai.onrender.com/api/v1';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    timeout: '10s',
  };

  // 1. Health check probe
  const healthRes = http.get(`${BASE_URL}/health`, params);
  check(healthRes, {
    'health status 200': (r) => r.status === 200,
  });

  // 2. Public / Semi-public Jobs search with multi-filter query
  const jobsRes = http.get(`${BASE_URL}/jobs?workMode=Remote&q=Developer`, params);
  check(jobsRes, {
    'jobs query status 200': (r) => r.status === 200,
    'jobs returned valid payload': (r) => r.body.length > 0,
  });

  // 3. Simulated user pacing between actions
  sleep(1);
}

