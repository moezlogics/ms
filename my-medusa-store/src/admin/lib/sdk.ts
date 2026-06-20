import Medusa from "@medusajs/js-sdk"
import { cdnUpload } from "./cdn-upload"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

export const blogApi = {
  listPosts: async (params?: any) => {
    const qs = params ? new URLSearchParams(params).toString() : ""
    return sdk.client.fetch(`/admin/blog/posts${qs ? `?${qs}` : ""}`, { method: "GET" })
  },
  getPost: async (id: string) => {
    return sdk.client.fetch(`/admin/blog/posts/${id}`, { method: "GET" })
  },
  createPost: async (data: any) => {
    return sdk.client.fetch(`/admin/blog/posts`, { method: "POST", body: data })
  },
  updatePost: async (id: string, data: any) => {
    return sdk.client.fetch(`/admin/blog/posts/${id}`, { method: "POST", body: data })
  },
  deletePost: async (id: string) => {
    return sdk.client.fetch(`/admin/blog/posts/${id}`, { method: "DELETE" })
  },
  listCategories: async (params?: any) => {
    const qs = params ? new URLSearchParams(params).toString() : ""
    return sdk.client.fetch(`/admin/blog/categories${qs ? `?${qs}` : ""}`, { method: "GET" })
  },
  createCategory: async (data: any) => {
    return sdk.client.fetch(`/admin/blog/categories`, { method: "POST", body: data })
  },
  updateCategory: async (id: string, data: any) => {
    return sdk.client.fetch(`/admin/blog/categories/${id}`, { method: "POST", body: data })
  },
  deleteCategory: async (id: string) => {
    return sdk.client.fetch(`/admin/blog/categories/${id}`, { method: "DELETE" })
  },
  uploadImage: async (file: File) => {
    return cdnUpload(file)
  }
}
