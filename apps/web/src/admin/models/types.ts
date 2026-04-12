// ============================================================
// CMS Data Models
// ============================================================

export type UserRole = 'admin' | 'editor' | 'author' | 'viewer';

export interface CMSUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export type BlockType =
  | 'hero'
  | 'text'
  | 'image'
  | 'gallery'
  | 'button'
  | 'cta'
  | 'features'
  | 'testimonials'
  | 'faq'
  | 'form'
  | 'video'
  | 'html'
  | 'container';

export interface BlockProps {
  [key: string]: any;
}

export interface BlockStyles {
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  maxWidth?: string;
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  gridCols?: number;
  className?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  props: BlockProps;
  styles: BlockStyles;
  children?: Block[];
  locked?: boolean;
  hidden?: boolean;
  label?: string;
}

export interface Section {
  id: string;
  label: string;
  blocks: Block[];
  styles: BlockStyles;
}

export interface PageSEO {
  title: string;
  description: string;
  ogImage?: string;
  ogTitle?: string;
  canonical?: string;
  slug: string;
}

export type PageStatus = 'draft' | 'published' | 'archived';

export interface PageRevision {
  id: string;
  pageId: string;
  sections: Section[];
  seo: PageSEO;
  createdAt: string;
  createdBy: string;
  label?: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  sections: Section[];
  seo: PageSEO;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy: string;
  revisions: PageRevision[];
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  size: number;
  width?: number;
  height?: number;
  folder?: string;
  tags: string[];
  createdAt: string;
}

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  children?: MenuItem[];
  order: number;
}

export interface Menu {
  id: string;
  name: string;
  items: MenuItem[];
}

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export interface DesignTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
  spacing: string;
}

// Block library definition
export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  category: 'layout' | 'content' | 'media' | 'interactive' | 'advanced';
  defaultProps: BlockProps;
  defaultStyles: BlockStyles;
  editableFields: EditableField[];
}

export interface EditableField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'richtext' | 'image' | 'color' | 'select' | 'number' | 'boolean' | 'array' | 'url';
  options?: { label: string; value: string }[];
  defaultValue?: any;
}
