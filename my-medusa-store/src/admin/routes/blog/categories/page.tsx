import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Table,
  Input,
  Label,
  Textarea,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { blogApi } from "../../../lib/sdk"
import { A } from "../../../lib/admin-theme"

type Category = {
  id: string
  name: string
  handle: string
  description: string | null
  created_at: string
}

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await blogApi.listCategories()
      setCategories(data.categories || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setName("")
    setHandle("")
    setDescription("")
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setName(cat.name)
    setHandle(cat.handle)
    setDescription(cat.description || "")
    setShowForm(true)
  }

  const onSave = async () => {
    if (!name.trim()) {
      alert("Name is required")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await blogApi.updateCategory(editingId, {
          name,
          handle: handle || undefined,
          description: description || null,
        })
      } else {
        await blogApi.createCategory({
          name,
          handle: handle || undefined,
          description: description || null,
        })
      }
      resetForm()
      await load()
    } catch (e) {
      alert("Failed to save: " + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return
    try {
      await blogApi.deleteCategory(id)
      await load()
    } catch (e) {
      alert("Failed to delete: " + (e as Error).message)
    }
  }

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Heading>Blog Categories</Heading>
        <div className="flex gap-2">
          <a href="/app/blog">
            <Button variant="secondary">← Back to Posts</Button>
          </a>
          {!showForm && (
            <Button
              variant="primary"
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
            >
              + New Category
            </Button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Container className="p-4 mb-4" style={{ background: A.bgCard, borderRadius: 8, border: A.border }}>
          <Heading level="h3" className="mb-3">
            {editingId ? "Edit Category" : "New Category"}
          </Heading>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <Label htmlFor="catName">Name *</Label>
              <Input
                id="catName"
                placeholder="Category name"
                value={name}
                onChange={(e: any) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="catHandle">Handle (slug)</Label>
              <Input
                id="catHandle"
                placeholder="auto-generated from name"
                value={handle}
                onChange={(e: any) => setHandle(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <Label htmlFor="catDesc">Description</Label>
            <Textarea
              id="catDesc"
              placeholder="Optional description..."
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="primary" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Container>
      )}

      {/* Categories Table */}
      {loading ? (
        <p>Loading...</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-500">No categories yet. Create your first one.</p>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Handle</Table.HeaderCell>
              <Table.HeaderCell>Description</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {categories.map((cat) => (
              <Table.Row key={cat.id}>
                <Table.Cell style={{ fontWeight: 500 }}>{cat.name}</Table.Cell>
                <Table.Cell style={{ color: A.fgSubtle }}>{cat.handle}</Table.Cell>
                <Table.Cell style={{ color: A.fgSubtle, maxWidth: 300 }}>
                  {cat.description || "—"}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => startEdit(cat)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => onDelete(cat.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Blog Categories",
})

export default CategoriesPage
