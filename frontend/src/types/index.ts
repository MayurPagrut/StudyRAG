export type Role = 'user' | 'admin';
export interface User { id: string; name: string; email: string; role: Role }
export interface AuthResult { user: User; token: string }

export interface Source {
  documentId: string;
  documentName: string;
  page: number;
  chunkId?: string;
  similarity?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: Source[];
}
export interface ChatRequest { conversationId: string | null; question: string }
export interface ChatResponse {
  conversationId: string;
  userMessage: ChatMessage;
  message: ChatMessage;
  sources: Source[];
}

export interface Conversation { id: string; title: string; createdAt: string; updatedAt: string }

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleting';
export interface DocumentItem {
  id: string;
  filename: string;
  title: string | null;
  subject: string | null;
  description: string | null;
  status: DocumentStatus;
  fileSize: number;
  pageCount: number | null;
  errorMessage: string | null;
  uploadedAt: string;
}
export interface UploadMeta { title?: string; subject?: string; description?: string }
