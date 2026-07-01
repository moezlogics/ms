const fs = require("fs");
const path = require("path");

let backendUrl = "https://api.mobilestore.pk";
let publishableKey = "pk_d661b6c9e6dcfbf3087eeef112311c540888e46a9752bbc420fbe1f81d4c198c";

const headers = {
  "x-publishable-api-key": publishableKey,
  "Content-Type": "application/json",
};

// Simple mock/implementation of getProductPath
function getProductPath(product, brand) {
  if (!product || !product.handle) return "/"

  const categorySegment = product.categories?.[0]?.handle || ""
  
  let brandSegment = ""
  if (brand?.handle) {
    brandSegment = brand.handle
  } else {
    const rawBrand = product.metadata?.brand || product.collection?.handle || product.collection?.title
    if (rawBrand) {
      brandSegment = String(rawBrand)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    }
  }

  const segments = []
  if (brandSegment) segments.push(brandSegment)
  if (categorySegment) segments.push(categorySegment)
  segments.push(product.handle)

  return `/${segments.join("/")}`
}

async function test() {
  const url = new URL(`${backendUrl}/store/products`);
  url.searchParams.append("limit", "5");
  url.searchParams.append("fields", "id,handle,updated_at,*categories,metadata");
  
  const res = await fetch(url.toString(), { headers });
  const { products } = await res.json();

  // Fetch brand map
  const ids = products.map(p => p.id).join(",");
  const brandRes = await fetch(`${backendUrl}/store/brands/by-products?product_ids=${ids}`, { headers });
  const { brands } = await brandRes.json();

  console.log("Without brand passed to getProductPath:");
  for (const p of products) {
    console.log("  ", getProductPath(p));
  }

  console.log("\nWith brand passed to getProductPath:");
  for (const p of products) {
    const brand = brands[p.id];
    console.log("  ", getProductPath(p, brand), "--> brand is", brand ? brand.name : "null");
  }
}

test();
