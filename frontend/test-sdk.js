const fs = require("fs");
const path = require("path");

// Manually parse .env to make sure env vars are populated
try {
  const dotenvContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  dotenvContent.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let val = m[2] || "";
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[m[1]] = val.trim();
    }
  });
} catch (e) {}

// Let's create an instance of the Medusa client similar to config.ts
const Medusa = require("@medusajs/js-sdk").default;

const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});

// Replicate the custom fetch logic from config.ts
const originalFetch = sdk.client.fetch.bind(sdk.client);
sdk.client.fetch = async (input, init) => {
  const headers = init?.headers ?? {};
  
  // Here we simulate getLocaleHeader() returning null / undefined during build time
  const localeHeader = { "x-medusa-locale": null };
  headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"];

  const newHeaders = {
    ...localeHeader,
    ...headers,
  };
  init = {
    ...init,
    headers: newHeaders,
  };
  return originalFetch(input, init);
};

async function run() {
  console.log("Testing listProducts via JS SDK client...");
  try {
    const query = {
      limit: 1,
      offset: 0,
      fields: "id"
    };
    
    // We fetch products
    const res = await sdk.client.fetch("/store/products", {
      method: "GET",
      query,
    });
    console.log("SUCCESS! Result count:", res.products?.length);
  } catch (err) {
    console.error("SDK fetch failed!");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error status:", err.status);
    console.error("Error statusText:", err.statusText);
    console.error("Full error object:", err);
  }
}

run();
