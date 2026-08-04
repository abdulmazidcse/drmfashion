import { Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

type Variant = {
  size: string
  color: string
  length?: string
  stock: number
  sku: string
  image?: string
  images: string[]
}

type Props = {
  variants: Variant[]
  onRemove: (index: number) => void
  onUpdateSku?: (index: number, newSku: string) => void
}

export default function VariantTable({ variants, onRemove, onUpdateSku }: Props) {
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Size Scale</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Color Label</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Length Option</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Stock Volume</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Images</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">SKU Code</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-widest text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {variants.map((variant, index) => (
              <TableRow key={index}>
                {/* SIZE */}
                <TableCell>
                  <Badge className="uppercase tracking-wider">
                    {variant.size}
                  </Badge>
                </TableCell>

                {/* COLOR */}
                <TableCell className="text-sm font-semibold text-foreground">
                  {variant.color}
                </TableCell>

                {/* LENGTH */}
                <TableCell>
                  {variant.length ? (
                    <Badge variant="outline">
                      {variant.length}
                    </Badge>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">
                      Standard
                    </span>
                  )}
                </TableCell>

                {/* STOCK */}
                <TableCell className="font-mono text-sm font-bold text-foreground">
                  {variant.stock} units
                </TableCell>

                {/* IMAGE */}
                <TableCell>
                  {variant.images && variant.images.length > 0 ? (
                    <div className="flex -space-x-2">
                      {variant.images.slice(0, 3).map((img, i) => (
                        <img key={i} src={img} alt={variant.sku} className="w-8 h-8 object-cover rounded-md border border-border shadow-sm" />
                      ))}
                      {variant.images.length > 3 && (
                        <div className="w-8 h-8 rounded-md border border-border bg-muted flex items-center justify-center text-[8px] font-bold z-10">
                          +{variant.images.length - 3}
                        </div>
                      )}
                    </div>
                  ) : variant.image ? (
                    <img src={variant.image} alt={variant.sku} className="w-8 h-8 object-cover rounded-md border border-border shadow-sm" />
                  ) : (
                    <span className="text-xs italic text-muted-foreground">None</span>
                  )}
                </TableCell>

                {/* SKU */}
                <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                  {onUpdateSku ? (
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => onUpdateSku(index, e.target.value)}
                      className="w-36 border border-zinc-200 rounded-lg px-2.5 py-1 font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary bg-white uppercase text-zinc-900 shadow-sm"
                      placeholder="SKU Code"
                    />
                  ) : (
                    variant.sku
                  )}
                </TableCell>

                {/* REMOVE ACTION */}
                <TableCell className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
