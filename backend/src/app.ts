import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { corsOrigins } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { routes } from './routes';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: corsOrigins, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
