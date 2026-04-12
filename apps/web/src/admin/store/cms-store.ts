import { create } from 'zustand';
import { Page, MediaItem, CMSUser, PageStatus } from '../models/types';

const STORAGE_KEY = 'cms_pages';
const MEDIA_KEY = 'cms_media';
const USERS_KEY = 'cms_users';

const generateId = () => Math.random().toString(36).slice(2, 11);

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch { return fallback; }
};

const saveToStorage = (key: string, data: any) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

// Default user
const defaultUser: CMSUser = {
  id: 'admin-1',
  email: 'admin@livegrid.com',
  name: 'Admin',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

// Default demo page
const createDemoPage = (): Page => ({
  id: generateId(),
  title: 'Главная',
  slug: '/',
  status: 'published',
  sections: [
    {
      id: generateId(),
      label: 'Hero секция',
      blocks: [
        {
          id: generateId(),
          type: 'hero',
          props: {
            title: 'Добро пожаловать в Live Grid',
            subtitle: 'Платформа для управления контентом нового поколения',
            buttonText: 'Начать',
            buttonUrl: '#',
            backgroundImage: '',
            overlay: true,
          },
          styles: { padding: '80px 0', backgroundColor: '#1a1a2e', textColor: '#ffffff' },
          label: 'Hero',
        },
      ],
      styles: {},
    },
  ],
  seo: { title: 'Главная — Live Grid', description: 'Live Grid CMS', slug: '/' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'admin-1',
  revisions: [],
});

interface CMSState {
  pages: Page[];
  media: MediaItem[];
  users: CMSUser[];
  currentUser: CMSUser;
  
  // Pages CRUD
  addPage: (title: string, slug: string) => Page;
  updatePage: (page: Page) => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => Page | null;
  getPage: (id: string) => Page | undefined;
  setPageStatus: (id: string, status: PageStatus) => void;
  
  // Media
  addMedia: (item: Omit<MediaItem, 'id' | 'createdAt'>) => void;
  deleteMedia: (id: string) => void;
  
  // Persist
  persist: () => void;
}

export const useCMSStore = create<CMSState>((set, get) => {
  const storedPages = loadFromStorage<Page[]>(STORAGE_KEY, []);
  const initialPages = storedPages.length > 0 ? storedPages : [createDemoPage()];

  return {
    pages: initialPages,
    media: loadFromStorage<MediaItem[]>(MEDIA_KEY, []),
    users: loadFromStorage<CMSUser[]>(USERS_KEY, [defaultUser]),
    currentUser: defaultUser,

    addPage: (title, slug) => {
      const page: Page = {
        id: generateId(),
        title,
        slug,
        status: 'draft',
        sections: [{ id: generateId(), label: 'Секция 1', blocks: [], styles: {} }],
        seo: { title, description: '', slug },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: get().currentUser.id,
        revisions: [],
      };
      set(s => ({ pages: [...s.pages, page] }));
      get().persist();
      return page;
    },

    updatePage: (page) => {
      set(s => ({ pages: s.pages.map(p => p.id === page.id ? page : p) }));
      get().persist();
    },

    deletePage: (id) => {
      set(s => ({ pages: s.pages.filter(p => p.id !== id) }));
      get().persist();
    },

    duplicatePage: (id) => {
      const original = get().pages.find(p => p.id === id);
      if (!original) return null;
      const clone: Page = {
        ...JSON.parse(JSON.stringify(original)),
        id: generateId(),
        title: original.title + ' (копия)',
        slug: original.slug + '-copy',
        status: 'draft' as PageStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revisions: [],
      };
      set(s => ({ pages: [...s.pages, clone] }));
      get().persist();
      return clone;
    },

    getPage: (id) => get().pages.find(p => p.id === id),

    setPageStatus: (id, status) => {
      set(s => ({
        pages: s.pages.map(p =>
          p.id === id
            ? { ...p, status, updatedAt: new Date().toISOString(), ...(status === 'published' ? { publishedAt: new Date().toISOString() } : {}) }
            : p
        ),
      }));
      get().persist();
    },

    addMedia: (item) => {
      const media: MediaItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
      set(s => ({ media: [...s.media, media] }));
      get().persist();
    },

    deleteMedia: (id) => {
      set(s => ({ media: s.media.filter(m => m.id !== id) }));
      get().persist();
    },

    persist: () => {
      const { pages, media, users } = get();
      saveToStorage(STORAGE_KEY, pages);
      saveToStorage(MEDIA_KEY, media);
      saveToStorage(USERS_KEY, users);
    },
  };
});
