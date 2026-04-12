import { useEditorStore } from '../../store/editor-store';
import BlockRenderer from './BlockRenderer';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block, Section } from '../../models/types';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function SortableBlock({ block, sectionId }: { block: Block; sectionId: string }) {
  const { selectedBlockId, hoveredBlockId, selectBlock, hoverBlock, removeBlock } = useEditorStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { sectionId, type: 'block' },
  });

  const isSelected = selectedBlockId === block.id;
  const isHovered = hoveredBlockId === block.id;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative group rounded-xl transition-all',
        isDragging && 'opacity-50 z-50',
        isSelected && 'ring-2 ring-primary ring-offset-2',
        isHovered && !isSelected && 'ring-1 ring-primary/40',
      )}
      onClick={e => { e.stopPropagation(); selectBlock(block.id); }}
      onMouseEnter={() => hoverBlock(block.id)}
      onMouseLeave={() => hoverBlock(null)}
    >
      {/* Block toolbar */}
      <div className={cn(
        'absolute -top-3 left-2 flex items-center gap-1 bg-primary text-primary-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium z-20 transition-opacity',
        (isSelected || isHovered) ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3 h-3" />
        </button>
        <span>{block.label || block.type}</span>
        <button
          onClick={e => { e.stopPropagation(); removeBlock(sectionId, block.id); }}
          className="hover:text-destructive-foreground ml-1"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <BlockRenderer block={block} />
    </div>
  );
}

function DroppableSection({ section }: { section: Section }) {
  const { addBlock, removeSection } = useEditorStore();
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${section.id}`,
    data: { sectionId: section.id, type: 'section' },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative border border-dashed rounded-2xl transition-colors min-h-[60px]',
        isOver ? 'border-primary bg-primary/5' : 'border-border/50',
      )}
      style={section.styles?.padding ? { padding: section.styles.padding } : { padding: '24px' }}
    >
      {/* Section label */}
      <div className="absolute -top-3 left-4 bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-2">
        {section.label}
        <button onClick={() => removeSection(section.id)} className="hover:text-destructive">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <SortableContext items={section.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {section.blocks.map(block => (
            <SortableBlock key={block.id} block={block} sectionId={section.id} />
          ))}
        </div>
      </SortableContext>

      {section.blocks.length === 0 && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
          Перетащите блок сюда
        </div>
      )}
    </div>
  );
}

export default function Canvas() {
  const { sections, viewport, isPreviewing, addSection, selectBlock } = useEditorStore();

  const viewportWidth = viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '375px';

  return (
    <div
      className="flex-1 overflow-auto bg-muted/30 p-6"
      onClick={() => selectBlock(null)}
    >
      <div
        className="mx-auto bg-background rounded-2xl shadow-sm border transition-all duration-300"
        style={{ maxWidth: viewportWidth, minHeight: '400px' }}
      >
        {isPreviewing ? (
          // Preview mode — no editing chrome
          <div>
            {sections.map(section => (
              <div key={section.id} style={section.styles?.padding ? { padding: section.styles.padding } : undefined}>
                {section.blocks.map(block => (
                  <BlockRenderer key={block.id} block={block} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          // Edit mode
          <div className="p-4 space-y-4">
            {sections.map(section => (
              <DroppableSection key={section.id} section={section} />
            ))}
            <button
              onClick={e => { e.stopPropagation(); addSection(); }}
              className="w-full py-3 border-2 border-dashed rounded-2xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Добавить секцию
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
