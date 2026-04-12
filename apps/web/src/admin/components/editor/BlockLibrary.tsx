import { blockDefinitions, blockCategories } from '../../models/block-definitions';
import { useDraggable } from '@dnd-kit/core';
import * as LucideIcons from 'lucide-react';
import { useState } from 'react';

function DraggableBlockItem({ type, label, iconName }: { type: string; label: string; iconName: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${type}`,
    data: { type, fromLibrary: true },
  });

  const Icon = (LucideIcons as any)[iconName] || LucideIcons.Box;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all text-sm hover:bg-muted ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <span className="font-medium text-sm">{label}</span>
    </div>
  );
}

export default function BlockLibrary() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = blockDefinitions.filter(b => {
    if (search && !b.label.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory !== 'all' && b.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b shrink-0">
        <h3 className="font-semibold text-sm mb-2">Блоки</h3>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск блоков..."
          className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-background"
        />
      </div>
      <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2 py-1 rounded-md text-xs whitespace-nowrap ${
            activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Все
        </button>
        {blockCategories.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-2 py-1 rounded-md text-xs whitespace-nowrap ${
              activeCategory === c.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filtered.map(b => (
          <DraggableBlockItem key={b.type} type={b.type} label={b.label} iconName={b.icon} />
        ))}
      </div>
    </div>
  );
}
