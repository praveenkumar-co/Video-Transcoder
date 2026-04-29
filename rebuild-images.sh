#!/usr/bin/env bash
# rebuild-images.sh — Build fresh images inside Minikube's Docker and redeploy
set -euo pipefail

echo "==> Pointing Docker to Minikube's daemon..."
eval $(minikube docker-env)

echo "==> Building API image..."
docker build -t video-api:latest ./apps/api

echo "==> Building Worker image..."
docker build -t video-worker:latest ./apps/transcoder

echo "==> Restoring local Docker env..."
eval $(minikube docker-env --unset)

echo "==> Re-applying k8s manifests..."
kubectl apply -f k8s/

echo "==> Force-restarting deployments to pick up new images..."
kubectl rollout restart deployment/api
kubectl rollout restart deployment/transcoder-worker

echo "==> Waiting for rollouts to finish..."
kubectl rollout status deployment/api --timeout=90s
kubectl rollout status deployment/transcoder-worker --timeout=90s

echo ""
echo "Done! Verifying pods..."
kubectl get pods

echo ""
echo "Test API metrics:"
echo "  kubectl port-forward svc/api 4001:4000 &"
echo "  curl http://localhost:4001/metrics"
