export type Role = 'user' | 'admin';
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleting';
export type MessageRole = 'user' | 'assistant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}
export interface UserWithHash extends User {
  passwordHash: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  title: string | null;
  subject: string | null;
  description: string | null;
  status: DocumentStatus;
  fileSize: number;
  pageCount: number | null;
  uploadedBy: string | null;
  ragDocumentId: string | null;
  errorMessage: string | null;
  uploadedAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** Source citation attached to an assistant message. Shape is the RAG boundary contract. */
export interface RagSource {
  documentId: string;
  documentName: string;
  page: number;
  chunkId?: string;
  similarity?: number;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources: RagSource[];
  createdAt: string;
}
