'use client';

import * as React from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  minHeight?: number;
}

/**
 * Minimal contentEditable rich text editor.
 *
 * Why not TipTap/Lexical/Slate:
 *   - Bundle size: TipTap is 200KB+, Lexical 150KB+. Our needs are simple.
 *   - RTL + dark-mode: both require wrestling with defaults.
 *   - Our HTML vocabulary is just h2/h3/p/ul/ol/li/strong/em/a - doesn't need
 *     an AST-based editor.
 *
 * What we do:
 *   - Use document.execCommand for formatting (yes, deprecated, but still
 *     universally supported and simpler than ProseMirror's schema)
 *   - Sanitize on input to prevent pasted XSS
 *   - Keep typography styles in globals.css under .prose-editor
 *
 * Trade-offs we accept:
 *   - execCommand can produce slightly inconsistent HTML across browsers
 *     (e.g. Chrome wraps paragraphs in <div>, Firefox uses <p>). We normalize.
 *   - No collaborative editing, no image drag-drop — out of scope for v1.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'התחל לכתוב...',
  readOnly = false,
  className,
  minHeight = 400,
}: Props) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = React.useState<Set<string>>(new Set());

  // Sync external value → DOM. Only when value genuinely differs from current
  // contentEditable HTML (to avoid cursor jumps during typing).
  React.useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange(html);
  };

  const exec = (command: string, arg?: string) => {
    if (readOnly) return;
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    updateActiveFormats();
    handleInput();
  };

  const updateActiveFormats = React.useCallback(() => {
    const active = new Set<string>();
    if (document.queryCommandState('bold')) active.add('bold');
    if (document.queryCommandState('italic')) active.add('italic');
    if (document.queryCommandState('insertUnorderedList')) active.add('ul');
    if (document.queryCommandState('insertOrderedList')) active.add('ol');

    const blockType = document.queryCommandValue('formatBlock').toLowerCase();
    if (blockType === 'h2') active.add('h2');
    if (blockType === 'h3') active.add('h3');

    setActiveFormats(active);
  }, []);

  // Sanitize pasted content - strip scripts, styles, and class attrs
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      const clean = sanitizeHtml(html);
      document.execCommand('insertHTML', false, clean);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    handleInput();
  };

  const handleLink = () => {
    const url = prompt('הזן URL:');
    if (!url) return;
    // Basic URL validation - only http/https
    if (!/^https?:\/\//i.test(url)) {
      alert('URL חייב להתחיל ב-http:// או https://');
      return;
    }
    exec('createLink', url);
  };

  const toolbarButton = (opts: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
  }) => {
    const Icon = opts.icon;
    return (
      <button
        type="button"
        onClick={opts.onClick}
        disabled={readOnly}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-foreground',
          'disabled:opacity-40 disabled:pointer-events-none',
          opts.active && 'bg-accent text-foreground'
        )}
        aria-label={opts.label}
        title={opts.label}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden flex flex-col',
        className
      )}
    >
      {!readOnly && (
        <div className="flex items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
          {toolbarButton({
            icon: Heading2,
            label: 'כותרת גדולה',
            onClick: () => exec('formatBlock', 'h2'),
            active: activeFormats.has('h2'),
          })}
          {toolbarButton({
            icon: Heading3,
            label: 'כותרת קטנה',
            onClick: () => exec('formatBlock', 'h3'),
            active: activeFormats.has('h3'),
          })}
          {toolbarButton({
            icon: Type,
            label: 'פסקה',
            onClick: () => exec('formatBlock', 'p'),
          })}

          <span className="mx-1 h-4 w-px bg-border" />

          {toolbarButton({
            icon: Bold,
            label: 'מודגש',
            onClick: () => exec('bold'),
            active: activeFormats.has('bold'),
          })}
          {toolbarButton({
            icon: Italic,
            label: 'נטוי',
            onClick: () => exec('italic'),
            active: activeFormats.has('italic'),
          })}

          <span className="mx-1 h-4 w-px bg-border" />

          {toolbarButton({
            icon: List,
            label: 'רשימה',
            onClick: () => exec('insertUnorderedList'),
            active: activeFormats.has('ul'),
          })}
          {toolbarButton({
            icon: ListOrdered,
            label: 'רשימה ממוספרת',
            onClick: () => exec('insertOrderedList'),
            active: activeFormats.has('ol'),
          })}

          <span className="mx-1 h-4 w-px bg-border" />

          {toolbarButton({
            icon: LinkIcon,
            label: 'קישור',
            onClick: handleLink,
          })}

          <span className="mr-auto flex gap-0.5">
            {toolbarButton({
              icon: Undo2,
              label: 'בטל',
              onClick: () => exec('undo'),
            })}
            {toolbarButton({
              icon: Redo2,
              label: 'בצע שוב',
              onClick: () => exec('redo'),
            })}
          </span>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        className={cn(
          'prose-editor flex-1 px-6 py-5 focus:outline-none overflow-y-auto',
          readOnly && 'cursor-default'
        )}
        style={{ minHeight }}
        dir="rtl"
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTML sanitization for pasted content
// Allows: h2/h3/p/ul/ol/li/strong/em/a/br
// Strips: everything else + all attributes except href on <a>
// ---------------------------------------------------------------------------

function sanitizeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowedTags = new Set(['H2', 'H3', 'P', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'A', 'BR']);

  const cleanNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return node;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node as HTMLElement;
    if (!allowedTags.has(el.tagName)) {
      // Keep text content but strip the tag - replace with fragment of children
      const frag = document.createDocumentFragment();
      Array.from(el.childNodes).forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) frag.appendChild(cleaned);
      });
      return frag;
    }

    // Strip all attributes except href on <a>
    const newEl = document.createElement(el.tagName.toLowerCase());
    if (el.tagName === 'A') {
      const href = el.getAttribute('href');
      if (href && /^https?:\/\//i.test(href)) {
        newEl.setAttribute('href', href);
        newEl.setAttribute('rel', 'noopener noreferrer');
        newEl.setAttribute('target', '_blank');
      }
    }

    Array.from(el.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) newEl.appendChild(cleaned);
    });

    return newEl;
  };

  const container = document.createElement('div');
  Array.from(doc.body.childNodes).forEach((node) => {
    const cleaned = cleanNode(node);
    if (cleaned) container.appendChild(cleaned);
  });

  return container.innerHTML;
}
