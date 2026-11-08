const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const env = require('./config/env');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jobRoutes = require('./routes/jobRoutes');
const atsRoutes = require('./routes/atsRoutes');
const skillGapRoutes = require('./routes/skillGapRoutes');
const roadmapRoutes = require('./routes/roadmapRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const communicationRoutes = require('./routes/communicationRoutes');

const app = express();

// Trust reverse proxy (e.g. Render, AWS ALB, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Connect to MongoDB Atlas with connection pooling
connectDB();

// High-performance gzip response compression
app.use(compression({
  threshold: 1024, // only compress responses above 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Global Rate Limiting: 2,500 requests per 15 minutes per IP (disabled during local benchmark suite)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2500,
  skip: () => process.env.BENCHMARK === 'true',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again shortly.' }
  }
});
app.use('/api/', globalLimiter);

// Specific Auth Rate Limiting to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: () => process.env.BENCHMARK === 'true',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMIT', message: 'Too many authentication attempts. Please wait 15 minutes.' }
  }
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/college/login', authLimiter);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  immutable: true
}));

// Base Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'CareerAI Engine v1.0', timestamp: new Date() });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CareerAI Engine v1.0', timestamp: new Date() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/resume', resumeRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/v1/ats', atsRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/v1/skills', skillGapRoutes);
app.use('/api/skills', skillGapRoutes);
app.use('/api/v1/roadmap', roadmapRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/v1/interview', interviewRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/v1/college', collegeRoutes);
app.use('/api/college', collegeRoutes);
app.use('/api/v1/assistant', assistantRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/v1/communication', communicationRoutes);
app.use('/api/communication', communicationRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]:', err.stack);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message || 'An unexpected server error occurred.' }
  });
});

const PORT = env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', 2048, () => {
  console.log(`[CareerAI Backend Server] running on http://0.0.0.0:${PORT}`);
});

// High-concurrency socket configuration for 1000+ users
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Server Error]: Port ${PORT} is already in use by another process.`);
    console.error(`A previous server instance or background task is running on port ${PORT}.\n`);
    process.exit(1);
  } else {
    console.error('[Server Error]:', err);
  }
});

