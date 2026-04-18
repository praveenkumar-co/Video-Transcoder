import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './env';
import uploadRoutes from './routes/upload.routes';
import webhookRoutes from './routes/webhook.routes';
import { globalErrorHandler } from './middleware/error.middleware';

const app = express();

app.use(cors({ origin: env.NODE_ENV === 'development' ? '*' : process.env.ALLOWED_ORIGINS }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    mongoState: mongoose.connection.readyState,
  });
});

app.use('/api/upload', uploadRoutes);
app.use('/webhooks', webhookRoutes);


app.use(globalErrorHandler);

async function bootstrap(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.info(' MongoDB connected');

  app.listen(env.PORT, () => {
    console.info(`API running on http://localhost:${env.PORT}`);
    console.info(`Environment: ${env.NODE_ENV}`);
  });
}
bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});