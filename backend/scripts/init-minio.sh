#!/bin/sh
set -e

# รอ MinIO พร้อม (retry จนกว่าจะสำเร็จ)
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

sleep 20  # รอ MinIO พร้อมจริง ๆ ก่อนสร้าง bucket (เพิ่มเวลารอ)

# ฟังก์ชันสร้าง bucket พร้อมเช็คว่ามีอยู่แล้ว
create_bucket() {
  BUCKET=$1
  RETRY=0
  MAX_RETRY=10
  # เช็คว่ามี bucket อยู่แล้วหรือยัง
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

# สร้าง buckets
create_bucket products
create_bucket profiles
create_bucket stores
create_bucket reviews

# ตั้ง policy public read
for BUCKET in products profiles stores reviews; do
  mc anonymous set download myminio/$BUCKET || echo "Failed to set policy for $BUCKET"
done

echo "MinIO buckets and policies initialized." 