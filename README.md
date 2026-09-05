# Sistem Pengurusan Klinik

Sistem pengurusan klinik GP untuk klinik swasta di Malaysia. Direka mengikut
aliran kerja sebenar klinik am — termasuk **dispensari dalam klinik**, yang
membezakan klinik Malaysia daripada kebanyakan EMR luar negara.

Dibina untuk berjalan **dalam premis klinik** pada satu mini PC, supaya sistem
kekal berfungsi walaupun talian internet terputus.

## Amaran penting

1. **Rekod perubatan adalah tanggungjawab undang-undang.** Klinik swasta
   tertakluk kepada Akta 586 (*Private Healthcare Facilities and Services Act
   1998*) dan PDPA 2010. Kehilangan data bukan sekadar kerugian teknikal.
   Backup sahaja tidak memadai — **latihan pemulihan mesti dijalankan** sebelum
   sistem digunakan pada pesakit sebenar.
2. **Data benih adalah contoh.** Senarai ubat, dos lalai dan harga dalam
   `prisma/seed-data.ts` disediakan supaya sistem boleh dijalankan serta-merta.
   Doktor yang bertanggungjawab **mesti menyemak dan mengesahkan formulari**
   melalui skrin Tetapan sebelum menggunakannya pada pesakit.
3. **Tukar semua kata laluan benih** sebelum klinik beroperasi.

## Teknologi

| Lapisan | Pilihan |
|---|---|
| Aplikasi | Next.js 16 (App Router) + TypeScript |
| Pangkalan data | PostgreSQL 16 |
| ORM | Prisma 7 (adapter `@prisma/adapter-pg`) |
| Antara muka | Tailwind CSS 4 |
| Sesi | Sesi berasaskan pangkalan data (bukan JWT) |
| Deployment | Docker Compose — Caddy, aplikasi, Postgres |

## Pembangunan tempatan

Perlukan Node.js 22+ dan PostgreSQL 16.

```bash
npm install
cp .env.example .env          # isi DATABASE_URL, SESSION_SECRET, KIOSK_TOKEN
npm run db:migrate            # cipta skema dan jana klien Prisma
npm run db:seed               # data rujukan + akaun permulaan
npm run dev
```

Akaun benih: `admin`, `doktor`, `jururawat`, `kaunter`, `farmasi`
Kata laluan lalai: `klinik1234` (boleh diubah melalui `SEED_PASSWORD`).

## Pemeriksaan

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm test             # ujian unit (Vitest)
node e2e/smoke.mjs   # pemeriksaan hujung-ke-hujung, perlukan pelayan berjalan
```

## Deployment on-prem

```bash
cp .env.example .env          # tetapkan POSTGRES_PASSWORD, SESSION_SECRET, KIOSK_TOKEN
docker compose up -d --build
```

Kaunter mengakses sistem melalui `http://<ip-mini-pc>` pada LAN klinik.
Migrasi dijalankan automatik semasa permulaan oleh perkhidmatan `migrate`.

Zon waktu semua bekas ditetapkan ke `Asia/Kuala_Lumpur` — nombor giliran harian
dan penutupan kaunter bergantung pada hari **tempatan**, bukan hari UTC.

## Backup dan pemulihan

Perkhidmatan `backup` mengambil `pg_dump` setiap hari, menyulitkannya dengan
AES-256, dan menyimpannya ke `./backup` pada mini PC. Dump yang tidak
disulitkan tidak pernah ditulis ke cakera.

```bash
docker compose exec backup ./latihan-pemulihan.sh   # latihan bulanan
docker compose exec backup ./restore.sh /backup/klinik-....dump.gpg
```

**Latihan pemulihan bulanan adalah wajib**, bukan cadangan. Skrip latihan
memulihkan ke pangkalan data ujian berasingan dan membandingkan kiraan setiap
jadual — pangkalan data langsung tidak disentuh. Prosedur penuh, termasuk
pemulihan sebenar selepas kehilangan data, ada dalam
[`docs/PEMULIHAN.md`](docs/PEMULIHAN.md).

`BACKUP_PASSPHRASE` mesti disimpan **di luar mini PC**. Tanpanya, tiada satu
pun backup boleh dibuka.

## Pencetak

Tiga saiz digunakan: label ubat 70 × 40 mm, resit terma 80 mm, dan A4 untuk
MC, surat rujukan dan borang makmal. Persediaan dalam
[`docs/PENCETAK.md`](docs/PENCETAK.md).

## Kawalan akses

Peranan: `ADMIN`, `DOCTOR`, `NURSE`, `FRONTDESK`, `PHARMACY`.

`ADMIN` **tidak** diberi kelulusan menyeluruh — skrin klinikal terhad kepada
doktor dan jururawat, kerana hanya doktor berdaftar MMC yang boleh
menandatangani rekod perubatan. Peraturan ditakrifkan sekali dalam
`src/lib/access.ts` dan digunakan oleh kedua-dua pelayan dan navigasi.

## Skop yang sengaja tidak dibina

| Perkara | Sebab |
|---|---|
| Penghantaran tuntutan Skim Perubatan MADANI | Guna portal **PRIMIS** (ProtectHealth). Sistem ini merekod dan menanda lawatan sahaja. Semenyih berada dalam daerah Hulu Langat, yang layak untuk skim ini. |
| Integrasi API panel/TPA | PMCare, MediExpress dan HealthMetrics tiada API awam. Sistem menjana senarai tuntutan untuk dimasukkan ke portal mereka. |
| Penghantaran LHDN e-Invoice | Ambang wajib ialah RM1 juta mulai 1 Januari 2026. Medan pangkalan data (`buyerTin`, `einvoiceUuid`, `einvoiceStatus`) sudah disediakan supaya penghantaran MyInvois boleh ditambah tanpa migrasi data. |
| Apl mudah alih pesakit, telemedicine, multi-cawangan | Di luar skop keluaran pertama. |
| Helper pembaca kad MyKad | Memerlukan perkakasan pembaca sebenar untuk disahkan. Taip nombor IC secara manual sudah mengisi tarikh lahir, jantina dan negeri kelahiran secara automatik. Boleh ditambah kemudian tanpa perubahan skema. |
