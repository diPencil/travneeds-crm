import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
  Unlink,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useQuotationText } from './quotation.labels';
import './quotation-editor.css';

function safeLink(url: string) {
  try {
    const parsed = new URL(url);
    return ['https:', 'mailto:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function Tool({
  label,
  icon: Icon,
  onClick,
  active,
  disabled,
  expanded,
  controls,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  controls?: string;
}) {
  return (
    <button
      type="button"
      className="quotation-editor-tool"
      title={label}
      aria-label={label}
      aria-pressed={active}
      aria-expanded={expanded}
      aria-controls={controls}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}

function ToolGroup({ children }: { children: ReactNode }) {
  return <div className="quotation-editor-tools">{children}</div>;
}

export function QuotationRichEditor({
  value,
  onChange,
  language,
  label,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  language: 'en' | 'ar';
  label: string;
  disabled: boolean;
}) {
  const { text } = useQuotationText();
  const id = useId();
  const [href, setHref] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const linkInput = useRef<HTMLDivElement>(null);
  const onContentChange = useRef(onChange);
  const placeholder = language === 'ar' ? 'اكتب النص هنا…' : 'Write here…';
  useEffect(() => {
    onContentChange.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (linkOpen) linkInput.current?.querySelector('input')?.focus();
  }, [linkOpen]);
  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: false, linkOnPaste: false, isAllowedUri: safeLink },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'quotation-rich-editor',
        dir: language === 'ar' ? 'rtl' : 'ltr',
        lang: language,
        'aria-labelledby': id,
        role: 'textbox',
        'aria-multiline': 'true',
        'data-placeholder': placeholder,
        'aria-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => onContentChange.current(editor.getHTML()),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            bullet: editor.isActive('bulletList'),
            ordered: editor.isActive('orderedList'),
            link: editor.isActive('link'),
            block: editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
                ? 'h3'
                : 'p',
            align: editor.isActive({ textAlign: 'center' })
              ? 'center'
              : editor.isActive({ textAlign: 'right' })
                ? 'right'
                : editor.isActive({ textAlign: 'left' })
                  ? 'left'
                  : language === 'ar'
                    ? 'right'
                    : 'left',
            undo: editor.can().undo(),
            redo: editor.can().redo(),
            empty: editor.isEmpty,
          }
        : null,
  });
  useEffect(() => {
    if (editor && editor.getHTML() !== value)
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  if (!editor || !state)
    return <p role="status">{text('Loading editor…', 'جارٍ تحميل محرر النص…')}</p>;
  function closeLink() {
    setLinkOpen(false);
    editor?.commands.focus();
  }
  function applyLink() {
    if (disabled || !safeLink(href.trim())) return;
    editor?.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
    setLinkOpen(false);
  }
  return (
    <div className="min-w-0 space-y-2">
      <span id={id} className="block text-sm font-semibold">
        {label}
      </span>
      <div className="quotation-editor-surface" data-empty={state.empty}>
        <div
          role="group"
          aria-label={text('Text formatting', 'تنسيق النص')}
          className="quotation-editor-toolbar"
        >
          <select
            aria-label={text('Paragraph style', 'نمط الفقرة')}
            value={state.block}
            disabled={disabled}
            className="quotation-editor-block"
            onChange={(event) => {
              const command = editor.chain().focus();
              if (event.target.value === 'p') command.setParagraph().run();
              else command.setHeading({ level: event.target.value === 'h2' ? 2 : 3 }).run();
            }}
          >
            <option value="p">{text('Paragraph', 'فقرة')}</option>
            <option value="h2">{text('Heading 2', 'عنوان ٢')}</option>
            <option value="h3">{text('Heading 3', 'عنوان ٣')}</option>
          </select>
          <ToolGroup>
            <Tool
              label={text('Bold', 'عريض')}
              icon={Bold}
              disabled={disabled}
              active={state.bold}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <Tool
              label={text('Italic', 'مائل')}
              icon={Italic}
              disabled={disabled}
              active={state.italic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <Tool
              label={text('Underline', 'تسطير')}
              icon={Underline}
              disabled={disabled}
              active={state.underline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
          </ToolGroup>
          <ToolGroup>
            <Tool
              label={text('Bulleted list', 'قائمة نقطية')}
              icon={List}
              disabled={disabled}
              active={state.bullet}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <Tool
              label={text('Numbered list', 'قائمة مرقمة')}
              icon={ListOrdered}
              disabled={disabled}
              active={state.ordered}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
          </ToolGroup>
          <ToolGroup>
            <Tool
              label={text('Link', 'رابط')}
              icon={Link}
              disabled={disabled}
              expanded={linkOpen}
              controls={linkOpen ? `${id}-link-panel` : undefined}
              onClick={() => {
                if (linkOpen) {
                  closeLink();
                  return;
                }
                setHref(editor.getAttributes('link').href ?? '');
                setLinkOpen(true);
              }}
            />
            <Tool
              label={text('Remove link', 'إزالة الرابط')}
              icon={Unlink}
              disabled={disabled || !state.link}
              onClick={() => editor.chain().focus().unsetLink().run()}
            />
          </ToolGroup>
          <ToolGroup>
            <Tool
              label={text('Align left', 'محاذاة لليسار')}
              icon={AlignLeft}
              disabled={disabled}
              active={state.align === 'left'}
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            />
            <Tool
              label={text('Align center', 'توسيط')}
              icon={AlignCenter}
              disabled={disabled}
              active={state.align === 'center'}
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            />
            <Tool
              label={text('Align right', 'محاذاة لليمين')}
              icon={AlignRight}
              disabled={disabled}
              active={state.align === 'right'}
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            />
          </ToolGroup>
          <ToolGroup>
            <Tool
              label={text('Undo', 'تراجع')}
              icon={Undo2}
              disabled={disabled || !state.undo}
              onClick={() => editor.chain().focus().undo().run()}
            />
            <Tool
              label={text('Redo', 'إعادة')}
              icon={Redo2}
              disabled={disabled || !state.redo}
              onClick={() => editor.chain().focus().redo().run()}
            />
            <Tool
              label={text('Clear formatting', 'مسح التنسيق')}
              icon={RemoveFormatting}
              disabled={disabled}
              onClick={() =>
                editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run()
              }
            />
          </ToolGroup>
        </div>
        {linkOpen && (
          <div className="quotation-editor-link" ref={linkInput} id={`${id}-link-panel`}>
            <div className="min-w-0 flex-1">
              <Input
                id={`${id}-link`}
                aria-label={text('Link URL', 'الرابط')}
                dir="ltr"
                type="text"
                inputMode="url"
                placeholder="https://"
                disabled={disabled}
                value={href}
                maxLength={2048}
                onChange={(event) => setHref(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeLink();
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyLink();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={disabled || !safeLink(href.trim())}
              onClick={applyLink}
            >
              {text('Apply link', 'تطبيق الرابط')}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={closeLink}>
              {text('Cancel', 'إلغاء')}
            </Button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
