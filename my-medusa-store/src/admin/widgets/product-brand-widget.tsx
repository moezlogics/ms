import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Select, Label, Button, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
  AdminBrand,
  listBrands,
  getProductBrand,
  setProductBrand,
  removeProductBrand,
} from "../lib/brands-sdk"
import { A } from "../lib/admin-theme"

interface NestedBrand extends AdminBrand {
  depth: number
}

function getNestedBrandsList(flatBrands: AdminBrand[]): NestedBrand[] {
  const byParent = new Map<string, AdminBrand[]>()
  const roots: AdminBrand[] = []

  for (const b of flatBrands) {
    if (!b.parent_id) {
      roots.push(b)
    } else {
      const list = byParent.get(b.parent_id) || []
      list.push(b)
      byParent.set(b.parent_id, list)
    }
  }

  const sortFn = (a: AdminBrand, b: AdminBrand) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)

  roots.sort(sortFn)

  const result: NestedBrand[] = []

  function walk(brand: AdminBrand, depth: number) {
    result.push({ ...brand, depth })
    const children = byParent.get(brand.id) || []
    children.sort(sortFn)
    for (const child of children) {
      walk(child, depth + 1)
    }
  }

  for (const root of roots) {
    walk(root, 0)
  }

  const visited = new Set(result.map((r) => r.id))
  for (const b of flatBrands) {
    if (!visited.has(b.id)) {
      result.push({ ...b, depth: 0 })
    }
  }

  return result
}

const ProductBrandWidget = () => {
  const { id: productId } = useParams()
  const [brands, setBrands] = useState<AdminBrand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [savedBrandId, setSavedBrandId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!productId) return

    Promise.all([listBrands(), getProductBrand(productId)])
      .then(([brandList, currentBrand]) => {
        setBrands(brandList)
        const bid = currentBrand?.id || ""
        setSelectedBrandId(bid)
        setSavedBrandId(bid)
      })
      .catch((e) => toast.error("Failed to load brands: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [productId])

  const onSave = async () => {
    if (!productId) return
    setSaving(true)
    try {
      if (selectedBrandId) {
        await setProductBrand(productId, selectedBrandId)
      } else {
        await removeProductBrand(productId)
      }
      setSavedBrandId(selectedBrandId)
      toast.success("Brand updated")
    } catch (e) {
      toast.error("Save failed: " + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = selectedBrandId !== savedBrandId
  const nestedBrands = getNestedBrandsList(brands)

  if (loading) {
    return (
      <Container className="p-4">
        <Label>Brand</Label>
        <p style={{ fontSize: 13, color: A.fgMuted }}>Loading...</p>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <div style={{ marginBottom: 8 }}>
        <Label>Brand</Label>
        <p style={{ fontSize: 12, color: A.fgMuted, marginTop: 2 }}>
          Assign this product to a brand
        </p>
      </div>

      <Select
        value={selectedBrandId || "__none__"}
        onValueChange={(v) => setSelectedBrandId(v === "__none__" ? "" : v)}
      >
        <Select.Trigger>
          <Select.Value placeholder="Select a brand..." />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="__none__">No brand</Select.Item>
          {nestedBrands.map((b) => (
            <Select.Item key={b.id} value={b.id}>
              {"\u00A0\u00A0".repeat(b.depth)}
              {b.depth > 0 ? "— " : ""}
              {b.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>

      {hasChanges && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="primary"
            size="small"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Brand"}
          </Button>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductBrandWidget
