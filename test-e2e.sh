
set -euo pipefail

API_URL="${1:-}" 

if [ -z "$API_URL" ]; then
  echo "Auto-detecting API URL via minikube tunnel..."
  API_URL=$(minikube service api --url 2>/dev/null | head -1)
fi

echo ""
echo "================================================="
echo " End-to-End Test"
echo " API: $API_URL"
echo "================================================="
echo ""
echo "[1/4] Downloading tiny test video..."
TEST_VIDEO="/tmp/test-video.mp4"
if [ ! -f "$TEST_VIDEO" ]; then
  curl -sL "https://www.w3schools.com/html/mov_bbb.mp4" -o "$TEST_VIDEO"
fi
SIZE=$(wc -c < "$TEST_VIDEO")
echo "     Downloaded: $TEST_VIDEO ($SIZE bytes)"

echo ""
echo "[2/4] Getting presigned upload URL..."
RESPONSE=$(curl -s -X POST "$API_URL/api/upload/presigned-url" \
  -H "Content-Type: application/json" \
  -d "{\"fileName\":\"test-video.mp4\",\"mimeType\":\"video/mp4\",\"sizeBytes\":$SIZE}")

echo "     Response: $RESPONSE" | head -c 300
echo ""

VIDEO_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['videoId'])")
UPLOAD_URL=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['uploadUrl'])")

echo "     VideoID:   $VIDEO_ID"
echo "     UploadURL: ${UPLOAD_URL:0:80}..."

echo ""
echo " [3/4] Uploading video to S3 via presigned URL..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PUT \
  -H "Content-Type: video/mp4" \
  --data-binary "@$TEST_VIDEO" \
  "$UPLOAD_URL")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "     Upload successful (HTTP $HTTP_CODE)"
else
  echo "      Upload failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo ""
echo "     Response: $TRANSCODE_RESPONSE"
JOB_ID=$(echo "$TRANSCODE_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['jobId'])" 2>/dev/null || echo "unknown")
echo "     Job ID: $JOB_ID"

echo ""
echo "================================================="
echo "Job submitted! Now watching worker logs..."
echo "   VideoID: $VIDEO_ID"
echo "   JobID:   $JOB_ID"
echo "================================================="
echo ""
echo "Watching for: Downloading → FFmpeg → Uploading → Done"
echo "   (KEDA may take 15-30s to scale worker up if it was at 0)"
echo ""
echo "Press Ctrl+C to stop watching"
echo ""

kubectl logs -l app=worker -f --tail=5
