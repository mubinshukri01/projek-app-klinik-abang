# Persediaan pencetak

Sistem ini mencetak melalui pelayar. Tiada pemacu khas diperlukan pada
pelayan — pencetak dipasang pada PC kaunter seperti biasa, dan halaman cetak
menetapkan saiz kertasnya sendiri melalui CSS `@page`.

## Tiga saiz yang digunakan

| Dokumen | Saiz | Pencetak biasa |
|---|---|---|
| Label ubat | 70 × 40 mm | Pencetak label terma |
| Resit | 80 mm lebar, panjang berterusan | Pencetak resit terma |
| MC, surat rujukan, borang makmal | A4 | Pencetak pejabat biasa |

## Label ubat (70 × 40 mm)

Halaman: `/print/label/<id>` atau `/print/label/lawatan/<id>` untuk semua
ubat satu lawatan sekali gus.

1. Pasang pencetak label pada PC dispensari.
2. Dalam tetapan pencetak, tetapkan saiz media kepada **70 × 40 mm**.
3. Dalam dialog cetak pelayar: margin **None**, skala **100%**, dan matikan
   **Headers and footers** — jika tidak, URL dan tarikh pelayar akan
   dicetak di atas arahan ubat.
4. Tetapkan pencetak label sebagai pencetak lalai pada PC itu.

Jika klinik menggunakan saiz label lain, tukar `@page { size: 70mm 40mm }`
dan lebar `.label` dalam `src/app/globals.css`.

**Semak sebelum go-live:** cetak satu label dan pastikan baris arahan Bahasa
Melayu tidak terpotong. Baris itu satu-satunya yang mesti difahami pesakit
di rumah.

## Resit (80 mm terma)

Halaman: `/print/resit/<id>`

1. Pasang pencetak resit pada PC kaunter.
2. Saiz media: **80 mm × panjang berterusan** (kadangkala dinamakan "Roll
   80mm" atau "Receipt").
3. Margin **None**, matikan headers and footers.
4. Resit dicetak hitam sahaja — tiada warna atau latar belakang, kerana
   pencetak terma tidak mencetaknya.

## Dokumen A4

Halaman: `/print/mc/<id>`, `/print/rujukan/<id>`, `/print/lab/<id>`

Cetak biasa. Matikan headers and footers supaya kepala surat klinik kekal
kemas.

**Isi profil klinik dahulu** melalui Tetapan → Profil klinik. Nama, alamat
dan nombor pendaftaran Akta 586 yang muncul pada dokumen ini diambil dari
sana. Dokumen yang dicetak dengan butiran contoh tidak sah digunakan.

## Petua kaunter

- Halaman cetak dibuka dalam tab baharu. Tutup selepas mencetak.
- `Ctrl+P` mencetak semula halaman yang sedang dibuka.
- Resit dan label boleh dicetak semula pada bila-bila masa daripada skrin
  bil dan dispensari — tiada apa yang hilang jika kertas tersangkut.
- MC yang dibatalkan masih boleh dicetak, tetapi dicap jelas **DIBATALKAN**.
