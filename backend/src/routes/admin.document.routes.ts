import { Router } from 'express';
import { documentController as c } from '../controllers/documentController';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { uploadPdf } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParamSchema, uploadMetaSchema } from '../utils/schemas';

export const adminDocumentRoutes = Router();
adminDocumentRoutes.use(authenticate, requireAdmin); // auth + role BEFORE any file is parsed
adminDocumentRoutes.post('/', uploadPdf, validate(uploadMetaSchema), h(c.upload));
adminDocumentRoutes.get('/', h(c.list));
adminDocumentRoutes.get('/:id', validate(idParamSchema, 'params'), h(c.get));
adminDocumentRoutes.delete('/:id', validate(idParamSchema, 'params'), h(c.remove));
