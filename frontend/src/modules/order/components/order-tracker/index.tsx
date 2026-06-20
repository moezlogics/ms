import React from "react"
import { HttpTypes } from "@medusajs/types"

type OrderTrackerProps = {
  order: HttpTypes.StoreOrder
}

export default function OrderTracker({ order }: OrderTrackerProps) {
  const getStepStatus = (stepIndex: number): "completed" | "current" | "upcoming" | "canceled" => {
    const isCanceled = order.status === "canceled"
    if (isCanceled) return "canceled"

    const fStatus = order.fulfillment_status
    const oStatus = order.status

    if (stepIndex === 0) {
      return "completed"
    }

    if (stepIndex === 1) {
      if (fStatus === "fulfilled" || fStatus === "shipped" || oStatus === "completed") {
        return "completed"
      }
      return "current"
    }

    if (stepIndex === 2) {
      if (oStatus === "completed") {
        return "completed"
      }
      if (fStatus === "fulfilled" || fStatus === "shipped") {
        return "current"
      }
      return "upcoming"
    }

    return "upcoming"
  }

  const steps = [
    {
      title: "Order Confirmed",
      description: "We've received your order and are preparing it.",
      icon: "ph-bold ph-receipt",
    },
    {
      title: "Shipped Out",
      description: "Your package is on its way to you.",
      icon: "ph-bold ph-truck",
    },
    {
      title: "Delivered",
      description: "Delivered to your shipping address.",
      icon: "ph-bold ph-check-circle",
    },
  ]

  const getOverallStatusMessage = () => {
    if (order.status === "canceled") return "Order Canceled"
    if (order.status === "completed") return "Delivered"
    if (order.fulfillment_status === "shipped" || order.fulfillment_status === "fulfilled") return "Shipped"
    return "Processing"
  }

  const getStatusBadgeClass = () => {
    if (order.status === "canceled") return "bg-danger/10 text-danger border border-danger/20"
    if (order.status === "completed") return "bg-success/10 text-success border border-success/20"
    if (order.fulfillment_status === "shipped" || order.fulfillment_status === "fulfilled") return "bg-info/10 text-info border border-info/20"
    return "bg-warning/10 text-warning border border-warning/20"
  }

  const step1Status = getStepStatus(1)
  const step2Status = getStepStatus(2)

  return (
    <div className="w-full space-y-4">
      {/* Sleek App-like Status Overview Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl bg-surface border border-line/35 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full tracking-wide ${getStatusBadgeClass()}`}>
            <span className="relative flex h-2 w-2">
              {order.status !== "canceled" && order.status !== "completed" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
            </span>
            {getOverallStatusMessage()}
          </span>
          <div className="h-4 w-[1px] bg-line/50 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs text-ink/70">
            <span>Order ID:</span>
            <span className="font-bold text-ink font-mono bg-surface-alt/10 px-2 py-0.5 rounded border border-line/20">{order.display_id}</span>
          </div>
        </div>
      </div>

      {/* Stepper Card */}
      <div className="p-6 sm:p-8 bg-surface border border-line/35 rounded-3xl shadow-sm relative overflow-hidden">
        {/* Desktop View (Horizontal) */}
        <div className="hidden md:flex items-start justify-between relative w-full pt-4 pb-2 z-10">
          {/* Background track line */}
          <div className="absolute top-[28px] left-[16.67%] right-[16.67%] h-[3px] bg-line/25 -z-10 rounded-full">
            {/* Active progress fill line */}
            <div 
              className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-700 ease-in-out" 
              style={{
                width: step2Status === "completed" ? "100%" : step1Status === "completed" ? "50%" : "0%"
              }}
            />
          </div>

          {steps.map((step, idx) => {
            const status = getStepStatus(idx)
            return (
              <div key={idx} className="flex flex-col items-center text-center w-1/3 px-2">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                    status === "completed" 
                      ? "bg-success text-white shadow-md shadow-success/10 border border-transparent scale-105" 
                      : status === "current"
                      ? "bg-primary text-primary-fg ring-4 ring-primary/10 shadow-sm border border-transparent scale-105"
                      : status === "canceled"
                      ? "bg-danger text-white shadow-md"
                      : "bg-surface-alt text-ink/30 border border-line/40"
                  }`}
                >
                  <i className={`${step.icon} text-lg`} />
                  {status === "completed" && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-success text-white rounded-full p-0.5 border border-surface shadow-xs">
                      <i className="ph-bold ph-check text-[8px]" />
                    </span>
                  )}
                </div>

                <h4 className={`text-xs font-bold mt-3 transition-colors duration-300 ${
                  status === "completed" ? "text-ink" : status === "current" ? "text-primary" : "text-ink/40"
                }`}>
                  {step.title}
                </h4>
                <p className="text-[10px] text-ink/50 mt-1 max-w-[140px] leading-relaxed">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Mobile View (Vertical - App Like) */}
        <div className="md:hidden flex flex-col relative pl-2 z-10">
          {/* Background vertical line */}
          <div className="absolute top-5 bottom-5 left-[24px] w-[2px] bg-line/25 -z-10">
            {/* Active vertical line */}
            <div 
              className="w-full bg-gradient-to-b from-primary to-success transition-all duration-700 ease-in-out rounded-full" 
              style={{
                height: step2Status === "completed" ? "100%" : step1Status === "completed" ? "50%" : "0%"
              }}
            />
          </div>

          <div className="space-y-8">
            {steps.map((step, idx) => {
              const status = getStepStatus(idx)
              return (
                <div key={idx} className="flex gap-4 items-start">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 relative ${
                      status === "completed" 
                        ? "bg-success text-white shadow-sm shadow-success/15 border border-transparent" 
                        : status === "current"
                        ? "bg-primary text-primary-fg ring-4 ring-primary/10 shadow-sm border border-transparent"
                        : status === "canceled"
                        ? "bg-danger text-white shadow-sm"
                        : "bg-surface-alt text-ink/30 border border-line/45"
                    }`}
                  >
                    <i className={`${step.icon} text-base`} />
                    {status === "completed" && (
                      <span className="absolute -bottom-0.5 -right-0.5 bg-success text-white rounded-full p-0.5 border border-surface shadow-xs">
                        <i className="ph-bold ph-check text-[7px]" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col pt-1">
                    <h4 className={`text-xs font-bold transition-colors ${
                      status === "completed" ? "text-ink" : status === "current" ? "text-primary" : "text-ink/40"
                    }`}>
                      {step.title}
                    </h4>
                    <p className="text-[10px] text-ink/50 mt-0.5 leading-relaxed max-w-xs">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

