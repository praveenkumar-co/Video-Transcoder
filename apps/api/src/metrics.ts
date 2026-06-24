import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });
export const jobsEnqueued = new Counter({
  name: 'vp_jobs_enqueued_total',
  help: 'Total number of transcoding jobs enqueued',
  registers: [registry],
});
export const queueDepth = new Gauge({
  name: 'vp_queue_depth',
  help: 'Number of jobs currently waiting in the BullMQ queue',
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'vp_http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});