#!/bin/sh
set -e

RETRY=0
MAX_RETRY=30
until mc alias set myminio http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
  RETRY=$((RETRY+1))
  if [ $RETRY -ge $MAX_RETRY ]; then
    echo "MinIO is not ready after $MAX_RETRY attempts. Exiting."
    exit 1
  fi
  echo "Waiting for MinIO to be ready... ($RETRY/$MAX_RETRY)"
  sleep 2
done

create_bucket() {
  BUCKET=$1
  RETRY=0
  MAX_RETRY=10
  if mc ls myminio/$BUCKET 2>/dev/null; then
    echo "Bucket $BUCKET already exists. Skipping."
    return 0
  fi
  until mc mb myminio/$BUCKET 2>/dev/null; do
    RETRY=$((RETRY+1))
    if [ $RETRY -ge $MAX_RETRY ]; then
      echo "Failed to create bucket $BUCKET after $MAX_RETRY attempts. Skipping."
      return 0
    fi
    echo "Retrying to create bucket $BUCKET... ($RETRY/$MAX_RETRY)"
    sleep 1
  done
}

# Keep in sync with BUCKETS in src/config/minio.js.
BUCKETS="products profiles stores reviews brands categories"

for BUCKET in $BUCKETS; do
  create_bucket "$BUCKET"
  mc anonymous set download "myminio/$BUCKET" || echo "Failed to set policy for $BUCKET"
done

echo "MinIO buckets and policies initialized."
