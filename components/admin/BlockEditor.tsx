"use client"

import { useEffect, useState } from "react"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"

export default function BlockEditor({ 
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
    return <div className="p-12 text-center text-sm text-zinc-500">Loading Page Builder...</div>
  }

  return (
    <div className="border border-zinc-200 bg-white rounded-lg min-h-[500px] py-8">
      <BlockNoteView 
        editor={editor} 
        onChange={async () => {
          // Convert blocks back to HTML for saving to the DB
          const html = await editor.blocksToHTMLLossy(editor.document)
          onChange(html)
        }} 
      />
    </div>
  )
}
