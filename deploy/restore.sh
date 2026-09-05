#!/bin/sh
#
# Memulihkan pangkalan data klinik daripada backup tersulit.
#
#   DATABASE_URL=... BACKUP_PASSPHRASE=... ./restore.sh /backup/klinik-....dump.gpg
#
# INI MEMUSNAHKAN. Ia menggantikan kandungan pangkalan data sasaran.
# Jalankan pada pangkalan data ujian dahulu — lihat docs/PEMULIHAN.md.

set -eu

ARCHIVE="${1:-}"

if [ -z "$ARCHIVE" ]; then
  echo "penggunaan: restore.sh <fail-backup.dump.gpg>" >&2
  exit 1
fi
if [ ! -f "$ARCHIVE" ]; then
  echo "restore: fail tidak dijumpai: $ARCHIVE" >&2
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "restore: DATABASE_URL tidak ditetapkan" >&2
  exit 1
fi
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "restore: BACKUP_PASSPHRASE tidak ditetapkan" >&2
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

PG_URL="$(libpq_url "$DATABASE_URL")"

echo "restore: memulihkan daripada $ARCHIVE"
echo "restore: sasaran ialah pangkalan data dalam DATABASE_URL — kandungan sedia ada akan diganti"

# --clean --if-exists menjatuhkan objek sedia ada sebelum mencipta semula,
# supaya pemulihan ke pangkalan data yang sudah berisi tidak gagal separuh
# jalan dan meninggalkan campuran data lama dan baharu.
gpg --batch --yes --decrypt --passphrase "$BACKUP_PASSPHRASE" "$ARCHIVE" \
  | pg_restore --dbname "$PG_URL" \
      --clean --if-exists --no-owner --no-privileges --single-transaction

echo "restore: siap"
echo "restore: sahkan kiraan sebelum mempercayai pemulihan ini — lihat docs/PEMULIHAN.md"
