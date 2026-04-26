#!/usr/bin/env bash
# ==============================================================================
# start-k8s.sh — Safe minikube startup script for MacBook Air 5
# SAFETY: Caps minikube to 2 CPUs + 2800MB RAM.
# Rebuilds images, applies k8s manifests, and verifies pods are Running.
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🛡️  Safety-first: Setting minikube resource caps..."
minikube config set cpus 2
minikube config set memory 2800

echo ""
echo "🚀  Starting minikube (2 CPUs, 2800MB)..."
minikube start --driver=docker --cpus=2 --memory=2800 --no-vtx-check

echo ""
echo "🐳  Pointing Docker at minikube's daemon..."
eval "$(minikube docker-env)"

echo ""
echo "🔨  Building Docker images inside minikube..."
docker build -t video-api   "$PROJECT_ROOT/apps/api"
docker build -t video-worker "$PROJECT_ROOT/apps/transcoder"

echo ""
echo "📋  Applying Kubernetes manifests..."
kubectl apply -f "$PROJECT_ROOT/k8s/configmap.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/secret.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/redis.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/api.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/worker.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/hpa.yaml"

echo ""
echo "⏳  Waiting for all pods to be Ready (up to 3 min)..."
kubectl wait --for=condition=Ready pod -l app=redis  --timeout=180s
kubectl wait --for=condition=Ready pod -l app=api    --timeout=180s
kubectl wait --for=condition=Ready pod -l app=worker --timeout=180s

echo ""
echo "✅  All pods running:"
kubectl get pods

echo ""
echo "🌐  API URL:"
minikube service api --url
