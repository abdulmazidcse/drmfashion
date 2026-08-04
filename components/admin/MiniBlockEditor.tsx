"use client"

import { useEffect, useState } from "react"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"

export default function MiniBlockEditor({ 
  initialContent, 
  onChange 
}: { 
  initialContent: string, 
  onChange: (html: string) => void 
}) {
  const editor = useCreateBlockNote()
  const [ready, setReady] = useState(false)

  // Load initial HTML into the editor as blocks
  useEffect(() => {
    async function load() {
      if (initialContent) {
        const blocks = await editor.tryParseHTMLToBlocks(initialContent)
        editor.replaceBlocks(editor.document, blocks)
      }
      setReady(true)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  if (!ready) {
    return <div className="p-4 text-center text-xs text-zinc-400">Loading editor...</div>
  }

  return (
    <div className="border border-zinc-200 bg-white rounded-xl min-h-[120px] max-h-[250px] overflow-y-auto [&_.bn-editor]:!p-2 [&_.bn-block-group]:!p-0">
      <BlockNoteView 
        editor={editor} 
        onChange={async () => {
          const html = await editor.blocksToHTMLLossy(editor.document)
          onChange(html)
        }} 
      />
    </div>
  )
}
