import type { SpacerData } from "@/lib/landing/sections"

export default function SpacerRender({ data }: { data: SpacerData }) {
  return <div style={{ height: data.height }} aria-hidden="true" />
}
