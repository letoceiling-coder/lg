import { create } from 'zustand';
import { Block, Page, PageRevision, Section, ViewportMode, BlockStyles, PageSEO } from '../models/types';
import { getBlockDefinition } from '../models/block-definitions';

const generateId = () => Math.random().toString(36).slice(2, 11);

interface EditorHistory {
  past: Section[][];
  future: Section[][];
}

interface EditorState {
  // Current page
  currentPage: Page | null;
  sections: Section[];
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  viewport: ViewportMode;
  isDirty: boolean;
  isPreviewing: boolean;
  
  // History
  history: EditorHistory;
  
  // Actions - Page
  loadPage: (page: Page) => void;
  savePage: () => Page | null;
  updateSEO: (seo: Partial<PageSEO>) => void;
  
  // Actions - Sections
  addSection: (label?: string) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (oldIndex: number, newIndex: number) => void;
  
  // Actions - Blocks
  addBlock: (sectionId: string, blockType: string, index?: number) => void;
  removeBlock: (sectionId: string, blockId: string) => void;
  moveBlock: (fromSectionId: string, toSectionId: string, fromIndex: number, toIndex: number) => void;
  duplicateBlock: (sectionId: string, blockId: string) => void;
  updateBlockProps: (blockId: string, props: Record<string, any>) => void;
  updateBlockStyles: (blockId: string, styles: Partial<BlockStyles>) => void;
  selectBlock: (blockId: string | null) => void;
  hoverBlock: (blockId: string | null) => void;
  
  // Actions - Editor
  setViewport: (mode: ViewportMode) => void;
  togglePreview: () => void;
  undo: () => void;
  redo: () => void;
  
  // Helpers
  getSelectedBlock: () => Block | null;
  findBlockInSections: (blockId: string) => { block: Block; sectionId: string } | null;
}

const pushHistory = (state: EditorState): EditorHistory => ({
  past: [...state.history.past.slice(-49), state.sections.map(s => ({ ...s, blocks: [...s.blocks] }))],
  future: [],
});

