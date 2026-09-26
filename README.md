# PDFEasy — pdf.payedlegacy.my

Alat PDF 100% **client-side** (fail tidak pernah dimuat naik ke pelayan):

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
