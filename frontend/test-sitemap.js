const fs = require("fs");
const path = require("path");

// Manually parse .env
let backendUrl = "";
let publishableKey = "";

try {
  const dotenvContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  dotenvContent.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let val = m[2] || "";
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      val = val.trim();
      if (m[1] === "NEXT_PUBLIC_MEDUSA_BACKEND_URL") {
        backendUrl = val;
      }
      if (m[1] === "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY") {
        publishableKey = val;
      }
    }
  });
} catch (e) {
  console.error("Failed to read .env file:", e);
}

console.log("Backend URL:", backendUrl);
console.log("Publishable Key:", publishableKey);

async function test() {
  const headers = {
    "x-publishable-api-key": publishableKey,
    "Content-Type": "application/json",
  };

  console.log("\n1. Fetching /store/regions...");
  try {
    const regionsRes = await fetch(`${backendUrl}/store/regions`, { headers });
    console.log("Regions Status:", regionsRes.status, regionsRes.statusText);
    const regionsData = await regionsRes.json();
    console.log("Regions Count:", regionsData.regions?.length);
    
    // Find a country / region
    const firstRegion = regionsData.regions?.[0];
    console.log("First Region ID:", firstRegion?.id);
    const countries = firstRegion?.countries?.map(c => c.iso_2) || [];
    console.log("Countries in first region:", countries);

    // 2. Fetch products with limit=1, fields=id
    console.log("\n2. Fetching /store/products with limit=1, fields=id...");
    const url1 = new URL(`${backendUrl}/store/products`);
    url1.searchParams.append("limit", "1");
    url1.searchParams.append("offset", "0");
    url1.searchParams.append("fields", "id");
    if (firstRegion?.id) {
      url1.searchParams.append("region_id", firstRegion.id);
    }
    
    console.log("Fetching URL:", url1.toString());
    const res1 = await fetch(url1.toString(), { headers });
    console.log("Products (limit=1, fields=id) Status:", res1.status, res1.statusText);
    const data1 = await res1.json();
    console.log("Response data:", JSON.stringify(data1, null, 2));

    // 3. Fetch products with full sitemap fields
    console.log("\n3. Fetching /store/products with sitemap fields...");
    const url2 = new URL(`${backendUrl}/store/products`);
    url2.searchParams.append("limit", "1");
    url2.searchParams.append("offset", "0");
    url2.searchParams.append("fields", "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+variants.metadata,+metadata,+tags");
    if (firstRegion?.id) {
      url2.searchParams.append("region_id", firstRegion.id);
    }

    console.log("Fetching URL:", url2.toString());
    const res2 = await fetch(url2.toString(), { headers });
    console.log("Products (sitemap fields) Status:", res2.status, res2.statusText);
    const data2 = await res2.json();
    if (res2.status !== 200) {
      console.log("Error Response data:", JSON.stringify(data2, null, 2));
    } else {
      console.log("Products Count:", data2.products?.length);
      console.log("First product sample fields:", Object.keys(data2.products?.[0] || {}));
    }

    // 4. Fetch products with fields=handle,updated_at
    console.log("\n4. Fetching /store/products with fields=handle,updated_at...");
    const url3 = new URL(`${backendUrl}/store/products`);
    url3.searchParams.append("limit", "10");
    url3.searchParams.append("offset", "0");
    url3.searchParams.append("fields", "handle,updated_at");
    if (firstRegion?.id) {
      url3.searchParams.append("region_id", firstRegion.id);
    }

    console.log("Fetching URL:", url3.toString());
    const res3 = await fetch(url3.toString(), { headers });
    console.log("Products (fields=handle,updated_at) Status:", res3.status, res3.statusText);
    const data3 = await res3.json();
    if (res3.status !== 200) {
      console.log("Error Response data:", JSON.stringify(data3, null, 2));
    } else {
      console.log("Products count returned:", data3.products?.length);
      console.log("First product sample:", data3.products?.[0]);
    }
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

test();
