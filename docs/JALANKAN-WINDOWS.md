# Jalankan pada laptop Windows

Panduan ini untuk **mencuba sistem pada laptop anda sendiri** — bukan untuk
klinik yang beroperasi. Untuk pemasangan sebenar dalam klinik, gunakan Docker
Compose seperti dalam [README](../README.md), kerana ia turut menyediakan
backup automatik dan proksi terbalik.

Semua arahan di bawah ditaip dalam **PowerShell**.

---

## Langkah 1 — Pasang alat yang diperlukan

Buka PowerShell dan jalankan:

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install PostgreSQL.PostgreSQL.16
```

> Jika `winget` mengadu pakej tidak dijumpai, cari dahulu:
> `winget search postgresql` — nama pakej kadang berubah antara versi.
> Anda juga boleh memasang secara manual dari
> [nodejs.org](https://nodejs.org) dan
> [postgresql.org/download/windows](https://www.postgresql.org/download/windows/).

Semasa memasang PostgreSQL, pemasang akan meminta **kata laluan untuk pengguna
`postgres`**. Tulis kata laluan itu — anda memerlukannya di Langkah 3.
Biarkan port pada **5432**.

**Tutup dan buka semula PowerShell** selepas pemasangan, supaya arahan baharu
dikenali. Kemudian sahkan:

```powershell
node --version    # mesti v22 atau lebih tinggi
git --version
```

---

## Langkah 2 — Muat turun kod

```powershell
cd ~\Documents
git clone -b claude/clinic-app-semenyih-qf9gtn https://github.com/mubinshukri01/projek-app-klinik-abang
cd projek-app-klinik-abang
```

---

## Langkah 3 — Cipta pangkalan data

Buka **SQL Shell (psql)** dari menu Mula. Tekan Enter untuk menerima setiap
soalan lalai (Server, Database, Port, Username), kemudian masukkan kata laluan
`postgres` yang anda tetapkan semasa pemasangan.

Dalam psql, taip dua arahan ini — **tukar `katalaluan_anda`** kepada kata
laluan pilihan anda:

```sql
CREATE ROLE klinik WITH LOGIN PASSWORD 'katalaluan_anda' CREATEDB;
CREATE DATABASE klinik OWNER klinik;
```

Taip `\q` untuk keluar.

> **Kenapa `CREATEDB`?** Alat migrasi mencipta pangkalan data bayangan
> sementara untuk mengesahkan perubahan skema. Tanpa kebenaran ini, Langkah 5
> akan gagal dengan `permission denied to create database`.

> **Tiada pintasan SQL Shell?** Gunakan laluan penuh dalam PowerShell:
> ```powershell
> & 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres
> ```

---

## Langkah 4 — Sediakan fail tetapan

```powershell
Copy-Item .env.example .env
```

Sistem memerlukan dua rahsia rawak. Jana kedua-duanya dengan PowerShell:

**`SESSION_SECRET`** — melindungi sesi log masuk:

```powershell
$b=[byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
[Convert]::ToBase64String($b)
```

**`KIOSK_TOKEN`** — untuk skrin TV ruang menunggu:

```powershell
$b=[byte[]]::new(16)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
-join ($b | ForEach-Object { $_.ToString('x2') })
```

> Arahan ini menggunakan penjana nombor rawak **kriptografi**. Jangan ganti
> dengan `Get-Random` — ia boleh diramal, dan rahsia sesi inilah yang
> melindungi rekod perubatan pesakit.

Sekarang buka fail tetapan:

```powershell
notepad .env
```

Isi tiga baris ini, kemudian simpan:

```
DATABASE_URL="postgresql://klinik:katalaluan_anda@localhost:5432/klinik?schema=public"
SESSION_SECRET="<tampal hasil arahan pertama>"
KIOSK_TOKEN="<tampal hasil arahan kedua>"
```

> **Jika kata laluan anda mengandungi simbol** seperti `@ : / ? #`, ia akan
> memecahkan URL. Gunakan kata laluan huruf dan nombor sahaja, atau enkod
> simbol tersebut (`@` menjadi `%40`).

Baris `POSTGRES_*` dan `BACKUP_*` yang selebihnya hanya digunakan oleh Docker
Compose — biarkan sahaja.

---

## Langkah 5 — Pasang dan sediakan

```powershell
npm install
npm run db:migrate
npm run db:seed
```

`db:migrate` mencipta semua jadual. `db:seed` memasukkan 74 ubat contoh,
61 kod diagnosis ICD-10, senarai harga servis, dan lima akaun pengguna.

---

## Langkah 6 — Jalankan

```powershell
npm run dev
```

Buka pelayar ke **http://localhost:3000**

Untuk menghentikan pelayan, tekan `Ctrl + C` dalam PowerShell.
Untuk menjalankan semula kemudian, cukup `npm run dev` sahaja — langkah 1
hingga 5 tidak perlu diulang.

---

## Log masuk

| Nama pengguna | Peranan | Boleh lihat |
|---|---|---|
| `admin` | Pentadbir | Tetapan, laporan, panel, inventori |
| `doktor` | Doktor | Konsultasi, diagnosis, preskripsi, MC |
| `jururawat` | Jururawat | Tanda vital, rekod alahan |
| `kaunter` | Kaunter depan | Pendaftaran, giliran, bil |
| `farmasi` | Farmasi | Dispensari, stok ubat |

Kata laluan untuk semua: **`klinik1234`**

> ⚠️ Ini kata laluan lalai yang diketahui umum. Jika anda menjalankan sistem
> ini dengan data pesakit sebenar, tukar semuanya melalui **Tetapan →
> Pengguna**, dan tukar kata laluan sendiri melalui pautan nama anda di
> penjuru atas kanan.

---

## Data contoh (pilihan)

Sistem yang baru dipasang mempunyai papan giliran kosong. Untuk mengisinya
dengan enam pesakit pada pelbagai peringkat rawatan — berguna untuk melatih
kakitangan — jalankan skrip demo.

Ia memandu pelayar sebenar melalui aplikasi, jadi pasang pelayar itu dahulu:

```powershell
npx playwright install chromium
```

Kemudian, **dengan `npm run dev` masih berjalan dalam tetingkap PowerShell
yang lain**:

```powershell
node e2e/data-demo.mjs
```

---

## Menyelesaikan masalah

### `psql : The term 'psql' is not recognized`
PostgreSQL tidak ditambah ke PATH. Gunakan pintasan **SQL Shell (psql)** dari
menu Mula, atau laluan penuh:
`& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres`

### `P1001: Can't reach database server at localhost:5432`
PostgreSQL tidak berjalan. Semak:

```powershell
Get-Service postgresql*
```

Jika statusnya `Stopped`, hidupkan:

```powershell
Start-Service postgresql-x64-16
```

### `P1000: Authentication failed`
Kata laluan dalam `DATABASE_URL` tidak sepadan dengan yang anda tetapkan di
Langkah 3, atau ia mengandungi simbol yang memecahkan URL. Lihat nota
pengekodan simbol di Langkah 4.

### `Prisma Migrate could not create the shadow database`
Peranan `klinik` tiada kebenaran mencipta pangkalan data. Buka SQL Shell
sebagai `postgres` dan berikannya:

```sql
ALTER ROLE klinik CREATEDB;
```

### `Error: P3009` atau migrasi tersekat
Pangkalan data mungkin separuh siap dari percubaan sebelumnya. Padam dan cipta
semula dalam psql, kemudian ulang Langkah 5:

```sql
DROP DATABASE klinik;
CREATE DATABASE klinik OWNER klinik;
```

### `Cannot find module '@/generated/prisma/client'`
Klien Prisma belum dijana:

```powershell
npm run db:generate
```

### Port 3000 sudah diguna
Jalankan pada port lain:

```powershell
$env:PORT=3001; npm run dev
```

### `npm install` gagal dengan `Cannot read properties of null (reading 'edgesOut')`
Pepijat npm yang diketahui. Bersihkan cache dan cuba semula:

```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install
```

---

## Sebelum menggunakan data pesakit sebenar

Menjalankan `npm run dev` pada laptop adalah untuk **mencuba dan belajar**.
Sebelum sistem ini menyentuh rekod pesakit sebenar:

1. Pasang melalui Docker Compose pada mesin khusus dalam klinik — ia
   menyediakan backup harian tersulit yang pemasangan laptop ini tidak ada.
2. Jalankan [latihan pemulihan](PEMULIHAN.md) dan sahkan ia lulus.
3. Doktor mesti menyemak setiap dos dan harga dalam **Tetapan → Formulari**.
   Data yang dihantar bersama pemasangan adalah contoh sahaja.
4. Tukar semua kata laluan lalai.
