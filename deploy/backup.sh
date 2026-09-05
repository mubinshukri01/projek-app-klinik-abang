#!/bin/sh
#
# Backup pangkalan data klinik.
#
#   DATABASE_URL=... BACKUP_PASSPHRASE=... ./backup.sh
#
# Menghasilkan satu fail tersulit setiap larian:
#   <BACKUP_DIR>/klinik-YYYYMMDD-HHMMSS.dump.gpg
#
# Rekod perubatan tertakluk kepada Akta 586, jadi backup disulitkan sebelum
# ia meninggalkan pangkalan data. Fail dump yang tidak disulitkan tidak pernah
# ditulis ke cakera — pg_dump disalurkan terus ke gpg.

set -eu

BACKUP_DIR="${BACKUP_DIR:-/backup}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="${BACKUP_DIR}/klinik-${STAMP}.dump.gpg"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "backup: DATABASE_URL tidak ditetapkan" >&2
  exit 1
fi
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "backup: BACKUP_PASSPHRASE tidak ditetapkan — enggan menulis backup tanpa sulitan" >&2
  exit 1
fi

# Menukar DATABASE_URL gaya Prisma kepada URL yang libpq faham.
#
# Prisma menerima parameter yang pg_dump dan pg_restore tolak — "schema"
# terutamanya, yang menyebabkan "invalid URI query parameter". Buang parameter
# khusus Prisma sahaja, dan kekalkan yang libpq faham seperti sslmode.
libpq_url() {
  printf '%s' "$1" | sed -E \
    -e 's/([?&])(schema|connection_limit|pool_timeout|pgbouncer|socket_timeout|statement_cache_size|sslidentity|sslpassword)=[^&]*/\1/g' \
    -e 's/&+/\&/g' \
    -e 's/\?&/?/' \
    -e 's/[?&]$//'
}

mkdir -p "$BACKUP_DIR"

PG_URL="$(libpq_url "$DATABASE_URL")"

echo "backup: memulakan $STAMP"

# Format tersuai (-Fc) supaya pg_restore boleh memulihkan sebahagian jadual
# dan memulihkan secara selari. Tulis ke fail sementara dahulu supaya larian
# yang terganggu tidak meninggalkan fail separuh yang kelihatan sah.
if ! pg_dump --format=custom --no-owner --no-privileges "$PG_URL" \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase "$BACKUP_PASSPHRASE" \
        --output "${TARGET}.partial"; then
  rm -f "${TARGET}.partial"
  echo "backup: GAGAL" >&2
  exit 1
fi

mv "${TARGET}.partial" "$TARGET"
SIZE="$(wc -c < "$TARGET")"

# Dump yang mencurigakan kecil bermakna ada yang tidak kena — lebih baik
# gagal dengan kuat daripada mengumpul backup kosong selama berbulan.
#
# Fail itu MESTI dibuang, bukan sekadar dilaporkan: fail 70 bait yang
# ditinggalkan pada cakera kelihatan seperti backup sah kepada sesiapa yang
# memulihkan "yang terkini", dan akan diambil sebagai satu.
if [ "$SIZE" -lt 1024 ]; then
  rm -f "$TARGET"
  echo "backup: hasil hanya ${SIZE} bait — dibuang dan dianggap gagal" >&2
  exit 1
fi

echo "backup: siap ${TARGET} (${SIZE} bait)"

# Salinan luar tapak, jika rclone dikonfigurasikan.
if [ -n "${RCLONE_REMOTE:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "backup: memuat naik ke ${RCLONE_REMOTE}"
    rclone copy "$TARGET" "$RCLONE_REMOTE" || {
      # Muat naik gagal tidak memusnahkan backup tempatan; laporkan dan teruskan.
      echo "backup: AMARAN muat naik gagal, salinan tempatan disimpan" >&2
    }
  else
    echo "backup: AMARAN RCLONE_REMOTE ditetapkan tetapi rclone tidak dipasang" >&2
  fi
fi

# Simpanan: buang backup lama supaya cakera mini PC tidak penuh.
find "$BACKUP_DIR" -name 'klinik-*.dump.gpg' -type f -mtime "+${KEEP_DAYS}" -print -delete

COUNT="$(find "$BACKUP_DIR" -name 'klinik-*.dump.gpg' -type f | wc -l)"
echo "backup: ${COUNT} backup disimpan dalam ${BACKUP_DIR}"
