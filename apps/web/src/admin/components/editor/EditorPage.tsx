import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverEvent, pointerWithin, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useEditorStore } from '../../store/editor-store';
import { useCMSStore } from '../../store/cms-store';
import BlockLibrary from './BlockLibrary';
import Canvas from './Canvas';
import InspectorPanel from './InspectorPanel';
import {
  ArrowLeft, Undo2, Redo2, Eye, EyeOff, Save, Monitor, Tablet, Smartphone,
  Check, Loader2, Globe
} from 'lucide-react';
import { useState } from 'react';

export default function EditorPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { getPage, updatePage, setPageStatus } = useCMSStore();
  const {
    loadPage, savePage, sections, viewport, setViewport,
    isPreviewing, togglePreview, undo, redo, history,
    isDirty, addBlock, currentPage,
  } = useEditorStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!pageId) return;
    const page = getPage(pageId);
    if (page) loadPage(page);
    else navigate('/admin/pages');
  }, [pageId]);

  // Autosave
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      const page = savePage();
      if (page) updatePage(page);
    }, 3000);
    return () => clearTimeout(timer);
  }, [sections, isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    const page = savePage();
    if (page) updatePage(page);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  }, [savePage, updatePage]);

  const handlePublish = () => {
    handleSave();
    if (currentPage) setPageStatus(currentPage.id, 'published');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // From library to section
    if (activeData?.fromLibrary && overData?.type === 'section') {
      addBlock(overData.sectionId, activeData.type);
      return;
    }

    // Reorder within section
    if (activeData?.type === 'block' && overData?.type === 'block') {
      const fromSection = sections.find(s => s.id === activeData.sectionId);
      const toSection = sections.find(s => s.blocks.some(b => b.id === over.id));
      if (fromSection && toSection && fromSection.id === toSection.id) {
        const oldIdx = fromSection.blocks.findIndex(b => b.id === active.id);
        const newIdx = toSection.blocks.findIndex(b => b.id === over.id);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          useEditorStore.getState().moveBlock(fromSection.id, toSection.id, oldIdx, newIdx);
        }
      }
    }
  };

  return (
    <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-muted/30">
        {/* Toolbar */}
        <header className="h-12 bg-background border-b flex items-center justify-between px-3 shrink-0 z-30">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin/pages')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium truncate max-w-[200px]">{currentPage?.title}</span>
            {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500" title="Несохранённые изменения" />}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={history.past.length === 0} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={history.future.length === 0} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30">
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            <button onClick={() => setViewport('desktop')} className={`p-2 rounded-lg ${viewport === 'desktop' ? 'bg-muted' : 'hover:bg-muted'}`}>
              <Monitor className="w-4 h-4" />
            </button>
            <button onClick={() => setViewport('tablet')} className={`p-2 rounded-lg ${viewport === 'tablet' ? 'bg-muted' : 'hover:bg-muted'}`}>
              <Tablet className="w-4 h-4" />
            </button>
            <button onClick={() => setViewport('mobile')} className={`p-2 rounded-lg ${viewport === 'mobile' ? 'bg-muted' : 'hover:bg-muted'}`}>
              <Smartphone className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-border mx-1" />
            <button onClick={togglePreview} className="p-2 rounded-lg hover:bg-muted" title={isPreviewing ? 'Редактор' : 'Превью'}>
              {isPreviewing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border hover:bg-muted transition-colors">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3 text-green-600" /> : <Save className="w-3 h-3" />}
              {saving ? 'Сохранение...' : saved ? 'Сохранено' : 'Сохранить'}
            </button>
            <button onClick={handlePublish} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90">
              <Globe className="w-3 h-3" /> Опубликовать
            </button>
          </div>
        </header>

        {/* Editor body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Block library */}
          {!isPreviewing && (
            <aside className="w-56 border-r bg-background shrink-0 overflow-hidden">
              <BlockLibrary />
            </aside>
          )}

          {/* Canvas */}
          <Canvas />

          {/* Right panel - Inspector */}
          {!isPreviewing && (
            <aside className="w-64 border-l bg-background shrink-0 overflow-hidden">
              <InspectorPanel />
            </aside>
          )}
        </div>
      </div>
    </DndContext>
  );
}
