import { retrieveOrder } from "@lib/data/orders"
import ReturnWizard from "@modules/order/components/return-wizard"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export default async function ReturnPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  return (
    <div className="py-10 md:py-16 min-h-[calc(100vh-64px)] bg-bg/50 animate-enter">
      <div className="content-container max-w-3xl mx-auto px-4">
        <ReturnWizard order={order} />
      </div>
    </div>
  )
}
