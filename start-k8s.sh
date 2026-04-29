
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_IMAGES=true

for arg in "$@"; do
  [[ "$arg" == "--no-build" ]] && BUILD_IMAGES=false
done

echo ""
echo "  Starting Minikube (2 CPUs, 2800MB RAM)..."
minikube start --driver=docker --cpus=2 --memory=2800 --no-vtx-check

echo ""
echo "🐳  Pointing Docker at Minikube's daemon..."
eval "$(minikube docker-env)"

if [ "$BUILD_IMAGES" = true ]; then
  echo ""
  echo "🔨  Building Docker images inside Minikube..."
  docker build -t video-api:latest    "$PROJECT_ROOT/apps/api"
  docker build -t video-worker:latest "$PROJECT_ROOT/apps/transcoder"
  echo " Images built."
else
  echo "  Skipping image build (--no-build)."
fi

echo ""
echo " Applying all Kubernetes manifests..."
kubectl apply -f "$PROJECT_ROOT/k8s/secret.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/configmap.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/redis.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/api.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/worker.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/prometheus.yaml"   2>/dev/null || true
kubectl apply -f "$PROJECT_ROOT/k8s/grafana.yaml"      2>/dev/null || true
kubectl apply -f "$PROJECT_ROOT/k8s/scaledobject.yaml" 2>/dev/null || true
kubectl apply -f "$PROJECT_ROOT/scaledobject.yaml"     2>/dev/null || true

echo ""
echo "⏳  Waiting for core pods to be Ready (up to 3 min)..."
kubectl wait --for=condition=Ready pod -l app=redis      --timeout=180s
kubectl wait --for=condition=Ready pod -l app=api        --timeout=180s

echo ""
echo " All pods:"
kubectl get pods

echo ""
echo "======================================================"
echo " Service URLs (open these in browser):"
echo "======================================================"
echo ""
echo "  API:"
minikube service api --url 2>/dev/null | head -1
echo ""
echo "  Prometheus:"
minikube service prometheus --url 2>/dev/null | head -1 || echo "  (not deployed)"
echo ""
echo "  Grafana (admin/admin):"
minikube service grafana --url 2>/dev/null | head -1 || echo "  (not deployed)"
echo ""
echo "======================================================"
echo " Quick health check:"
API_URL=$(minikube service api --url 2>/dev/null | head -1)
sleep 2
curl -s "$API_URL/health" 2>/dev/null || echo "  API not ready yet — wait a few seconds"
echo ""
echo "======================================================"
echo ""
echo " Done! Stack is up."
