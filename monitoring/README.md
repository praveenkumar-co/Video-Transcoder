# Video Transcoder — Monitoring

Full observability stack for the Video Transcoder platform using **Prometheus** + **Grafana**.

## Files

| File | Purpose |
|---|---|
| `prometheus-rbac.yaml` | ServiceAccount + ClusterRole/Binding for pod auto-discovery |
| `prometheus-pvc.yaml` | 2Gi persistent volume for TSDB (15-day retention) |
| `prometheus-config.yaml` | Scrape config (k8s SD + static targets) + alert rules |
| `prometheus-deployment.yaml` | Prometheus v2.51.0 deployment |
| `prometheus-service.yaml` | NodePort 30900 (access at `minikube ip:30900`) |
| `grafana-pvc.yaml` | 1Gi persistent volume for Grafana data |
| `grafana-provisioning-config.yaml` | Auto-provisions Prometheus datasource + dashboard directory |
| `grafana-dashboard-config.yaml` | Pre-built "Video Transcoder SRE Dashboard" (9 panels) |
| `grafana-deployment.yaml` | Grafana 10.4.0 deployment |
| `grafana-service.yaml` | NodePort 30300 (access at `minikube ip:30300`) |
| `kustomization.yaml` | Apply all resources in dependency order |

---

## Deploy

```bash
# Apply entire monitoring stack at once
kubectl apply -k monitoring/

# Or apply individual files
kubectl apply -f monitoring/prometheus-rbac.yaml
kubectl apply -f monitoring/prometheus-pvc.yaml
kubectl apply -f monitoring/prometheus-config.yaml
kubectl apply -f monitoring/prometheus-deployment.yaml
kubectl apply -f monitoring/prometheus-service.yaml
kubectl apply -f monitoring/grafana-pvc.yaml
kubectl apply -f monitoring/grafana-provisioning-config.yaml
kubectl apply -f monitoring/grafana-dashboard-config.yaml
kubectl apply -f monitoring/grafana-deployment.yaml
kubectl apply -f monitoring/grafana-service.yaml
```

## Access

```bash
# Get the minikube IP
minikube ip

# Prometheus UI  →  http://<minikube-ip>:30900
# Grafana UI     →  http://<minikube-ip>:30300
#   Default login: admin / admin
```

---

## Metrics Reference

Prometheus scrapes the following from your services:

| Service | Port | Annotations |
|---|---|---|
| `api` | 4000 | `prometheus.io/scrape: "true"` on pod |
| `transcoder-worker` | 9091 | `prometheus.io/scrape: "true"` on pod |

### Expected Metric Names

| Metric | Source | Description |
|---|---|---|
| `vp_http_requests_total` | API | Total HTTP requests (labels: method, route, status_code) |
| `vp_http_request_duration_seconds` | API | Request duration histogram |
| `vp_queue_depth` | Worker | Number of pending transcoding jobs in Redis |
| `vp_transcoder_jobs_completed_total` | Worker | Total completed jobs |
| `vp_transcoder_jobs_failed_total` | Worker | Total failed jobs |
| `vp_transcoder_job_duration_seconds` | Worker | Job processing time histogram |
| `vp_s3_uploads_total` | Worker | S3 segment upload counter (labels: status) |

> **Note**: If your worker does not yet export these metrics, use the `prom-client` npm package and expose a `/metrics` endpoint on port 9091.

---

## Alert Rules

| Alert | Trigger | Severity |
|---|---|---|
| `APIInstanceDown` | API unreachable for 1m | critical |
| `WorkerDown` | Worker unreachable for 1m | critical |
| `QueueDepthHigh` | Queue > 20 for 2m | warning |
| `QueueDepthCritical` | Queue > 100 for 3m | critical |
| `JobFailureRateHigh` | >10% failures/s for 1m | critical |
| `HighHTTP5xxErrorRate` | >5% 5xx for 1m | warning |
| `HighAPILatency` | p95 latency > 1s for 2m | warning |
