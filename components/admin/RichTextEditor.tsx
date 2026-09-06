"use client"

import { useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    ClassicEditor,
    Bold,
    Essentials,
    Italic,
    Paragraph,
    Undo,
    Heading,
    List,
    Link,
    Underline,
    Strikethrough,
    Alignment,
    Font,
    BlockQuote,
    Indent,
    IndentBlock,
    Table,
    TableToolbar,
    AutoImage,
    Image,
    ImageCaption,
    ImageInsert,
    ImageResize,
    ImageStyle,
    ImageToolbar,
    ImageUpload,
    HorizontalLine,
    SimpleUploadAdapter,
    SourceEditing,
    GeneralHtmlSupport
} from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';

// Image tooling is opt-in so short-form editors (brands, categories) keep their
// lean toolbar while long-form article bodies get uploads, captions and resizing.
const IMAGE_PLUGINS = [
  AutoImage, Image, ImageCaption, ImageInsert, ImageResize, ImageStyle,
  ImageToolbar, ImageUpload, HorizontalLine, SimpleUploadAdapter
]

export default function RichTextEditor({
  initialContent,
  onChange,
  onReady,
  height = 250,
  enableImages = false,
}: {
  initialContent: string
  onChange: (html: string) => void
  onReady?: (editor: any) => void
  height?: number
  enableImages?: boolean
}) {
  // CKEditor owns the document after mount; `data` is read once here as a
  // seed value. If the caller's `initialContent` were passed straight
  // through, every re-render caused by the caller's own onChange (e.g. a
  // parent re-rendering on watch()) would hand CKEditor's React binding a
  // "changed" `data` prop, and its shouldUpdateEditorData check forces a
  // full `instance.data.set()` on the slightest mismatch (e.g. GHS
  // attribute/whitespace round-tripping) — wiping the current selection.
  // That's what made multi-line toolbar actions (indent/outdent, etc.)
  // seem to apply one line at a time: the selection reset after each one.
  const [seedContent] = useState(initialContent || '');

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <CKEditor
        editor={ ClassicEditor }
        data={seedContent}
        onReady={ (editor) => onReady?.(editor) }
        config={ {
          licenseKey: 'GPL',
          ...(enableImages ? { simpleUpload: { uploadUrl: '/api/upload' } } : {}),
          image: {
            toolbar: [
              'imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|',
              'toggleImageCaption', 'imageTextAlternative'
            ]
          },
          toolbar: [
            'undo', 'redo', '|',
            'heading', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
            'alignment', '|',
            'link', 'insertTable', 'blockQuote', '|',
            ...(enableImages ? ['insertImage', 'horizontalLine', '|'] : []),
            'bulletedList', 'numberedList', 'outdent', 'indent', '|',
            'sourceEditing'
          ],
          plugins: [
            Bold, Essentials, Heading, Italic, Link, List, Paragraph, Undo,
            Underline, Strikethrough, Alignment, Font, BlockQuote, Indent, IndentBlock,
            Table, TableToolbar, SourceEditing, GeneralHtmlSupport,
            ...(enableImages ? IMAGE_PLUGINS : [])
          ],
          // Real point sizes written as inline `style="font-size:18px"`.
          //
          // The default named preset (tiny/small/big/huge) instead tags text
          // with `class="text-big"` and leaves the sizing to CKEditor's own
          // stylesheet — which the storefront does not load, so every size
          // change looked right in the editor and vanished once published.
          // Inline styles carry to any surface without a matching stylesheet.
          //
          // `supportAllValues` keeps a hand-typed size (e.g. 17) rather than
          // snapping it to the nearest entry in the list.
          fontSize: {
            options: [ 10, 12, 13, 14, 'default', 16, 18, 20, 24, 28, 32, 40, 48 ],
            supportAllValues: true
          },
          // Without this, anything typed in source view that CKEditor's schema
          // does not recognise is silently dropped the moment the view closes —
          // which would make the HTML editor look broken rather than strict.
          //
          // `script`/`style` stay excluded: this content is injected into pages
          // with dangerouslySetInnerHTML, so allowing them would turn the
          // editor into a persistent-XSS surface for every visitor.
          htmlSupport: {
            allow: [
              { name: /^(?!script$|style$).+$/, attributes: true, classes: true, styles: true }
            ]
          },
          table: {
            contentToolbar: [ 'tableColumn', 'tableRow', 'mergeTableCells' ]
          }
        } }
        onChange={ ( event, editor ) => {
          const data = editor.getData();
          onChange(data);
        } }
      />
      <style jsx global>{`
        .ck-editor__editable_inline {
          min-height: ${height}px;
          border-bottom-left-radius: 0.75rem !important;
          border-bottom-right-radius: 0.75rem !important;
        }
        .ck.ck-toolbar {
          border-top-left-radius: 0.75rem !important;
          border-top-right-radius: 0.75rem !important;
          border: none !important;
          border-bottom: 1px solid #e4e4e7 !important;
        }
        .ck.ck-editor__main > .ck-editor__editable {
          border: none !important;
        }
        /* Source view is a plain textarea that would otherwise collapse to a
           couple of rows; match the rich view so toggling doesn't jump. */
        .ck-source-editing-area {
          min-height: ${height}px;
        }
        .ck-source-editing-area textarea {
          min-height: ${height}px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          line-height: 1.6;
        }
        /* Tailwind's preflight zeroes padding/margin on every element,
           including <ul>/<ol>. CKEditor's own content CSS only restores
           list-style-type (disc/decimal), not the indent — so with no
           padding-left left to place the marker in, bullets and numbers
           render with zero space and are invisible. Toggling "Bulleted
           List" / "Numbered List" looked like it did nothing. */
        .ck-content ul,
        .ck-content ol {
          padding-left: 1.5em;
        }
      `}</style>
    </div>
  );
}
