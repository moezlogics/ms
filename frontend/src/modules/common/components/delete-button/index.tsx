"use client"

import { deleteLineItem } from "@lib/data/cart"
import { useState } from "react"

const DeleteButton = ({
  id,
  children,
  className,
  "data-testid": testId,
}: {
  id: string
  children?: React.ReactNode
  className?: string
  "data-testid"?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await deleteLineItem(id).catch(() => setIsDeleting(false))
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      data-testid={testId}
      className={className ?? "flex items-center gap-1 text-ink/40 hover:text-danger transition-colors text-xs"}
      aria-label="Remove item"
    >
      {isDeleting ? (
        <i className="ph-bold ph-spinner animate-spin text-sm" aria-hidden />
      ) : (
        <i className="ph-bold ph-trash text-sm" aria-hidden />
      )}
      {children && <span>{children}</span>}
    </button>
  )
}

export default DeleteButton
