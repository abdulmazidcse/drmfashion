import type { Metadata } from "next"
import InvoiceClient from "./InvoiceClient"

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Invoice #${id.slice(-8).toUpperCase()}`,
  }
}

export default async function InvoicePage({ params }: Params) {
  const { id } = await params
  return <InvoiceClient id={id} />
}