export const useEditorStore = create<EditorState>((set, get) => ({
  currentPage: null,
  sections: [],
  selectedBlockId: null,
  hoveredBlockId: null,
  viewport: 'desktop',
  isDirty: false,
  isPreviewing: false,
  history: { past: [], future: [] },

  loadPage: (page) => set({
    currentPage: page,
    sections: page.sections,
    selectedBlockId: null,
    isDirty: false,
    history: { past: [], future: [] },
  }),

  savePage: () => {
    const { currentPage, sections } = get();
    if (!currentPage) return null;
    const updated: Page = {
      ...currentPage,
      sections,
      updatedAt: new Date().toISOString(),
      revisions: [
        ...currentPage.revisions,
        {
          id: generateId(),
          pageId: currentPage.id,
          sections: JSON.parse(JSON.stringify(sections)),
          seo: currentPage.seo,
          createdAt: new Date().toISOString(),
          createdBy: 'admin',
        },
      ],
    };
    set({ currentPage: updated, isDirty: false });
    return updated;
  },

  updateSEO: (seo) => {
    const { currentPage } = get();
    if (!currentPage) return;
    set({
      currentPage: { ...currentPage, seo: { ...currentPage.seo, ...seo } },
      isDirty: true,
    });
  },

  addSection: (label) => {
    const state = get();
    const newHistory = pushHistory(state);
    const section: Section = {
      id: generateId(),
      label: label || `Секция ${state.sections.length + 1}`,
      blocks: [],
      styles: { padding: '48px 0' },
    };
    set({ sections: [...state.sections, section], isDirty: true, history: newHistory });
  },

  removeSection: (sectionId) => {
    const state = get();
    const newHistory = pushHistory(state);
    set({
      sections: state.sections.filter(s => s.id !== sectionId),
      isDirty: true,
      history: newHistory,
      selectedBlockId: null,
    });
  },

  reorderSections: (oldIndex, newIndex) => {
    const state = get();
    const newHistory = pushHistory(state);
    const arr = [...state.sections];
    const [moved] = arr.splice(oldIndex, 1);
    arr.splice(newIndex, 0, moved);
    set({ sections: arr, isDirty: true, history: newHistory });
  },

  addBlock: (sectionId, blockType, index) => {
    const state = get();
    const def = getBlockDefinition(blockType);
    if (!def) return;
    const newHistory = pushHistory(state);
    const block: Block = {
      id: generateId(),
      type: def.type,
      props: { ...def.defaultProps },
      styles: { ...def.defaultStyles },
      label: def.label,
    };
    const sections = state.sections.map(s => {
      if (s.id !== sectionId) return s;
      const blocks = [...s.blocks];
      if (index !== undefined) blocks.splice(index, 0, block);
      else blocks.push(block);
      return { ...s, blocks };
    });
    set({ sections, isDirty: true, history: newHistory, selectedBlockId: block.id });
  },

  removeBlock: (sectionId, blockId) => {
    const state = get();
    const newHistory = pushHistory(state);
    const sections = state.sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, blocks: s.blocks.filter(b => b.id !== blockId) };
    });
    set({
      sections,
      isDirty: true,
      history: newHistory,
      selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
    });
  },

  moveBlock: (fromSectionId, toSectionId, fromIndex, toIndex) => {
    const state = get();
    const newHistory = pushHistory(state);
    let movedBlock: Block | null = null;
    let sections = state.sections.map(s => {
      if (s.id === fromSectionId) {
        const blocks = [...s.blocks];
        [movedBlock] = blocks.splice(fromIndex, 1);
        return { ...s, blocks };
      }
      return s;
    });
    if (!movedBlock) return;
    const blockToInsert = movedBlock;
    sections = sections.map(s => {
      if (s.id === toSectionId) {
        const blocks = [...s.blocks];
        blocks.splice(toIndex, 0, blockToInsert);
        return { ...s, blocks };
      }
      return s;
    });
    set({ sections, isDirty: true, history: newHistory });
  },

  duplicateBlock: (sectionId, blockId) => {
    const state = get();
    const newHistory = pushHistory(state);
    const sections = state.sections.map(s => {
      if (s.id !== sectionId) return s;
      const idx = s.blocks.findIndex(b => b.id === blockId);
      if (idx === -1) return s;
      const clone: Block = JSON.parse(JSON.stringify(s.blocks[idx]));
      clone.id = generateId();
      clone.label = (clone.label || '') + ' (копия)';
      const blocks = [...s.blocks];
      blocks.splice(idx + 1, 0, clone);
      return { ...s, blocks };
    });
    set({ sections, isDirty: true, history: newHistory });
  },

  updateBlockProps: (blockId, props) => {
    const state = get();
    const newHistory = pushHistory(state);
    const sections = state.sections.map(s => ({
      ...s,
      blocks: s.blocks.map(b =>
        b.id === blockId ? { ...b, props: { ...b.props, ...props } } : b
      ),
    }));
    set({ sections, isDirty: true, history: newHistory });
  },

  updateBlockStyles: (blockId, styles) => {
    const state = get();
    const newHistory = pushHistory(state);
    const sections = state.sections.map(s => ({
      ...s,
      blocks: s.blocks.map(b =>
        b.id === blockId ? { ...b, styles: { ...b.styles, ...styles } } : b
      ),
    }));
    set({ sections, isDirty: true, history: newHistory });
  },

  selectBlock: (blockId) => set({ selectedBlockId: blockId }),
  hoverBlock: (blockId) => set({ hoveredBlockId: blockId }),
  setViewport: (mode) => set({ viewport: mode }),
  togglePreview: () => set(s => ({ isPreviewing: !s.isPreviewing })),

  undo: () => {
    const { history, sections } = get();
    if (history.past.length === 0) return;
    const prev = history.past[history.past.length - 1];
    set({
      sections: prev,
      isDirty: true,
      history: {
        past: history.past.slice(0, -1),
        future: [sections, ...history.future],
      },
    });
  },

  redo: () => {
    const { history, sections } = get();
    if (history.future.length === 0) return;
    const next = history.future[0];
    set({
      sections: next,
      isDirty: true,
      history: {
        past: [...history.past, sections],
        future: history.future.slice(1),
      },
    });
  },

  getSelectedBlock: () => {
    const { selectedBlockId, sections } = get();
    if (!selectedBlockId) return null;
    for (const s of sections) {
      const block = s.blocks.find(b => b.id === selectedBlockId);
      if (block) return block;
    }
    return null;
  },

  findBlockInSections: (blockId) => {
    const { sections } = get();
    for (const s of sections) {
      const block = s.blocks.find(b => b.id === blockId);
      if (block) return { block, sectionId: s.id };
    }
    return null;
  },
}));
