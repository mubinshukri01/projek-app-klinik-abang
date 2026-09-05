#!/bin/sh
#
# Menjalankan backup sekali sehari pada BACKUP_HOUR waktu tempatan.
#
# Gelung mudah dan bukan cron: satu proses, log pergi terus ke output bekas,
# dan tiada daemon berasingan untuk gagal secara senyap.

set -eu

BACKUP_HOUR="${BACKUP_HOUR:-2}"

echo "backup-loop: backup harian dijadualkan pada jam ${BACKUP_HOUR}:00 ($(date +%Z))"

while true; do
  NOW_H="$(date +%-H)"
  NOW_M="$(date +%-M)"

  # Saat sehingga BACKUP_HOUR seterusnya.
  SECS=$(( ((BACKUP_HOUR - NOW_H + 24) % 24) * 3600 - NOW_M * 60 ))
  [ "$SECS" -le 0 ] && SECS=$((SECS + 86400))

  echo "backup-loop: tidur ${SECS}s sehingga larian seterusnya"
  sleep "$SECS"

  # Kegagalan satu malam tidak boleh membunuh gelung — esok mesti cuba lagi.
  if ./backup.sh; then
    echo "backup-loop: backup berjaya"
  else
    echo "backup-loop: BACKUP GAGAL — semak segera" >&2
  fi
done
