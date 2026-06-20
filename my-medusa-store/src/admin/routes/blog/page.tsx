import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Table, Badge, Input } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { blogApi } from "../../lib/sdk"

type Post = {
  id: string
  title: string
  handle: string
  status: "draft" | "published"
  published_at: string | null
  created_at: string
  categories?: { id: string; name: string }[]
}

const Page = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const data = await blogApi.listPosts({ q })
      setPosts(data.posts || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return
    await blogApi.deletePost(id)
    await load()
  }

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Heading>Blog Posts</Heading>
        <div className="flex gap-2">
          <a href="/app/blog/categories">
            <Button variant="secondary">Categories</Button>
          </a>
          <a href="/app/blog/posts/new">
            <Button variant="primary">+ New Post</Button>
          </a>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search by title..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button variant="secondary" onClick={load}>
          Search
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">No posts yet. Create your first one.</p>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Handle</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Categories</Table.HeaderCell>
              <Table.HeaderCell>Created</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {posts.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell>{p.title}</Table.Cell>
                <Table.Cell>{p.handle}</Table.Cell>
                <Table.Cell>
                  <Badge color={p.status === "published" ? "green" : "grey"}>
                    {p.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {(p.categories || []).map((c) => c.name).join(", ") || "—"}
                </Table.Cell>
                <Table.Cell>
                  {new Date(p.created_at).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <a href={`/app/blog/posts/${p.id}`}>
                      <Button variant="secondary" size="small">
                        Edit
                      </Button>
                    </a>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => onDelete(p.id)}
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
  label: "Blog",
})

export default Page
