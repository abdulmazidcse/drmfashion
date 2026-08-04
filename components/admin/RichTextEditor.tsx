"use client"

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
    SimpleUploadAdapter
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
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <CKEditor
        editor={ ClassicEditor }
        data={initialContent || ''}
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
            'bulletedList', 'numberedList', 'outdent', 'indent'
          ],
          plugins: [
            Bold, Essentials, Heading, Italic, Link, List, Paragraph, Undo,
            Underline, Strikethrough, Alignment, Font, BlockQuote, Indent, IndentBlock,
            Table, TableToolbar,
            ...(enableImages ? IMAGE_PLUGINS : [])
          ],
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
      `}</style>
    </div>
  );
}
