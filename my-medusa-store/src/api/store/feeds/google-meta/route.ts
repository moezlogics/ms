import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, getVariantAvailability, QueryContext } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  
  // Parse query params
  const currencyCode = (req.query.currency as string || "PKR").toLowerCase()
  const countryCode = (req.query.country as string || "PK").toLowerCase()
  
  // Base URL resolution
  const storefrontUrl = process.env.STOREFRONT_URL || "https://www.mobilestore.pk"
  const cleanBaseUrl = storefrontUrl.endsWith("/") ? storefrontUrl.slice(0, -1) : storefrontUrl
  const brandName = process.env.SMTP_FROM_NAME || "Mobile Store"

  try {
    const limit = 100
    let offset = 0
    let count = 0
    const feedItems: any[] = []

    do {
      const {
        data: products,
        metadata
      } = await query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "description",
          "handle",
          "thumbnail",
          "images.*",
          "status",
          "variants.*",
          "variants.calculated_price.*",
          "sales_channels.*",
          "sales_channels.stock_locations.*",
          "sales_channels.stock_locations.address.*",
          "categories.*"
        ],
        filters: {
          status: "published",
        },
        context: {
          variants: {
            calculated_price: QueryContext({
              currency_code: currencyCode,
            }),
          }
        },
        pagination: {
          take: limit,
          skip: offset,
        }
      }) as { data: any[], metadata: any }

      count = metadata?.count ?? 0
      offset += limit

      for (const product of products) {
        if (!product.variants?.length) continue
        const salesChannel = product.sales_channels?.find((channel: any) => {
          return channel?.stock_locations?.some((location: any) => {
            return location?.address?.country_code?.toLowerCase() === countryCode
          })
        })

        const availability = salesChannel?.id ? await getVariantAvailability(query, {
          variant_ids: product.variants.map((variant: any) => variant.id),
          sales_channel_id: salesChannel?.id,
        }) : undefined

        const categories = product.categories?.map((cat: any) => cat?.name)
          .filter((name: any): name is string => !!name).join(" > ")

        for (const variant of product.variants) {
          const calculatedPrice = variant.calculated_price
          const hasOriginalPrice = calculatedPrice?.original_amount !== calculatedPrice?.calculated_amount
          const originalPrice = hasOriginalPrice ? calculatedPrice?.original_amount : calculatedPrice?.calculated_amount
          const salePrice = hasOriginalPrice ? calculatedPrice?.calculated_amount : undefined
          const stockStatus = !variant.manage_inventory ? "in stock" : 
            !availability?.[variant.id]?.availability ? "out of stock" : "in stock"
          
          const formatPriceString = (amount: number) => {
            return `${(amount).toFixed(2)} ${currencyCode.toUpperCase()}`
          }

          const escapeHtml = (str: string) =>
            (str || "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\"/g, "&quot;")
              .replace(/'/g, "&apos;")

          const color = variant.options?.find((o: any) => o.option?.title?.toLowerCase() === "color")?.value
          const size = variant.options?.find((o: any) => o.option?.title?.toLowerCase() === "size")?.value

          feedItems.push({
            id: variant.id,
            title: escapeHtml(product.title),
            description: escapeHtml(product.description || product.title),
            link: escapeHtml(`${cleanBaseUrl}/${countryCode}/products/${product.handle}`),
            image_link: escapeHtml(product.thumbnail || ""),
            additional_image_link: escapeHtml(product.images?.map((img: any) => img.url)?.join(",") || ""),
            availability: stockStatus,
            price: originalPrice !== undefined ? formatPriceString(originalPrice) : "",
            sale_price: salePrice !== undefined ? formatPriceString(salePrice) : undefined,
            item_group_id: product.id,
            brand: escapeHtml(brandName),
            category: escapeHtml(categories || ""),
            color: escapeHtml(color || ""),
            size: escapeHtml(size || ""),
          })
        }
      }
    } while (count > offset)

    const itemsXml = feedItems.map((item) => {
      let itemStr = `<item>` +
        `<g:id>${item.id}</g:id>` +
        `<g:title>${item.title}</g:title>` +
        `<g:description>${item.description}</g:description>` +
        `<g:link>${item.link}</g:link>` +
        (item.image_link ? `<g:image_link>${item.image_link}</g:image_link>` : "") +
        (item.additional_image_link ? `<g:additional_image_link>${item.additional_image_link}</g:additional_image_link>` : "") +
        `<g:availability>${item.availability}</g:availability>` +
        `<g:price>${item.price}</g:price>` +
        (item.sale_price ? `<g:sale_price>${item.sale_price}</g:sale_price>` : "") +
        `<g:brand>${item.brand}</g:brand>` +
        `<g:item_group_id>${item.item_group_id}</g:item_group_id>` +
        (item.category ? `<g:product_type>${item.category}</g:product_type>` : "") +
        (item.color ? `<g:color>${item.color}</g:color>` : "") +
        (item.size ? `<g:size>${item.size}</g:size>` : "") +
        `<g:condition>new</g:condition>` +
      `</item>`
      return itemStr
    }).join("")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(brandName)} Product Catalog Feed</title>
    <link>${escapeXml(cleanBaseUrl)}</link>
    <description>Dynamic product feed for Google Merchant Center and Meta Ads Catalog</description>
    ${itemsXml}
  </channel>
</rss>`

    res.setHeader("Content-Type", "application/xml")
    res.status(200).send(xml)

  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to generate product feed" })
  }
}

function escapeXml(str: string) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
