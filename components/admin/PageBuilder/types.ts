// ─── Shared Types for the Page Builder ────────────────────────────────────────

export type BlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'two-column'
  | 'cta'
  | 'divider'
  | 'spacer'
  | 'html'

// ─── Per-block prop shapes ─────────────────────────────────────────────────────

export interface HeroProps {
  heading: string
  subheading: string
  buttonText: string
  buttonLink: string
  backgroundImage: string
  /**
   * Alt text for the background photo. Optional, and empty by default: a hero
   * whose meaning is fully carried by its heading is decorative, and "" is the
   * correct markup for that. Filled in, it is what search and screen readers get.
   */
  backgroundImageAlt?: string
  backgroundColor: string
  overlayOpacity: number
  textAlign: 'left' | 'center' | 'right'
  height: 'small' | 'medium' | 'large' | 'full'
  textColor: string
}

export interface TextProps {
  html: string
  align: 'left' | 'center' | 'right'
  maxWidth: 'narrow' | 'medium' | 'wide' | 'full'
}

export interface ImageProps {
  src: string
  alt: string
  caption: string
  link: string
  width: 'small' | 'medium' | 'large' | 'full'
  align: 'left' | 'center' | 'right'
  rounded: boolean
  shadow: boolean
}

export interface TwoColumnProps {
  leftHtml: string
  rightHtml: string
  leftImage: string
  rightImage: string
  /** Alt text for each column's image; empty renders as decorative. */
  leftImageAlt?: string
  rightImageAlt?: string
  leftWidth: '30' | '40' | '50' | '60' | '70'
  gap: 'small' | 'medium' | 'large'
  reverseOnMobile: boolean
}

export interface CtaProps {
  heading: string
  subtext: string
  buttonText: string
  buttonLink: string
  secondaryButtonText: string
  secondaryButtonLink: string
  backgroundColor: string
  textColor: string
  buttonColor: string
  align: 'left' | 'center' | 'right'
  backgroundImage: string
  /** Alt text for the background photo; empty renders as decorative. */
  backgroundImageAlt?: string
}

export interface DividerProps {
  style: 'solid' | 'dashed' | 'dotted'
  color: string
  marginTop: number
  marginBottom: number
  thickness: number
}

export interface SpacerProps {
  height: number
}

export interface HtmlProps {
  html: string
}

// ─── Union of all prop types ───────────────────────────────────────────────────

export type BlockProps =
  | HeroProps
  | TextProps
  | ImageProps
  | TwoColumnProps
  | CtaProps
  | DividerProps
  | SpacerProps
  | HtmlProps

// ─── Block entity ─────────────────────────────────────────────────────────────

export interface Block {
  id: string
  type: BlockType
  props: BlockProps
}

// ─── Default props factory ─────────────────────────────────────────────────────

export const DEFAULT_PROPS: Record<BlockType, BlockProps> = {
  hero: {
    heading: 'Welcome to Our Store',
    subheading: 'Discover the finest fashion curated for you.',
    buttonText: 'Shop Now',
    buttonLink: '/shop',
    backgroundImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80',
    backgroundColor: '#18181b',
    overlayOpacity: 50,
    textAlign: 'center',
    height: 'large',
    textColor: '#ffffff',
  } as HeroProps,

  text: {
    html: '<h2>Your Heading Here</h2><p>Write your content here. You can format text, add links, and more.</p>',
    align: 'left',
    maxWidth: 'medium',
  } as TextProps,

  image: {
    src: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80',
    alt: 'Fashion image',
    caption: '',
    link: '',
    width: 'full',
    align: 'center',
    rounded: false,
    shadow: false,
  } as ImageProps,

  'two-column': {
    leftHtml: '<h3>Left Column</h3><p>Add your content here.</p>',
    rightHtml: '<h3>Right Column</h3><p>Add your content here.</p>',
    leftImage: '',
    rightImage: '',
    leftWidth: '50',
    gap: 'medium',
    reverseOnMobile: false,
  } as TwoColumnProps,

  cta: {
    heading: 'Ready to Shop?',
    subtext: 'Join thousands of happy customers.',
    buttonText: 'Get Started',
    buttonLink: '/shop',
    secondaryButtonText: '',
    secondaryButtonLink: '',
    backgroundColor: '#18181b',
    textColor: '#ffffff',
    buttonColor: '#ffffff',
    align: 'center',
    backgroundImage: '',
  } as CtaProps,

  divider: {
    style: 'solid',
    color: '#e4e4e7',
    marginTop: 24,
    marginBottom: 24,
    thickness: 1,
  } as DividerProps,

  spacer: {
    height: 60,
  } as SpacerProps,

  html: {
    html: '<p>Paste your custom HTML here.</p>',
  } as HtmlProps,
}

// ─── Block metadata (used in the panel) ───────────────────────────────────────

export interface BlockMeta {
  type: BlockType
  label: string
  description: string
  icon: string
  color: string
}

export const BLOCK_META: BlockMeta[] = [
  { type: 'hero',       label: 'Hero Banner',   description: 'Full-width hero with image & CTA',    icon: '🖼️', color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { type: 'text',       label: 'Text Block',    description: 'Heading, paragraph, rich text',        icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { type: 'image',      label: 'Image',         description: 'Single image with caption',            icon: '🌄', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { type: 'two-column', label: 'Two Columns',   description: 'Side-by-side content layout',          icon: '⬜', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { type: 'cta',        label: 'Call to Action', description: 'Banner with buttons',                 icon: '🎯', color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { type: 'divider',    label: 'Divider',       description: 'Horizontal rule separator',            icon: '➖', color: 'bg-zinc-50 border-zinc-200 text-zinc-600' },
  { type: 'spacer',     label: 'Spacer',        description: 'Blank vertical space',                 icon: '↕️', color: 'bg-zinc-50 border-zinc-200 text-zinc-600' },
  { type: 'html',       label: 'Custom HTML',   description: 'Raw HTML / embed code',               icon: '💻', color: 'bg-orange-50 border-orange-200 text-orange-700' },
]

// ─── Utility ───────────────────────────────────────────────────────────────────

export function createBlock(type: BlockType): Block {
  return {
    id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    props: { ...DEFAULT_PROPS[type] },
  }
}

export function parseContent(raw: string): Block[] {
  if (!raw || raw.trim() === '') return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  // Legacy HTML — wrap in a single html block
  return [createBlock('html').valueOf() as Block].map(b => ({
    ...b,
    props: { html: raw } as HtmlProps,
  }))
}

export function serializeContent(blocks: Block[]): string {
  return JSON.stringify(blocks, null, 2)
}
