require('dotenv').config();

const compression = require('compression');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { runSyncJob, startNewsSyncCron } = require('./cron/newsSyncCron');
const { initializeDatabase } = require('./database/db');
const newsRoutes = require('./routes/newsRoutes');

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

app.use('/api', newsRoutes);

app.use(
  express.static(CLIENT_DIR, {
    maxAge: '1d',
    etag: true,
  }),
);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

app.use((error, req, res, next) => {
  console.error('[server] Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Unexpected error' : error.message,
  });
});

async function bootstrap() {
  try {
    await initializeDatabase();
    startNewsSyncCron();

    try {
      await runSyncJob('startup');
    } catch (error) {
      console.error('[startup] Initial sync failed:', error.message);
    }

    app.listen(PORT, () => {
      console.info(`[server] Listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[startup] Failed to initialize app:', error);
    process.exit(1);
  }
}

bootstrap();
