require('dotenv').config();
const configureDns = require('./config/dns');
const mongoose = require('mongoose');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const dnsServers = configureDns();
if (dnsServers.length > 0) {
  console.log(`✅ Using custom DNS servers: ${dnsServers.join(', ')}`);
}

// Security middleware
app.use(helmet());
const normalizeOrigin = (raw) => {
  if (!raw) return '';
  let s = String(raw).trim();
  // Render/Vercel env vars sometimes get pasted with wrapping quotes; strip them.
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(/\/+$/, '');
};

const envOrigins = [...(process.env.FRONTEND_URLS || '').split(','), process.env.FRONTEND_URL || '']
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = new Set([
  ...envOrigins,
  'http://localhost:5173',
  'http://localhost:5174'
]);

const isDev = process.env.NODE_ENV !== 'production';
const allowVercelAppOrigins =
  String(process.env.ALLOW_VERCEL_APP_ORIGINS || '').toLowerCase() === 'true';
const devOriginRe =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin/non-browser requests (no Origin header)
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);
    if (allowVercelAppOrigins && normalizedOrigin.endsWith('.vercel.app')) return callback(null, true);
    if (isDev && devOriginRe.test(normalizedOrigin)) return callback(null, true);
    // Do not throw (avoids 500); just omit CORS headers for disallowed origins.
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static('uploads'));

// Fast-fail API calls when DB is down (keeps the server responsive even if Atlas is flaky)
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    success: false,
    message: 'Database not connected. Please try again in a moment.'
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/hod', require('./routes/hod'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/mcq', require('./routes/mcq'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/news', require('./routes/news'));
app.use('/api/rankings', require('./routes/rankings'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/ai-tutor', require('./routes/aiTutor'));
app.use('/api/attendance', require('./routes/attendance'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is healthy',
    db: {
      readyState: mongoose.connection.readyState,
      connected: mongoose.connection.readyState === 1
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} is already in use. Stop the other process, or set PORT to a different value (e.g. PORT=5001).`
        );
      } else {
        console.error(`Server listen error: ${err?.message || err}`);
      }
      process.exit(1);
    });

    // Keep trying to connect in the background (useful when Atlas/TLS is transiently failing).
    while (mongoose.connection.readyState !== 1) {
      try {
        await connectDB();
      } catch (error) {
        console.error(`MongoDB connect failed: ${error.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

start();
