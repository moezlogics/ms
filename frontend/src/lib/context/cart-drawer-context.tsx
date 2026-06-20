"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

interface CartDrawerContextType {
  isOpen: boolean
  open: () => void
  close: () => void
}

const CartDrawerContext = createContext<CartDrawerContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export const CartDrawerProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <CartDrawerContext.Provider value={{ isOpen, open, close }}>
      {children}
    </CartDrawerContext.Provider>
  )
}

export const useCartDrawer = () => useContext(CartDrawerContext)
