"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import Nestable from 'react-nestable';
import 'react-nestable/dist/styles/index.css';
import { Trash2, Pencil, Loader2, GripVertical, Menu as MenuIcon, ChevronDown, ChevronUp, Link as LinkIcon, FileText, FolderTree } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type MenuItem = {
  id: string
  title: string
  url: string
  position: number
  imageUrl?: string
  parentId?: string | null
  children?: MenuItem[]
}

type Category = { id: string, name: string, slug: string, parentId?: string | null }
type Page = { id: string, title: string, slug: string }

type FormValues = {
  title: string
  url: string
  imageUrl: string
  parentId: string
}

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<(Category & { depth: number })[]>([])
  const [pages, setPages] = useState<Page[]>([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  
  // Accordion states
  const [openAccordion, setOpenAccordion] = useState<string | null>("custom")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPages, setSelectedPages] = useState<string[]>([])

  const { register, handleSubmit, reset } = useForm<FormValues>()
  const editForm = useForm<FormValues>()

  useEffect(() => { 
    fetchMenus() 
    fetchOptions()
  }, [])

  // Used for select dropdown in edit modal
  const flattenTree = (items: any[], depth = 0): any[] => {
    return items.reduce((acc, item) => {
      acc.push({ ...item, depth });
      if (item.children && item.children.length > 0) {
        acc = acc.concat(flattenTree(item.children, depth + 1));
      }
      return acc;
    }, [] as any);
  };
  const flattenedMenus = flattenTree(menus);

  async function fetchMenus() {
    try {
      setLoading(true)
      const res = await api.get("/admin/menus")
      setMenus(res.data)
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchOptions() {
    try {
      const catRes = await api.get("/admin/categories")
      const pagesRes = await api.get("/admin/pages")
      setCategories(flattenTree(catRes.data) as any)
      setPages(pagesRes.data)
    } catch (error) {
      console.log(error)
    }
  }

  async function onAddCustomLink(data: FormValues) {
    if (!data.title || !data.url) return;
    setSubmitting(true)
    try {
      await api.post("/admin/menus", { title: data.title, url: data.url })
      reset()
      fetchMenus()
    } catch (error: any) {
      Swal.fire({ text: error.response?.data?.message || "Failed to add item.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function onAddCategories() {
    if (selectedCategories.length === 0) return;
    setSubmitting(true)
    try {
      const categoryToMenuId: Record<string, string> = {};
      
      const selectedCatsObjects = selectedCategories
        .map(id => categories.find(c => c.id === id))
        .filter(Boolean) as (Category & { depth: number })[];
        
      // Sort selected categories by depth so parents are created before children
      selectedCatsObjects.sort((a, b) => (a.depth || 0) - (b.depth || 0));

      for (const cat of selectedCatsObjects) {
        let menuParentId = null;
        if (cat.parentId && categoryToMenuId[cat.parentId]) {
           menuParentId = categoryToMenuId[cat.parentId];
        }

        const res = await api.post("/admin/menus", { 
          title: cat.name, 
          url: `/category/${cat.slug}`,
          parentId: menuParentId
        });
        
        if (res.data && res.data.id) {
          categoryToMenuId[cat.id] = res.data.id;
        }
      }
      setSelectedCategories([])
      fetchMenus()
    } catch (error) {
      Swal.fire({ text: "Failed to add categories.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function onAddPages() {
    if (selectedPages.length === 0) return;
    setSubmitting(true)
    try {
      for (const pageId of selectedPages) {
        const page = pages.find(p => p.id === pageId);
        if (page) {
          await api.post("/admin/menus", { title: page.title, url: `/pages/${page.slug}` })
        }
      }
      setSelectedPages([])
      fetchMenus()
    } catch (error) {
      Swal.fire({ text: "Failed to add pages.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function onEditSubmit(data: FormValues) {
    if (!editingItem) return
    try {
      setSubmitting(true)
      await api.patch(`/admin/menus/${editingItem.id}`, { ...data, parentId: data.parentId || null })
      setEditingItem(null)
      fetchMenus()
    } catch (error: any) {
      Swal.fire({ text: error.response?.data?.message || "Failed to update item.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This will also delete all sub-menus.")) return;
    try {
      await api.delete(`/admin/menus/${id}`)
      fetchMenus()
    } catch (error: any) {
      Swal.fire({ text: "Failed to delete.", confirmButtonColor: "#18181b", icon: "error" })
    }
  }

  async function handleNestableChange({ items }: any) {
    setMenus(items);
    
    // Flatten the new tree to send positions and parentIds to the backend
    const flattened: any[] = [];
    const traverse = (list: MenuItem[], parentId: string | null = null) => {
      list.forEach((item, index) => {
        flattened.push({
          id: item.id,
          position: index,
          parentId
        });
        if (item.children && item.children.length > 0) {
          traverse(item.children, item.id);
        }
      });
    };
    traverse(items);

    try {
      await api.post("/admin/menus/reorder", { items: flattened });
    } catch (error) {
      console.error(error);
      Swal.fire({ text: "Failed to save menu order.", icon: "error" });
    }
  }

  const renderItem = ({ item, collapseIcon, handler }: any) => {
    return (
      <div className="flex items-center justify-between gap-2 p-3 bg-card border border-border rounded-xl mb-2 hover:border-foreground/20 transition-colors shadow-sm">
        {/* `min-w-0` on both the flex child and the text wrapper: without it a
            flex item refuses to shrink below its content, so at nesting depth 3
            the label was squeezed out of the row entirely instead of
            ellipsising. `shrink-0` keeps the buttons from being crushed. */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {handler}
          {collapseIcon}
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm truncate" title={item.title}>{item.title}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate" title={item.url}>{item.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={() => {
              setEditingItem(item);
              editForm.reset({ title: item.title, url: item.url, imageUrl: item.imageUrl || "", parentId: item.parentId || "" });
            }}
          >
            <Pencil size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(item.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    );
  }

  const toggleCat = (id: string) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const togglePage = (id: string) => {
    setSelectedPages(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  // Drives the select-all links: once everything is ticked the same link clears
  // the list instead, so there is a way back out of a full selection.
  const allCatsSelected = categories.length > 0 && selectedCategories.length === categories.length
  const allPagesSelected = pages.length > 0 && selectedPages.length === pages.length

  // Full width, unlike the other admin screens: the tree nests three levels
  // deep and each level costs horizontal room, so a centred max-width container
  // left no space for the deepest labels.
  return (
    <div className="space-y-6 w-full p-2">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-primary text-primary-foreground rounded-xl"><MenuIcon size={20} /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Menu Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build your navigation by adding items from the left</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN - ADD ITEMS. Fixed width so every extra pixel of screen
            goes to the tree instead of being split proportionally. */}
        <div className="w-full lg:w-80 lg:shrink-0 space-y-4">
          <h2 className="font-semibold text-foreground text-sm mb-3 px-1">Add menu items</h2>

          {/* Categories Accordion */}
          <Card className="p-0 gap-0 overflow-hidden">
            <button onClick={() => setOpenAccordion(openAccordion === 'cats' ? null : 'cats')} className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground"><FolderTree size={16} className="text-muted-foreground" /> Categories</div>
              {openAccordion === 'cats' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openAccordion === 'cats' && (
              <div className="p-4 border-t border-border">
                <div className="max-h-48 overflow-y-auto space-y-2 mb-4 pr-2 scrollbar-thin">
                  {categories.map((cat: any) => (
                    <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                      <input type="checkbox" checked={selectedCategories.includes(cat.id)} onChange={() => toggleCat(cat.id)} className="rounded accent-foreground focus:ring-ring" />
                      <span className="text-foreground" style={{ marginLeft: `${cat.depth * 12}px` }}>{cat.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedCategories(allCatsSelected ? [] : categories.map(c => c.id))}>{allCatsSelected ? 'Unselect All' : 'Select All'}</Button>
                  <Button type="button" size="sm" onClick={onAddCategories} disabled={submitting || selectedCategories.length === 0}>Add to Menu</Button>
                </div>
              </div>
            )}
          </Card>

          {/* Pages Accordion */}
          <Card className="p-0 gap-0 overflow-hidden">
            <button onClick={() => setOpenAccordion(openAccordion === 'pages' ? null : 'pages')} className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground"><FileText size={16} className="text-muted-foreground" /> Pages</div>
              {openAccordion === 'pages' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openAccordion === 'pages' && (
              <div className="p-4 border-t border-border">
                <div className="max-h-48 overflow-y-auto space-y-2 mb-4 pr-2 scrollbar-thin">
                  {pages.length === 0 && <p className="text-xs text-muted-foreground">No pages found.</p>}
                  {pages.map((page: any) => (
                    <label key={page.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                      <input type="checkbox" checked={selectedPages.includes(page.id)} onChange={() => togglePage(page.id)} className="rounded accent-foreground focus:ring-ring" />
                      <span className="text-foreground">{page.title}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedPages(allPagesSelected ? [] : pages.map(p => p.id))}>{allPagesSelected ? 'Unselect All' : 'Select All'}</Button>
                  <Button type="button" size="sm" onClick={onAddPages} disabled={submitting || selectedPages.length === 0}>Add to Menu</Button>
                </div>
              </div>
            )}
          </Card>

          {/* System Pages Accordion */}
          <Card className="p-0 gap-0 overflow-hidden">
            <button onClick={() => setOpenAccordion(openAccordion === 'system' ? null : 'system')} className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground"><FileText size={16} className="text-muted-foreground" /> System Pages</div>
              {openAccordion === 'system' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openAccordion === 'system' && (
              <div className="p-4 border-t border-border">
                <div className="max-h-48 overflow-y-auto space-y-2 mb-4 pr-2 scrollbar-thin">
                  {[
                    { id: 'sys-home', title: 'Home', url: '/' },
                    { id: 'sys-shop', title: 'Shop All', url: '/shop' },
                    { id: 'sys-gift', title: 'Gift Cards', url: '/gift-cards' },
                    { id: 'sys-about', title: 'About Us', url: '/about' },
                  ].map((page) => (
                    <div key={page.id} className="flex items-center justify-between hover:bg-muted/50 p-1.5 rounded">
                      <span className="text-foreground text-sm">{page.title}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={submitting}
                        onClick={async () => {
                          setSubmitting(true);
                          try {
                            await api.post("/admin/menus", { title: page.title, url: page.url });
                            fetchMenus();
                          } catch(err) {
                            Swal.fire({ text: "Failed to add system page.", icon: "error" });
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Custom Links Accordion */}
          <Card className="p-0 gap-0 overflow-hidden">
            <button onClick={() => setOpenAccordion(openAccordion === 'custom' ? null : 'custom')} className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground"><LinkIcon size={16} className="text-muted-foreground" /> Custom Links</div>
              {openAccordion === 'custom' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openAccordion === 'custom' && (
              <div className="p-4 border-t border-border">
                <form onSubmit={handleSubmit(onAddCustomLink)} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL</Label>
                    <Input {...register("url")} placeholder="https:// or /shop" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Link Text</Label>
                    <Input {...register("title")} placeholder="Menu Item" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" size="sm" disabled={submitting}>Add to Menu</Button>
                  </div>
                </form>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN - MENU STRUCTURE */}
        <div className="w-full lg:flex-1 lg:min-w-0">
          <Card className="bg-muted/30 min-h-[500px]">
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground text-base mb-4">Menu Structure</h2>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
                </div>
              ) : (
                <>
                  <Nestable
                    items={menus}
                    renderItem={renderItem}
                    onChange={handleNestableChange}
                    maxDepth={3}
                    handler={<div className="shrink-0 cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"><GripVertical size={18} /></div>}
                  />
                  {menus.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                      <p className="text-muted-foreground text-sm font-medium">Add menu items from the column on the left.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input {...editForm.register("title", { required: true, value: editingItem.title })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL</Label>
                <Input {...editForm.register("url", { required: true, value: editingItem.url })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parent Item</Label>
                <select {...editForm.register("parentId", { value: editingItem.parentId || "" })} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none">
                  <option value="">None (Top Level)</option>
                  {flattenedMenus.map((m: any) => (
                    <option key={m.id} value={m.id} disabled={m.id === editingItem.id}>{"\u00A0".repeat(m.depth * 4)} {m.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Image URL (For Mega Menu Banner)</Label>
                <Input {...editForm.register("imageUrl", { value: editingItem.imageUrl || "" })} />
              </div>
              <Button type="submit" size="lg" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Item"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
