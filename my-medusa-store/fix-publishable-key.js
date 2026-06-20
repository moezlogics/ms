const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) a[m[1]] = m[2];
  return a;
}, {});

const client = new Client(env.DATABASE_URL);

async function run() {
  await client.connect();

  // 1. Find all publishable API keys
  const keys = await client.query("SELECT id, token, title, type FROM api_key WHERE type = 'publishable'");
  console.log('Publishable Keys:', JSON.stringify(keys.rows, null, 2));

  // 2. Find all sales channels
  const sc = await client.query("SELECT id, name FROM sales_channel WHERE deleted_at IS NULL");
  console.log('Sales Channels:', JSON.stringify(sc.rows, null, 2));

  // 3. Check existing links
  const links = await client.query("SELECT * FROM publishable_api_key_sales_channel");
  console.log('Existing Links:', JSON.stringify(links.rows, null, 2));

  // 4. Auto-link: connect EVERY publishable key to EVERY sales channel
  if (keys.rows.length > 0 && sc.rows.length > 0) {
    for (const key of keys.rows) {
      for (const channel of sc.rows) {
        try {
          await client.query(
            `INSERT INTO publishable_api_key_sales_channel (id, publishable_key_id, sales_channel_id, created_at, updated_at)
             VALUES ($1, $2, $3, now(), now())
             ON CONFLICT DO NOTHING`,
            [`pksc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, key.id, channel.id]
          );
          console.log(`Linked: "${key.title}" -> "${channel.name}"`);
        } catch (e) {
          console.log(`Link error: ${e.message}`);
        }
      }
    }
  } else {
    console.log('No keys or no sales channels found!');
  }

  await client.end();
  console.log('\nDone! Restart your frontend now.');
}

run().catch(e => { console.error(e); process.exit(1); });
