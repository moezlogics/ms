import React, { useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Table,
  Badge,
  Button,
  Text,
  Input,
} from "@medusajs/ui"
import { ChatBubbleLeftRight, CheckCircle, XCircle, CheckCircleSolid } from "@medusajs/icons"

export const routeConfig = defineRouteConfig({
  label: "Reviews",
  icon: ChatBubbleLeftRight,
})

type Review = {
  id: string
  rating: number
  content: string
  status: "pending" | "approved" | "flagged"
  created_at: string
  product_id: string
  customer_id?: string
  guest_name?: string
  guest_email?: string
  is_verified: boolean
  photos: string[]
  owner_reply?: string
  customer?: any
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/admin/advanced-reviews`, {
        method: "GET",
        credentials: "include",
      })
      if (res.ok) {
        const json = await res.json()
        setReviews(json.reviews || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const handleUpdateStatus = async (id: string, status: "approved" | "flagged") => {
    try {
      await fetch(`/admin/advanced-reviews/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
      fetchReviews()
    } catch (e) {
      alert("Failed to update status")
    }
  }

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return
    try {
      await fetch(`/admin/advanced-reviews/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: replyText }),
      })
      setReplyingTo(null)
      setReplyText("")
      fetchReviews()
    } catch (e) {
      alert("Failed to save response")
    }
  }

  return (
    <Container className="p-8">
      <div className="flex justify-between items-center mb-6">
        <Heading level="h1" className="text-2xl font-bold flex items-center gap-2">
          <ChatBubbleLeftRight /> Product Reviews
        </Heading>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Rating</Table.HeaderCell>
            <Table.HeaderCell>Reviewer Info</Table.HeaderCell>
            <Table.HeaderCell>Review Content</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Date</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Row>
              <Table.Cell colSpan={6} className="text-center text-ui-fg-subtle py-8">
                Loading reviews...
              </Table.Cell>
            </Table.Row>
          ) : reviews.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={6} className="text-center text-ui-fg-subtle py-8">
                No reviews found.
              </Table.Cell>
            </Table.Row>
          ) : (
            reviews.map((rw) => (
              <React.Fragment key={rw.id}>
                <Table.Row>
                  <Table.Cell className="font-bold text-lg">{rw.rating} ⭐</Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-medium">
                        {rw.is_verified ? (
                          <>
                            {rw.customer ? `${rw.customer.first_name} ${rw.customer.last_name}` : "Verified Account"}
                            <CheckCircleSolid className="text-blue-500 w-4 h-4" />
                          </>
                        ) : (
                          <>
                            {rw.guest_name ? `Guest: ${rw.guest_name}` : "Unknown Guest"}
                          </>
                        )}
                      </div>
                      {!rw.is_verified && rw.guest_email && (
                        <Text className="text-xs text-ui-fg-subtle">{rw.guest_email}</Text>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="max-w-md">
                      <p className="text-ui-fg-subtle text-sm truncate">{rw.content}</p>
                      {rw.photos && rw.photos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {rw.photos.map((url, i) => (
                            <img key={i} src={url} alt="Review" className="w-10 h-10 rounded object-cover border" />
                          ))}
                        </div>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={rw.status === "approved" ? "green" : rw.status === "flagged" ? "red" : "orange"}>
                      {rw.status.toUpperCase()}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{new Date(rw.created_at).toLocaleDateString()}</Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {rw.status !== "approved" && (
                        <Button variant="secondary" onClick={() => handleUpdateStatus(rw.id, "approved")}>
                          <CheckCircle className="text-ui-fg-success" />
                        </Button>
                      )}
                      {rw.status !== "flagged" && (
                        <Button variant="secondary" onClick={() => handleUpdateStatus(rw.id, "flagged")}>
                          <XCircle className="text-ui-fg-error" />
                        </Button>
                      )}
                      {!rw.owner_reply && (
                        <Button variant="secondary" onClick={() => setReplyingTo(replyingTo === rw.id ? null : rw.id)}>
                          Reply
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
                
                {(rw.owner_reply || replyingTo === rw.id) && (
                  <Table.Row className="bg-ui-bg-subtle">
                    <Table.Cell colSpan={6} className="pl-12 py-3">
                      {rw.owner_reply ? (
                        <div>
                          <Text className="text-xs font-bold text-ui-fg-subtle mb-1">Your Response:</Text>
                          <Text className="text-sm">{rw.owner_reply}</Text>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 max-w-2xl">
                          <Input 
                            value={replyText} 
                            onChange={(e: any) => setReplyText(e.target.value)} 
                            placeholder="Write an official store response..." 
                            className="flex-1"
                          />
                          <Button variant="primary" onClick={() => handleReply(rw.id)}>Send Reply</Button>
                        </div>
                      )}
                    </Table.Cell>
                  </Table.Row>
                )}
              </React.Fragment>
            ))
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}
