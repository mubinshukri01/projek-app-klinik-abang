#!/bin/sh
#
# Latihan pemulihan: mengesahkan backup benar-benar boleh dipulihkan.
#
#   DATABASE_URL=... BACKUP_PASSPHRASE=... ./latihan-pemulihan.sh [fail-backup]
#
# Backup yang tidak pernah diuji bukan backup. Skrip ini memulihkan backup
# ke pangkalan data UJIAN yang berasingan dan membandingkan kiraan baris
# dengan pangkalan data langsung. Pangkalan data langsung TIDAK disentuh.
#
# Jalankan sekurang-kurangnya sekali sebulan, dan selepas setiap naik taraf.

set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "latihan: DATABASE_URL tidak ditetapkan" >&2
  exit 1
fi
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "latihan: BACKUP_PASSPHRASE tidak ditetapkan" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/backup}"
ARCHIVE="${1:-$(ls -1t "${BACKUP_DIR}"/klinik-*.dump.gpg 2>/dev/null | head -1)}"

if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  echo "latihan: tiada fail backup dijumpai dalam ${BACKUP_DIR}" >&2
  exit 1
fi

libpq_url() {
  printf '%s' "$1" | sed -E \
    -e 's/([?&])(schema|connection_limit|pool_timeout|pgbouncer|socket_timeout|statement_cache_size|sslidentity|sslpassword)=[^&]*/\1/g' \
    -e 's/&+/\&/g' \
    -e 's/\?&/?/' \
    -e 's/[?&]$//'
}

LIVE_URL="$(libpq_url "$DATABASE_URL")"
DRILL_DB="klinik_latihan_$(date +%Y%m%d%H%M%S)"

# Pangkalan data latihan dicipta di sebelah yang langsung, pada pelayan yang
# sama, dengan menukar nama pangkalan data dalam URL.
DRILL_URL="$(printf '%s' "$LIVE_URL" | sed -E "s#/[^/?]+(\?|$)#/${DRILL_DB}\1#")"
ADMIN_URL="$(printf '%s' "$LIVE_URL" | sed -E "s#/[^/?]+(\?|$)#/postgres\1#")"

# Jadual yang mesti bertahan dalam pemulihan. Penjujukan disertakan dengan
# sengaja: jika ia hilang, nombor invois dan siri MC akan bermula semula dan
# berlanggar dengan dokumen yang sudah berada di tangan pesakit.
TABLES='Patient Visit Consultation Diagnosis Invoice InvoiceLine Payment Drug DrugBatch StockMovement PrescriptionItem MedicalCertificate Panel PanelClaim AuditLog NumberSequence'

counts() {
  url="$1"
  for t in $TABLES; do
    n="$(psql "$url" -t -A -c "SELECT count(*) FROM \"$t\";" 2>/dev/null || echo "RALAT")"
    printf '%s=%s\n' "$t" "$n"
  done
}

cleanup() {
  psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$DRILL_DB\";" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "latihan: arkib   $ARCHIVE"
echo "latihan: sasaran $DRILL_DB (pangkalan data langsung tidak disentuh)"
echo

psql "$ADMIN_URL" -q -c "CREATE DATABASE \"$DRILL_DB\";"

gpg --batch --yes --decrypt --passphrase "$BACKUP_PASSPHRASE" "$ARCHIVE" \
  | pg_restore --dbname "$DRILL_URL" --no-owner --no-privileges --single-transaction

LIVE="$(counts "$LIVE_URL")"
DRILL="$(counts "$DRILL_URL")"

# Pangkalan data langsung terus berubah selepas backup diambil, jadi
# perbandingan lurus akan sentiasa hanyut bagi jadual tambah-sahaja seperti
# AuditLog. Yang penting bukan kesamaan mutlak, tetapi sama ada backup
# KEHILANGAN data:
#
#   backup == langsung   ok
#   backup <  langsung   hanyut — baris ditambah selepas backup diambil
#   backup >  langsung   MENCURIGAKAN — langsung mempunyai kurang daripada backup
#   backup == 0          GAGAL — jadual kosong sedangkan langsung ada data
echo "Jadual                    Langsung   Backup  Keputusan"
echo "------------------------------------------------------"
FAILED=0
DRIFT=0
for t in $TABLES; do
  live_n="$(printf '%s\n' "$LIVE"  | sed -n "s/^${t}=//p")"
  dril_n="$(printf '%s\n' "$DRILL" | sed -n "s/^${t}=//p")"

  if [ "$dril_n" = "RALAT" ]; then
    mark="GAGAL jadual hilang"
    FAILED=$((FAILED + 1))
  elif [ "$dril_n" = "$live_n" ]; then
    mark="ok"
  elif [ "$dril_n" -eq 0 ] && [ "$live_n" -gt 0 ]; then
    mark="GAGAL kosong dalam backup"
    FAILED=$((FAILED + 1))
  elif [ "$dril_n" -lt "$live_n" ]; then
    mark="hanyut (+$((live_n - dril_n)) selepas backup)"
    DRIFT=$((DRIFT + 1))
  else
    mark="GAGAL backup melebihi langsung"
    FAILED=$((FAILED + 1))
  fi

  printf '%-24s %8s %8s  %s\n' "$t" "$live_n" "$dril_n" "$mark"
done

echo
if [ "$FAILED" -eq 0 ]; then
  echo "latihan: LULUS — setiap jadual dipulihkan dan tiada data hilang."
  if [ "$DRIFT" -gt 0 ]; then
    echo "latihan: ${DRIFT} jadual mempunyai baris lebih baharu daripada backup."
    echo "latihan: ini dijangka — backup ialah gambaran pada satu masa."
  fi
  echo "latihan: rekodkan tarikh ini. Backup yang tidak diuji bukan backup."
else
  echo "latihan: GAGAL — ${FAILED} jadual bermasalah." >&2
  echo "latihan: JANGAN bergantung pada backup ini. Siasat sebelum go-live." >&2
  exit 1
fi
