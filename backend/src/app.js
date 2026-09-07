const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { env } = require('./config/env');
const { helmetMiddleware, apiLimiter } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust the first proxy hop (needed on most PaaS hosts for correct
// req.ip / rate-limiting / secure cookies behind a load balancer).
app.set('trust proxy', 1);

app.use(helmetMiddleware);
app.use(compression());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(cookieParser(env.cookieSecret));

// Paystack webhook needs the RAW request body to verify the HMAC signature,
// so it's mounted here with express.raw() ahead of the JSON parser below —
// every other route gets normal parsed JSON via express.json().
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), require('./controllers/paymentsController').webhook);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api', apiLimiter);

// Health check — useful for uptime monitors / deployment platforms.
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', env: env.nodeEnv, time: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// API routes (mounted here as each phase is built; see src/routes/index.js).
// ---------------------------------------------------------------------------
app.use('/api/v1', require('./routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
