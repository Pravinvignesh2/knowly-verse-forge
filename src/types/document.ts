
export interface Document {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  permissions: DocumentPermission[];
  tags: string[];
  version: number;
}

export interface DocumentPermission {
  userId: string;
  userName: string;
  role: 'view' | 'edit';
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  changes: string;
}
