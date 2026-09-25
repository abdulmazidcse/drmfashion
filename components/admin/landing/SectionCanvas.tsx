"use client"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronUp, ChevronDown, Copy, Trash2, GripVertical, Eye, EyeOff, FileText } from "lucide-react"
import type { Section, LandingTheme } from "@/lib/landing/sections"
import { SECTION_META } from "@/lib/landing/sections"
import { PADDING_CLASS, WIDTH_CLASS, sectionColors } from "@/components/landing/shared"
import HeroRender from "@/components/landing/sections/HeroRender"
import HeadlineRender from "@/components/landing/sections/HeadlineRender"
import TextRender from "@/components/landing/sections/TextRender"
import ImageRender from "@/components/landing/sections/ImageRender"
import GalleryRender from "@/components/landing/sections/GalleryRender"
import VideoRender from "@/components/landing/sections/VideoRender"
import FeaturesRender from "@/components/landing/sections/FeaturesRender"
import CountdownRender from "@/components/landing/sections/CountdownRender"
import PricingRender from "@/components/landing/sections/PricingRender"
import CtaRender from "@/components/landing/sections/CtaRender"
import FaqRender from "@/components/landing/sections/FaqRender"
import SpacerRender from "@/components/landing/sections/SpacerRender"
import HtmlRender from "@/components/landing/sections/HtmlRender"
import { OrderPreview } from "@/components/admin/landing/sections/OrderSection"

interface Props {
  sections: Section[]
  theme: LandingTheme
  productCount: number
  selectedId: string | null
  onSelect: (id: string) => void
  onReorder: (next: Section[]) => void
  onMove: (id: string, dir: "up" | "down") => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onToggleHidden: (id: string) => void
}

function SectionPreview({ section, theme, productCount }: { section: Section; theme: LandingTheme; productCount: number }) {
  switch (section.type) {
    case "hero": return <HeroRender data={section.data} theme={theme} />
    case "headline": return <HeadlineRender data={section.data} theme={theme} />
    case "text": return <TextRender data={section.data} />
    case "image": return <ImageRender data={section.data} />
    case "gallery": return <GalleryRender data={section.data} />
    case "video": return <VideoRender data={section.data} />
    case "features": return <FeaturesRender data={section.data} theme={theme} />
    case "countdown": return <CountdownRender id={section.id} data={section.data} theme={theme} />
    case "pricing": return <PricingRender data={section.data} theme={theme} />
    case "cta": return <CtaRender data={section.data} theme={theme} />
    case "faq": return <FaqRender data={section.data} />
    case "spacer": return <SpacerRender data={section.data} />
    case "html": return <HtmlRender data={section.data} />
    case "order": return <OrderPreview data={section.data} productCount={productCount} />
    default: return null
  }
}

function ControlBtn({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
  danger?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-6 h-6 flex items-center justify-center rounded text-white shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        danger ? "bg-red-500 hover:bg-red-600" : "bg-zinc-800 hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  )
}

function SortableRow({
  section,
  index,
  total,
  isSelected,
  theme,
  productCount,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onToggleHidden,
}: {
  section: Section
  index: number
  total: number
  isSelected: boolean
  theme: LandingTheme
  productCount: number
  onSelect: (id: string) => void
  onMove: (id: string, dir: "up" | "down") => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onToggleHidden: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const meta = SECTION_META.find((m) => m.type === section.type)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : section.hidden ? 0.45 : 1 }}
      className={`relative group transition-all ${isSelected ? "ring-2 ring-inset ring-blue-500" : "hover:ring-1 hover:ring-inset hover:ring-zinc-300"}`}
      onClick={() => onSelect(section.id)}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 w-7 h-5 flex items-center justify-center rounded bg-zinc-800/80 text-white cursor-grab active:cursor-grabbing transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Type badge */}
      <div
        className={`absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold border bg-white transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <span>{meta?.icon}</span>
        <span>{meta?.label}</span>
      </div>

      {/* Controls */}
      <div className={`absolute top-2 right-2 z-20 flex items-center gap-1 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <ControlBtn onClick={(e) => { e.stopPropagation(); onToggleHidden(section.id) }} title={section.hidden ? "Show" : "Hide"}>
          {section.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </ControlBtn>
        <ControlBtn onClick={(e) => { e.stopPropagation(); onMove(section.id, "up") }} disabled={index === 0} title="Move up">
          <ChevronUp className="w-3 h-3" />
        </ControlBtn>
        <ControlBtn onClick={(e) => { e.stopPropagation(); onMove(section.id, "down") }} disabled={index === total - 1} title="Move down">
          <ChevronDown className="w-3 h-3" />
        </ControlBtn>
        <ControlBtn onClick={(e) => { e.stopPropagation(); onDuplicate(section.id) }} title="Duplicate">
          <Copy className="w-3 h-3" />
        </ControlBtn>
        <ControlBtn onClick={(e) => { e.stopPropagation(); onDelete(section.id) }} title="Delete" danger>
          <Trash2 className="w-3 h-3" />
        </ControlBtn>
      </div>

      <div className="pointer-events-none select-none" style={sectionColors(section.style, theme)}>
        <div className={PADDING_CLASS[section.style.padding]}>
          <div className={`mx-auto ${section.type === "order" ? "" : WIDTH_CLASS[theme.width]}`}>
            <SectionPreview section={section} theme={theme} productCount={productCount} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SectionCanvas({
  sections,
  theme,
  productCount,
  selectedId,
  onSelect,
  onReorder,
  onMove,
  onDuplicate,
  onDelete,
  onToggleHidden,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(sections, oldIndex, newIndex))
  }

  if (sections.length === 0) {
    return (
      <div className="flex-1 bg-zinc-50 flex flex-col items-center justify-center gap-4 text-center p-12">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zinc-200 flex items-center justify-center">
          <FileText className="w-7 h-7 text-zinc-300" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-600">This page is empty</p>
          <p className="text-xs text-zinc-400 mt-1">Click a section type in the left panel to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-100">
      <div className="max-w-5xl mx-auto my-6 bg-white shadow-lg rounded-lg overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map((section, index) => (
              <SortableRow
                key={section.id}
                section={section}
                index={index}
                total={sections.length}
                isSelected={section.id === selectedId}
                theme={theme}
                productCount={productCount}
                onSelect={onSelect}
                onMove={onMove}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onToggleHidden={onToggleHidden}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <div className="h-16" />
    </div>
  )
}
