#!/bin/sh
set -eu

mkdir -p /app/instance

uploads_dir="${BASE_UPLOADS_LOCATION:-/app/storage/images}"
mkdir -p "$uploads_dir"

if [ -d /app/public/static ]; then
  cp -rn /app/public/static/. "$uploads_dir"/
fi

exec "$@"
