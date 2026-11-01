#!/usr/bin/env bash
set -euo pipefail

base_url="${SMOKE_BASE_URL:-http://127.0.0.1:8080}"
base_url="${base_url%/}"

# Compose must complete migrations and seeds before starting the API.
init_container="$(docker compose ps -a -q db-init)"
if [[ -z "$init_container" ]]; then
  echo 'ERROR: db-init container was not created.' >&2
  exit 1
fi

init_status="$(docker inspect --format '{{.State.Status}}:{{.State.ExitCode}}' "$init_container")"
if [[ "$init_status" != 'exited:0' ]]; then
  echo "ERROR: db-init did not finish successfully ($init_status)." >&2
  exit 1
fi

echo 'Database initialization completed successfully.'

# Give the public endpoint time to become ready, without relying on fixed sleeps.
ready=false
for ((attempt = 1; attempt <= 60; attempt++)); do
  if curl --fail --silent --output /dev/null --max-time 5 "$base_url/api/health"; then
    ready=true
    break
  fi
  sleep 3
done

if [[ "$ready" != true ]]; then
  echo 'ERROR: API did not become ready within the smoke test window.' >&2
  exit 1
fi

curl --fail --silent --show-error --max-time 10 "$base_url/api/health" | python3 -c '
import json
import sys

response = json.load(sys.stdin)
if response != {"status": "ok"}:
    sys.exit(f"Unexpected health response: {response!r}")
print("API health check passed.")
'

# Verify the HTML page is really served, rather than just checking HTTP status.
if ! curl --fail --silent --show-error --max-time 10 "$base_url/" | grep -Fq 'id="root"'; then
  echo 'ERROR: Frontend HTML was not served as expected.' >&2
  exit 1
fi
echo 'React frontend was served successfully.'

# Swagger lives below /api/docs, not /docs. Unknown frontend URLs must
# return 404 while still serving the SPA shell for the branded error page.
swagger_status="$(curl --location --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 "$base_url/api/docs")"
if [[ "$swagger_status" != '200' ]]; then
  echo "ERROR: Swagger /api/docs returned HTTP $swagger_status instead of 200." >&2
  exit 1
fi

echo 'Swagger /api/docs is accessible.'

for unknown_route in /docs /pagina-inexistente; do
  not_found_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 "$base_url$unknown_route")"
  if [[ "$not_found_status" != '404' ]]; then
    echo "ERROR: Unknown frontend route $unknown_route returned HTTP $not_found_status instead of 404." >&2
    exit 1
  fi
done

if ! curl --silent --show-error --max-time 10 "$base_url/docs" | grep -Fq 'id="root"'; then
  echo 'ERROR: Unknown frontend route did not serve the React 404 shell.' >&2
  exit 1
fi

echo 'Unknown frontend routes correctly return HTTP 404 and the React shell.'

check_reference_data() {
  local endpoint="$1"
  local expected="$2"
  local label="$3"

  curl --fail --silent --show-error --max-time 10 "$base_url$endpoint" | python3 -c '
import json
import sys

expected = int(sys.argv[1])
label = sys.argv[2]
records = json.load(sys.stdin)
if not isinstance(records, list) or len(records) != expected:
    actual = len(records) if isinstance(records, list) else type(records).__name__
    sys.exit(f"Expected {expected} {label}, received {actual}.")
print(f"Reference data check passed: {expected} {label}.")
' "$expected" "$label"
}

check_reference_data '/api/exams' 30 'exams'
check_reference_data '/api/doctors' 5 'doctors'

echo 'Docker Compose smoke test passed.'
