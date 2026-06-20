const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env file not found!');
    process.exit(1);
  }

  const env = {};
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
  });

  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL not found in .env!');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = new Client(dbUrl);
  await client.connect();

  const mobilePhonePreset = {
    name: "Mobile Phone",
    handle: "mobile-phone",
    description: "Smartphones — display, chipset, RAM, storage, camera, battery.",
    icon: "ph-device-mobile",
    is_preset: true,
    sort_order: 0,
    template_data: {
      groups: [
        {
          name: "Overview & Status",
          icon: "ph-device-mobile",
          fields: [
            { key: "release_date", label: "Release Date", type: "text", highlight: true, placeholder: "e.g. October 2026" },
            { key: "pta_approved", label: "PTA Approved", type: "boolean", highlight: true, is_filter: true },
            { key: "sim_type", label: "Sim Type", type: "select", options: ["Nano-SIM + eSIM"], placeholder: "e.g. Nano-SIM + eSIM" },
            { key: "5g_support", label: "5G Support", type: "boolean", is_filter: true },
          ],
        },
        {
          name: "Memory & Storage",
          icon: "ph-database",
          fields: [
            { key: "memory", label: "RAM", type: "select", options: ["2GB RAM", "4GB RAM", "6GB RAM", "8GB RAM", "12GB RAM", "16GB RAM"], highlight: true, placeholder: "12GB RAM" },
            { key: "storage", label: "Storage", type: "select", options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"], placeholder: "e.g. 256GB" },
            { key: "expandable_storage", label: "Card Slot", type: "text", placeholder: "No" },
          ],
        },
        {
          name: "Processor & Performance",
          icon: "ph-cpu",
          fields: [
            { key: "chipset", label: "Chipset", type: "select", options: ["Mediatek Dimensity 8500 Ultra", "Google Tensor G5 (3 nm)", "Qualcomm SM8850-1-AD Snapdragon 8 Elite Gen 5 (3 nm)"], highlight: true, placeholder: "Mediatek Dimensity 8500 Ultra" },
            { key: "cpu", label: "Processor (CPU)", type: "text", placeholder: "Octa-core (1 x 3.4 GHz + 3 x 3.2 GHz + 4 x 2.2 GHz)" },
            { key: "gpu", label: "GPU", type: "text", placeholder: "Mali-G720 MC8" },
          ],
        },
        {
          name: "Display Specifications",
          icon: "ph-monitor",
          fields: [
            { key: "display_size", label: "Display Size", type: "text", highlight: true, placeholder: "6.59 Inches" },
            { key: "display_technology", label: "Panel Technology", type: "text", placeholder: "AMOLED, 68B Colors" },
            { key: "display_resolution", label: "Resolution", type: "text", placeholder: "1268 x 2756 Pixels (~460 PPI)" },
            { key: "display_protection", label: "Screen Protection", type: "text", placeholder: "Corning Gorilla Glass 7i" },
            { key: "refresh_rate", label: "Refresh Rate", type: "select", options: ["120Hz", "90Hz", "60Hz", "144Hz"], placeholder: "e.g. 120Hz" },
          ],
        },
        {
          name: "Camera Details",
          icon: "ph-camera",
          fields: [
            { key: "camera_main", label: "Main Camera", type: "text", highlight: true, placeholder: "Triple 50 MP + 50 MP + 12 MP" },
            { key: "main_camera_video", label: "Main Camera Video", type: "text", placeholder: "e.g. 4K@60fps" },
            { key: "camera_front", label: "Selfie Camera", type: "text", placeholder: "32 MP" },
            { key: "new_field", label: "Selfie Camera Video", type: "text", placeholder: "e.g. 1080p@30fps" },
            { key: "camera_features", label: "Camera Features", type: "text", placeholder: "Leica Lens, Ultra HDR, OIS" },
          ],
        },
        {
          name: "Battery & Power",
          icon: "ph-battery-full",
          fields: [
            { key: "battery_capacity", label: "Battery Capacity", type: "select", options: ["6500 mAh", "5000 mAh", "4970 mAh"], highlight: true, placeholder: "6500 mAh" },
            { key: "charging_speed", label: "Charging Speed", type: "text", placeholder: "67W Fast Charging" },
            { key: "wireless_charging", label: "Wireless Charging", type: "boolean" },
          ],
        },
        {
          name: "Build & Software",
          icon: "ph-ruler",
          fields: [
            { key: "os", label: "Operating System", type: "text", placeholder: "Android 16 (HyperOS 3)" },
            { key: "ui", label: "UI (User Interface)", type: "text", placeholder: "e.g. HyperOS" },
            { key: "dimensions", label: "Dimensions", type: "text", placeholder: "157.6 x 75.2 x 8.2 mm" },
            { key: "weight", label: "Weight", type: "text", placeholder: "200 g" },
            { key: "sensors", label: "Sensors", type: "text", placeholder: "Fingerprint (under display), Gyro, Proximity" },
            { key: "colors", label: "Colors", type: "select", options: ["White", "Grey", "Opal White", "Black", "Violet"], placeholder: "Violet, Blue, Opal White, Black" },
          ],
        },
      ],
    },
  };

  // Check if handle "mobile-phone" exists
  const checkRes = await client.query('SELECT id FROM spec_template WHERE handle = $1 AND deleted_at IS NULL', [mobilePhonePreset.handle]);

  if (checkRes.rows.length > 0) {
    console.log(`Mobile phone template found (ID: ${checkRes.rows[0].id}). Updating template_data...`);
    await client.query(
      `UPDATE spec_template 
       SET name = $1, description = $2, icon = $3, template_data = $4, updated_at = NOW() 
       WHERE handle = $5 AND deleted_at IS NULL`,
      [mobilePhonePreset.name, mobilePhonePreset.description, mobilePhonePreset.icon, JSON.stringify(mobilePhonePreset.template_data), mobilePhonePreset.handle]
    );
    console.log('Mobile phone template updated successfully.');
  } else {
    console.log('Mobile phone template not found in database. Inserting new preset...');
    const newId = `sptpl_${Date.now()}`;
    await client.query(
      `INSERT INTO spec_template (id, name, handle, description, icon, is_preset, sort_order, template_data, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [newId, mobilePhonePreset.name, mobilePhonePreset.handle, mobilePhonePreset.description, mobilePhonePreset.icon, mobilePhonePreset.is_preset, mobilePhonePreset.sort_order, JSON.stringify(mobilePhonePreset.template_data)]
    );
    console.log('Inserted new Mobile Phone template.');
  }

  await client.end();
  console.log('Done!');
}

run().catch(err => {
  console.error('Error running update script:', err);
  process.exit(1);
});
