# PDFEasy — pdf.payedlegacy.my

## Ruang Iklan (Google AdSense) — AKTIF
- **ID penerbit**: `ca-pub-9978987699948390` (sudah diisi dalam `index.html` → `ADSENSE_CLIENT`).
- **Kod AMP Auto Ads** dipasang mengikut arahan pemilik: skrip `amp-auto-ads` di `<head>` + `<amp-auto-ads type="adsense" data-ad-client="ca-pub-...">` betul-betul selepas `<body>`.
- **Skrip AdSense penerbit** (`adsbygoogle.js?client=ca-pub-9978987699948390`) turut dipasang untuk **Auto Ads** pada halaman HTML biasa.
- **3 kotak iklan tetap** (halaman utama, dalam alat, bawah halaman) sedia ada tetapi **tersembunyi** selagi `ADSENSE_SLOTS` kosong — jadi tiada ruang kosong/iklan mengganggu. Isi slot ID dari AdSense (Ads > By ad unit > Display) untuk mengaktifkan kedudukan tetap:
  ```js
  const ADSENSE_SLOTS = { home: '1234567890', workspace: '1234567891', footer: '1234567892' };
  ```
- `ads.txt` sudah disediakan untuk ID penerbit ini.
- Pengguna boleh tutup iklan tetap (butang ✕) — pilihan diingati dalam peranti (`localStorage.pdfeasy_ad_dismiss`).

> Nota teknikal: `amp-auto-ads` hanya dihidupkan oleh runtime AMP. Laman ini HTML biasa, jadi iklan sebenar datang dari skrip Auto Ads AdSense di atas; kod AMP disimpan seperti diminta dan tidak mengganggu paparan.

## Alat PDF 100% client-side (fail tidak dimuat naik ke pelayan):

1. **Palang ID / IC** — letak palang merah + teks tujuan pada salinan MyKad, IC, lesen, pasport (cth `FOR CUCKOO ONLY`), boleh berulang penuh halaman.
2. **Isi Borang & Tanda Tangan** — tambah teks (seret), tandatangan lukis atau muat naik imej tandatangan.
3. **Mampatkan PDF** — kecilkan saiz untuk muat naik ke portal (pilih kualiti & resolusi).

Menyokong **PDF, gambar (JPG/PNG/WEBP)** dan **Word (.DOCX — teks sahaja)**.

## Struktur fail
| Fail | Fungsi |
| --- | --- |
| `index.html` | markup + meta SEO + PWA link |
| `app.js` | semua logik (muat naik, pratonton, watermark, eksport) |
| `styles.css` | reka bentuk responsif |
| `manifest.json`, `sw.js`, `icons/` | PWA (boleh dipasang di telefon + kerja offline) |
| `robots.txt`, `sitemap.xml` | SEO |

## Cara eksport berfungsi
- **Simpan PDF** → guna `pdf-lib`: salinan PDF asal **kekal semua halaman** dan teks asal masih boleh dipilih; watermark/tandatangan/teks dilukis sebagai objek PDF sebenar (bukan imej).
- **Simpan versi mampat** → halaman dipaparkan sebagai imej JPEG pada kualiti & resolusi yang dipilih (teks tidak lagi boleh dipilih).
- Kedua-duanya berlaku dalam pelayar; tiada rangkaian diperlukan selepas perpustakaan CDN dimuatkan.

## Ujian pantas (manual)
1. Pilih gambar IC → tekan preset `FOR CUCKOO ONLY` → **Simpan PDF** → buka PDF: palang merah mesti ada pada fail yang dimuat turun.
2. Pilih PDF 2 halaman → **Simpan PDF** → PDF output mesti kekal **2 halaman**.
3. Tekan **Ambil Gambar (Kamera)** pada telefon → gambar terus masuk sebagai dokumen.

## Nota penyelenggaraan
- Pustaka luar: `tailwindcss`, `pdf.js 2.16.105`, `pdf-lib 1.17.1`, `mammoth 1.6.0` (dimuat secara malas untuk .DOCX).
- Service worker (`sw.js`) guna **network-first** untuk fail sendiri, jadi perubahan akan terus terpakai selepas deploy; naikkan `VERSION` bila mengubah senarai cache.
- Elemen ujian: `window.__pdfeasy` (state, buildSafePdf, buildCompressedPdf) — berguna untuk ujian automasi.
