import { env } from '../../config/env';
import { MockRagService } from './MockRagService';
import { PythonRagService } from './PythonRagService';
import { RagService } from './RagService';

/** The single place that decides which implementation is used (RAG_MODE=mock | real). */
export const ragService: RagService = env.RAG_MODE === 'real' ? new PythonRagService() : new MockRagService();

export * from './RagService';
