import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPath } from "@medusajs/icons"
import { Container, Heading, Button, Table, Checkbox, Input, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"
import { A, adminSection, adminStickyHeader, adminDescription } from "../../lib/admin-theme"

const PAGE_SIZE = 15

export default function DateUpdatePage() {
  const [products, setProducts] = useState<any[]>([])
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadProducts = async () => {
    setLoading(true)
    try {
      const queryParams: Record<string, any> = {
        limit: PAGE_SIZE,
        offset,
      }
      if (searchQuery.trim()) {
        queryParams.q = searchQuery.trim()
      }
      
      const res = await sdk.client.fetch<any>("/admin/products", {
        method: "GET",
        query: queryParams,
      })

      setProducts(res.products || [])
      setCount(res.count || 0)
    } catch (e: any) {
      console.error("Failed to load products:", e)
      toast.error(e.message || "Failed to load products list.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [offset])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    loadProducts()
  }

  const handleCheckboxChange = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllCurrentPage = () => {
    const allCurrentPageSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      products.forEach((p) => {
        if (allCurrentPageSelected) {
          next.delete(p.id)
        } else {
          next.add(p.id)
        }
      })
      return next
    })
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const triggerUpdateDates = async (idsToUpdate: string[]) => {
    const isBulkAll = idsToUpdate.length === 0
    const confirmMessage = isBulkAll
      ? "Are you sure you want to update publication and modification timestamps for ALL products in the database?"
      : `Are you sure you want to update publication and modification timestamps for the ${idsToUpdate.length} selected product(s)?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setUpdating(true)
    try {
      const res = await sdk.client.fetch<any>("/admin/products-update-dates", {
        method: "POST",
        body: { product_ids: idsToUpdate },
      })

      if (res.success) {
        toast.success(res.message || "Product dates updated successfully!")
        setSelectedIds(new Set())
        setOffset(0)
        await loadProducts()
      } else {
        throw new Error(res.error || "Failed to update dates")
      }
    } catch (e: any) {
      console.error("Update failed:", e)
      toast.error(e.message || "Failed to update dates.")
    } finally {
      setUpdating(false)
    }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <Container className="p-8" style={{ background: A.bgSubtle, color: A.fg }}>
      <div style={adminStickyHeader}>
        <div>
          <Heading level="h1" className="text-2xl font-bold flex items-center gap-2">
            <ArrowPath /> Product Dates Updater
          </Heading>
          <p style={adminDescription}>
            Manage and update publication/modification dates to control search engine indexing freshness.
          </p>
        </div>
      </div>

      {/* Actions Toolbar */}
      <div style={adminSection} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            placeholder="Search products by title..."
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedIds.size > 0 && (
            <Button
              variant="secondary"
              onClick={handleClearSelection}
              disabled={updating}
            >
              Clear Selection ({selectedIds.size})
            </Button>
          )}
          
          <Button
            variant="primary"
            onClick={() => triggerUpdateDates([...selectedIds])}
            disabled={selectedIds.size === 0 || updating}
            isLoading={updating}
          >
            Update Selected ({selectedIds.size})
          </Button>

          <Button
            variant="danger"
            onClick={() => triggerUpdateDates([])}
            disabled={updating}
            isLoading={updating}
          >
            Update All Products
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div style={adminSection} className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ui-fg-muted">
            Loading products list...
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-ui-fg-muted">
            No products found matching the criteria.
          </div>
        ) : (
          <>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className="w-12 text-center">
                    <Checkbox
                      checked={products.length > 0 && products.every((p) => selectedIds.has(p.id))}
                      onCheckedChange={handleSelectAllCurrentPage}
                      aria-label="Select all on current page"
                    />
                  </Table.HeaderCell>
                  <Table.HeaderCell>Product</Table.HeaderCell>
                  <Table.HeaderCell>Created At (Published)</Table.HeaderCell>
                  <Table.HeaderCell>Updated At (Modified)</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {products.map((product) => {
                  const isSelected = selectedIds.has(product.id)
                  return (
                    <Table.Row
                      key={product.id}
                      style={{
                        background: isSelected ? A.bgHover : undefined,
                      }}
                    >
                      <Table.Cell className="text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleCheckboxChange(product.id)}
                          aria-label={`Select ${product.title}`}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          {product.thumbnail && (
                            <img
                              src={product.thumbnail}
                              alt={product.title}
                              className="w-8 h-8 rounded object-cover border"
                              style={{ borderColor: A.borderVal }}
                            />
                          )}
                          <div>
                            <span className="font-semibold text-sm text-ui-fg-base block">
                              {product.title}
                            </span>
                            <span className="text-xs text-ui-fg-muted block">
                              {product.handle}
                            </span>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-sm">
                        {product.created_at
                          ? new Date(product.created_at).toLocaleString()
                          : "—"}
                      </Table.Cell>
                      <Table.Cell className="text-sm">
                        {product.updated_at
                          ? new Date(product.updated_at).toLocaleString()
                          : "—"}
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: A.borderVal }}>
                <Text className="text-xs text-ui-fg-muted">
                  Page {currentPage} of {totalPages} ({count} total products)
                </Text>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={offset === 0 || loading}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={offset + PAGE_SIZE >= count || loading}
                    onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Date Update",
  icon: ArrowPath,
})
