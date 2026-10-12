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

# Volume sizing, tuned for product images on a small server. SeaweedFS's
# defaults derive the volume count from free disk and grow 7 x 1 GB volumes per
# bucket, which exhausts small disks so every upload fails. Volumes are not
# preallocated: disk is only used as files are written.
VOLUME_SIZE_LIMIT_MB="${SEAWEEDFS_VOLUME_SIZE_LIMIT_MB:-256}"
VOLUME_MAX="${SEAWEEDFS_VOLUME_MAX:-100}"
export WEED_MASTER_VOLUME_GROWTH_COPY_1="${SEAWEEDFS_VOLUME_GROWTH:-1}"

# The container joins two networks, so bind every interface (otherwise
# SeaweedFS listens only on the first one it detects).
exec weed server \
  -dir=/data \
  -ip=seaweedfs \
  -ip.bind=0.0.0.0 \
  -master.volumeSizeLimitMB="$VOLUME_SIZE_LIMIT_MB" \
  -volume.max="$VOLUME_MAX" \
  -s3 \
  -s3.port=8333 \
  -s3.config=/tmp/s3.json
