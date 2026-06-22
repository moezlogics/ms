import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Button, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"

const ProductsUpdateDatesWidget = () => {
  const [loading, setLoading] = useState(false)

  const handleUpdateDates = async () => {
    const confirmUpdate = window.confirm(
      "Are you sure you want to update all products' publication and modification timestamps to the current date and time? This operation will affect all products in the database."
    )
    if (!confirmUpdate) return

    setLoading(true)
    try {
      const res = await fetch("/admin/products-update-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update product dates")
      }

      const data = await res.json()
      toast.success(data.message || "All product timestamps successfully updated!")
    } catch (e: any) {
      toast.error(e.message || "Failed to update product timestamps.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <Heading level="h2" className="text-lg font-bold">
            Bulk Product Timestamps Update
          </Heading>
          <Text className="text-sm text-ui-fg-muted mt-1 max-w-2xl">
            Click the button to update the created_at and updated_at timestamps of all products in the database to the current date and time. This will help search engines like Google discover and index your products with fresh, active dates instead of years-old launch/release specifications.
          </Text>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="secondary"
            size="small"
            onClick={handleUpdateDates}
            isLoading={loading}
            disabled={loading}
          >
            Update All Dates
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default ProductsUpdateDatesWidget
