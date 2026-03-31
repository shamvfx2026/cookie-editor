const cron = require('node-cron');
const { syncAllCategories } = require('../services/newsService');

const CRON_EXPRESSION = '0 */8 * * *';

async function runSyncJob(trigger = 'manual') {
  const started = new Date().toISOString();
  console.info(`[cron] News sync started (${trigger}) at ${started}`);
  const summary = await syncAllCategories();
  console.info('[cron] News sync finished:', summary);
  return summary;
}

function startNewsSyncCron() {
  cron.schedule(CRON_EXPRESSION, async () => {
    try {
      await runSyncJob('cron');
    } catch (error) {
      console.error('[cron] News sync failed:', error.message);
    }
  });

  console.info(`[cron] Scheduled with expression "${CRON_EXPRESSION}"`);
}

module.exports = {
  runSyncJob,
  startNewsSyncCron,
};
