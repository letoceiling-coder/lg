export type MediaFolderRow = {
  id: number;
  parentId: number | null;
  name: string;
  isTrash: boolean;
};

export type MediaFileRow = {
  id: number;
  url: string;
  originalFilename: string | null;
  folderId: number | null;
  kind: string;
};
