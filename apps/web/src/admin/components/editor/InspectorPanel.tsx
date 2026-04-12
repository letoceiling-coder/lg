import { useEditorStore } from '../../store/editor-store';
import { getBlockDefinition } from '../../models/block-definitions';
import { Trash2, Copy, EyeOff, Lock, ChevronUp, ChevronDown } from 'lucide-react';
import { Block } from '../../models/types';

export default function InspectorPanel() {
  const {
    selectedBlockId,
    sections,
    updateBlockProps,
    updateBlockStyles,
    removeBlock,
    duplicateBlock,
    findBlockInSections,
    selectBlock,
    currentPage,
    updateSEO,
  } = useEditorStore();

  const found = selectedBlockId ? findBlockInSections(selectedBlockId) : null;
  const block = found?.block;
  const sectionId = found?.sectionId;
  const def = block ? getBlockDefinition(block.type) : null;

  if (!block || !def || !sectionId) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b shrink-0">
          <h3 className="font-semibold text-sm">Инспектор</h3>
        </div>
        {currentPage ? (
          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SEO</h4>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <input
                value={currentPage.seo.title}
                onChange={e => updateSEO({ title: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <textarea
                value={currentPage.seo.description}
                onChange={e => updateSEO({ description: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Slug</label>
              <input
                value={currentPage.seo.slug}
                onChange={e => updateSEO({ slug: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">OG Image</label>
              <input
                value={currentPage.seo.ogImage || ''}
                onChange={e => updateSEO({ ogImage: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                placeholder="URL изображения"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Canonical</label>
              <input
                value={currentPage.seo.canonical || ''}
                onChange={e => updateSEO({ canonical: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                placeholder="https://..."
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-sm text-muted-foreground text-center">Выберите блок для редактирования</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{def.label}</h3>
          <button onClick={() => selectBlock(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Actions */}
        <div className="flex gap-1">
          <button onClick={() => duplicateBlock(sectionId, block.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Дублировать">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { removeBlock(sectionId, block.id); selectBlock(null); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Удалить">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Fields */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Контент</h4>
          {def.editableFields.map(field => (
            <div key={field.key} className="mb-3">
              <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
              {field.type === 'text' || field.type === 'url' ? (
                <input
                  value={block.props[field.key] || ''}
                  onChange={e => updateBlockProps(block.id, { [field.key]: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                />
              ) : field.type === 'textarea' || field.type === 'richtext' ? (
                <textarea
                  value={block.props[field.key] || ''}
                  onChange={e => updateBlockProps(block.id, { [field.key]: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                  rows={4}
                />
              ) : field.type === 'select' ? (
                <select
                  value={block.props[field.key] || ''}
                  onChange={e => updateBlockProps(block.id, { [field.key]: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                >
                  {field.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : field.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!block.props[field.key]}
                    onChange={e => updateBlockProps(block.id, { [field.key]: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-xs">{field.label}</span>
                </label>
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={block.props[field.key] || 0}
                  onChange={e => updateBlockProps(block.id, { [field.key]: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                />
              ) : field.type === 'image' ? (
                <input
                  value={block.props[field.key] || ''}
                  onChange={e => updateBlockProps(block.id, { [field.key]: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
                  placeholder="URL изображения"
                />
              ) : field.type === 'color' ? (
                <input
                  type="color"
                  value={block.props[field.key] || '#000000'}
                  onChange={e => updateBlockProps(block.id, { [field.key]: e.target.value })}
                  className="w-8 h-8 rounded-lg border cursor-pointer"
                />
              ) : null}
            </div>
          ))}
        </div>

        {/* Styles */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Стили</h4>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Padding</label>
              <input
                value={block.styles.padding || ''}
                onChange={e => updateBlockStyles(block.id, { padding: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background font-mono"
                placeholder="24px 0"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Margin</label>
              <input
                value={block.styles.margin || ''}
                onChange={e => updateBlockStyles(block.id, { margin: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={block.styles.backgroundColor || '#ffffff'}
                  onChange={e => updateBlockStyles(block.id, { backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded-lg border cursor-pointer shrink-0"
                />
                <input
                  value={block.styles.backgroundColor || ''}
                  onChange={e => updateBlockStyles(block.id, { backgroundColor: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={block.styles.textColor || '#000000'}
                  onChange={e => updateBlockStyles(block.id, { textColor: e.target.value })}
                  className="w-8 h-8 rounded-lg border cursor-pointer shrink-0"
                />
                <input
                  value={block.styles.textColor || ''}
                  onChange={e => updateBlockStyles(block.id, { textColor: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Border Radius</label>
              <input
                value={block.styles.borderRadius || ''}
                onChange={e => updateBlockStyles(block.id, { borderRadius: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background font-mono"
                placeholder="12px"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max Width</label>
              <input
                value={block.styles.maxWidth || ''}
                onChange={e => updateBlockStyles(block.id, { maxWidth: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background font-mono"
                placeholder="1200px"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tailwind Class</label>
              <input
                value={block.styles.className || ''}
                onChange={e => updateBlockStyles(block.id, { className: e.target.value })}
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background font-mono"
                placeholder="shadow-lg border"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
