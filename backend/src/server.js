const { assertRequiredEnv, env } = require('./config/env');

// Fail fast if required secrets are missing, with a clear message rather
// than a confusing crash later when a route first touches Supabase.
assertRequiredEnv();

const app = require('./app');

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Aroma FoodLand API listening on port ${env.port} [${env.nodeEnv}]`);
});
