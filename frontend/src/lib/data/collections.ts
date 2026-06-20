"use server"

import { cache } from "react"
import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const retrieveCollection = cache(async (id: string) => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return sdk.client
    .fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {
        next,
        cache: "force-cache",
      }
    )
    .then(({ collection }) => collection)
})

export const listCollections = cache(async (
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  queryParams.limit = queryParams.limit || "100"
  queryParams.offset = queryParams.offset || "0"

  return sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
      "/store/collections",
      {
        query: {
          ...queryParams,
          fields: queryParams.fields
            ? `${queryParams.fields},+metadata`
            : "+metadata",
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ collections }) => ({ collections, count: collections.length }))
})

export const getCollectionByHandle = cache(async (
  handle: string
): Promise<HttpTypes.StoreCollection> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreCollectionListResponse>(`/store/collections`, {
      query: { handle, fields: "*products,+metadata" },
      next,
      cache: "force-cache",
    })
    .then(({ collections }) => collections[0])
})
