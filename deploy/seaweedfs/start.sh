#!/bin/sh
# Starts SeaweedFS (master + volume + filer + S3 gateway) in one container.
# The S3 identity file is generated from env so secrets never live in git.
#   - "app" identity: full access, used by the backend (S3_ACCESS_KEY/S3_SECRET_KEY)
#   - "anonymous":    read-only, so product/profile images can be served publicly
set -eu

: "${S3_ACCESS_KEY:?S3_ACCESS_KEY is required}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY is required}"

cat > /tmp/s3.json <<JSON
{
  "identities": [
    {
      "name": "app",
      "credentials": [
        { "accessKey": "${S3_ACCESS_KEY}", "secretKey": "${S3_SECRET_KEY}" }
      ],
      "actions": ["Admin", "Read", "List", "Tagging", "Write"]
    },
    {
      "name": "anonymous",
      "actions": ["Read"]
    }
  ]
}
JSON

# The container joins two networks, so bind every interface (otherwise
# SeaweedFS listens only on the first one it detects).
exec weed server \
  -dir=/data \
  -ip=seaweedfs \
  -ip.bind=0.0.0.0 \
  -master.volumeSizeLimitMB=1024 \
  -volume.max=0 \
  -s3 \
  -s3.port=8333 \
  -s3.config=/tmp/s3.json
