import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const looksLikePdf = file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname);
    if (looksLikePdf) cb(null, true);
    else cb(new AppError(415, 'INVALID_FILE_TYPE', 'Only PDF files are allowed'));
  },
});

/** Expects a single multipart field named "file". */
export const uploadPdf = upload.single('file');
