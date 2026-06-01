import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './env';
import { connectDB } from './config/db.config';
import { startSqsPoller, startUploadReconciler } from './services/sqs.service';
import { startVideoWorker } from './workers/video.worker';
import cookieParser from 'cookie-parser';
import uploadRoutes from './routes/upload.routes';
import processRoutes from './routes/process.routes';
import contactRoutes from './routes/contact.routes';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import feedbackRoutes from './routes/feedback.routes';
import { isAuthenticated } from './middleware/auth.middleware';
import { globalErrorHandler } from './middleware/error.middleware';
import { initUsernameBloom, backfillUsernameBloom } from './services/bloom.service';
import { registry, httpRequestDuration, queueDepth } from './metrics';
import { videoQueue } from './queues/video.queue';


const app = express();
app.use(cookieParser());
const corsOrigins = env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || !corsOrigins?.length || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path ?? req.path,
      status_code: res.statusCode,
    });
  });
  next();
});
app.get('/metrics', async (_req, res) => {
  const waiting = await videoQueue.getWaitingCount();
  queueDepth.set(waiting);

  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    mongoState: mongoose.connection.readyState,
  });
});

app.get('/ready', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'not-ready',
        mongoState: mongoose.connection.readyState,
      });
    }

    const redisClient = await videoQueue.client;
    await redisClient.ping();

    return res.json({
      status: 'ready',
      mongoState: mongoose.connection.readyState,
      redis: 'ok',
    });
  } catch (err) {
    console.error('[readiness] Dependency check failed:', err);
    return res.status(503).json({
      status: 'not-ready',
      mongoState: mongoose.connection.readyState,
      redis: 'failed',
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/upload', isAuthenticated, uploadRoutes);
app.use('/api/process', isAuthenticated, processRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/profile', profileRoutes); 
app.use(globalErrorHandler);
async function bootstrap(): Promise<void> {
  try {
    await connectDB();
    console.info('MongoDB connected');

    // Initialize Bloom Filter and backfill
    await initUsernameBloom();
    await backfillUsernameBloom();

    app.listen(env.PORT, () => {
      console.info(`API running on http://localhost:${env.PORT}`);
      console.info(`Environment: ${env.NODE_ENV}`);
    });

    startVideoWorker();
    startSqsPoller();
    startUploadReconciler();

  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
