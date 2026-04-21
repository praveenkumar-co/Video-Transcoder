import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './env';
import { connectDB } from './config/db.config';
import { startSqsPoller } from './services/sqs.service';
import { startVideoWorker } from './workers/video.worker';
import uploadRoutes from './routes/upload.routes';
import { globalErrorHandler } from './middleware/error.middleware';

const app = express();
app.use(
  cors({
    origin:
      env.NODE_ENV === 'development'
        ? '*'
        : process.env.ALLOWED_ORIGINS,
  })
);
app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    mongoState: mongoose.connection.readyState,
  });
});
app.use('/api/upload', uploadRoutes);
app.use(globalErrorHandler);
async function bootstrap(): Promise<void> {
  try {
    await connectDB();
    console.info('MongoDB connected');

    app.listen(env.PORT, () => {
      console.info(`API running on http://localhost:${env.PORT}`);
      console.info(`Environment: ${env.NODE_ENV}`);
    });

    startVideoWorker();
    startSqsPoller();

  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
