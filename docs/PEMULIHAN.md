# Backup dan pemulihan

> **Backup yang tidak pernah diuji bukan backup.**
>
> Rekod perubatan tertakluk kepada Akta 586. Kehilangan data bukan sekadar
> kerugian teknikal — ia masalah undang-undang. Jangan bergantung pada backup
> yang anda belum pernah pulihkan.

## Apa yang di-backup

Perkhidmatan `backup` menjalankan `pg_dump` setiap hari pada jam yang
ditetapkan `BACKUP_HOUR` (lalai 2 pagi), menyulitkan hasilnya dengan
AES-256, dan menulisnya ke direktori `./backup` pada mini PC.

```
backup/klinik-20260905-020000.dump.gpg
```

Dump yang **tidak disulitkan tidak pernah ditulis ke cakera** — `pg_dump`
disalurkan terus ke `gpg`.

## Sebelum apa-apa lagi: simpan kata laluan backup

`BACKUP_PASSPHRASE` dalam `.env` ialah satu-satunya cara membuka backup.

**Simpan salinannya di luar mini PC** — dalam pengurus kata laluan, atau
bertulis dalam peti besi klinik. Jika mini PC terbakar bersama satu-satunya
salinan kata laluan, setiap backup menjadi sampah.

## Latihan pemulihan bulanan

Jalankan sekurang-kurangnya sebulan sekali, dan selepas setiap naik taraf:

```bash
docker compose exec backup ./latihan-pemulihan.sh
```

Skrip ini:

1. Mengambil backup terkini
2. Memulihkannya ke pangkalan data **ujian** yang berasingan
3. Membandingkan kiraan baris setiap jadual dengan pangkalan data langsung
4. Menjatuhkan pangkalan data ujian

**Pangkalan data langsung tidak pernah disentuh.**

### Membaca keputusan

```
Jadual                    Langsung   Backup  Keputusan
------------------------------------------------------
Patient                        30       30  ok
AuditLog                      470      467  hanyut (+3 selepas backup)
NumberSequence                  5        5  ok

latihan: LULUS — setiap jadual dipulihkan dan tiada data hilang.
```

| Keputusan | Maksud |
|---|---|
| `ok` | Kiraan sama |
| `hanyut (+n)` | Baris ditambah selepas backup diambil. Dijangka — backup ialah gambaran pada satu masa. |
| `GAGAL kosong dalam backup` | Jadual ada data langsung tetapi kosong dalam backup. **Jangan bergantung pada backup ini.** |
| `GAGAL backup melebihi langsung` | Pangkalan data langsung kehilangan baris. Siasat kehilangan data. |

`NumberSequence` disemak dengan sengaja: jika ia hilang dalam pemulihan,
nombor invois dan siri MC akan bermula semula dan berlanggar dengan dokumen
yang sudah berada di tangan pesakit dan majikan.

**Rekodkan tarikh setiap latihan.** Latihan yang tidak dijalankan bermakna
anda tidak tahu sama ada anda mempunyai backup.

## Pemulihan sebenar selepas kehilangan data

> Langkah ini **menggantikan** kandungan pangkalan data langsung.

1. **Berhenti menerima pesakit ke dalam sistem.** Guna kertas sementara.
2. Hentikan aplikasi supaya tiada penulisan baharu:
   ```bash
   docker compose stop app
   ```
3. Pilih backup. Yang terkini biasanya betul, tetapi jika kerosakan berlaku
   sebelum backup malam tadi, pilih yang lebih awal:
   ```bash
   ls -lt backup/
   ```
4. Pulihkan:
   ```bash
   docker compose exec backup ./restore.sh /backup/klinik-YYYYMMDD-HHMMSS.dump.gpg
   ```
5. Sahkan sebelum mempercayainya:
   ```bash
   docker compose exec backup ./latihan-pemulihan.sh
   ```
6. Hidupkan semula aplikasi dan semak beberapa rekod pesakit secara manual:
   ```bash
   docker compose start app
   ```
7. **Masukkan semula secara manual apa-apa yang berlaku antara backup dan
   kerosakan.** Inilah sebabnya rekod kertas semasa waktu henti itu penting.

## Salinan luar tapak

Backup pada mini PC sahaja tidak melindungi daripada kebakaran, kecurian
atau kerosakan cakera. Tetapkan `RCLONE_REMOTE` dalam `.env` dan letakkan
konfigurasi rclone dalam `deploy/rclone/`:

```bash
RCLONE_REMOTE="gdrive:klinik-backup"
```

Fail sudah pun disulitkan sebelum meninggalkan mini PC, jadi pembekal storan
awan tidak boleh membacanya.

## Bila backup gagal

Perkhidmatan backup mencatat ke output bekas:

```bash
docker compose logs backup --tail 50
```

Skrip enggan menyimpan hasil di bawah 1 KB dan **memadamnya**. Fail kecil
yang ditinggalkan pada cakera kelihatan seperti backup sah kepada sesiapa
yang memulihkan "yang terkini" — jadi ia dibuang, bukan sekadar dilaporkan.
