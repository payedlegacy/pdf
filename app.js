/* =====================================================================
   PDFEasy — pdf.payedlegacy.my  (v3)
   100% client-side PDF utility: palang/watermark ID, isi borang,
   tandatangan, mampatkan PDF, cetak & kongsi. Tiada fail ke pelayan.

   v3 (26-09-2026):
   - Drag handle (⠿) untuk anotasi → taip tanpa gangguan, seret sengaja
   - Palang/watermark boleh ditarik ke mana-mana (state.wmPos)
   - Anotasi BERASINGAN setiap halaman (state.annosByPage)
   - Butang Kongsi Dokumen (Web Share API + fallback WhatsApp/Telegram)
   - Butang Kongsi Web App
   ===================================================================== */
'use strict';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const MAX_BYTES_DESKTOP = 60 * 1024 * 1024;
const MAX_BYTES_MOBILE = 25 * 1024 * 1024;
const PROMO_TEXT = 'Jom guna PDFEasy untuk palang IC dan isi borang dengan selamat secara percuma di pelayar! https://pdf.payedlegacy.my';
const APP_URL = 'https://pdf.payedlegacy.my';

const state = {
  kind: null,          // 'pdf' | 'image' | 'docx'
  file: null,
  pdfBytes: null,      // ArrayBuffer asal (untuk eksport vektor)
  pdfDoc: null,        // pdf.js document (pratonton)
  imgEl: null,
  imgIsPng: false,
  imgW: 0, imgH: 0,
  page: 1,
  pages: 1,
  tab: 'protect',
  zoom: 1,
  fit: true,
  shownScale: 1,
  annos: [],           // anotasi halaman SEMASA (DOM)
  annosByPage: {},     // { [page]: [ {type,...ratio} ] }
  wmPos: { rx: 0.5, ry: 0.5 },
  docxText: null
};

const $ = (id) => document.getElementById(id);

/* ----------------------------- i18n ----------------------------- */
const I18N = {
  bm: {
    brandTag: '100% DALAM PELAYAR — FAIL TIDAK DIMUAT NAIK',
    install: 'Pasang App',
    heroTitle: 'Palang ID/IC, Isi Borang & Mampatkan PDF',
    heroSub: 'Letak palang keselamatan + teks (cth “FOR CUCKOO ONLY”) pada salinan MyKad, lesen atau pasport sebelum dihantar kepada sesiapa. Semua diproses dalam pelayar — fail anda tidak ke mana-mana.',
    chipPrivate: 'Tanpa muat naik ke pelayan',
    chipMobile: 'Mesra telefon',
    chipFree: 'Percuma',
    tabProtect: 'Palang ID / IC',
    tabProtectSub: 'Palang + teks tujuan',
    tabFill: 'Isi Borang & Tanda Tangan',
    tabFillSub: 'Taip & tandatangan',
    tabCompress: 'Mampatkan PDF',
    tabCompressSub: 'Kecilkan saiz fail',
    dropMain: 'Pilih fail atau seret ke sini',
    dropSub: 'Menyokong PDF, gambar (JPG/PNG/WEBP) & Word (.DOCX) — sehingga 60 MB',
    useCamera: 'Ambil Gambar (Kamera)',
    loadSample: 'Cuba Contoh IC',
    privacyNote: '🔒 Fail diproses 100% dalam telefon/komputer anda. Tiada muat naik, tiada simpanan pelayan.',
    clearFile: '🗑️ Buang fail',
    wmText: 'Teks palang',
    wmSize: 'Saiz',
    wmAngle: 'Sudut',
    wmOpacity: 'Ketebalan warna',
    wmTile: 'Palang berulang (penuh halaman)',
    applyAllPages: 'Guna pada semua halaman',
    wmReset: 'Tengah semula palang',
    wmDragHint: 'Tarik palang pada dokumen untuk pindah kedudukan.',
    addText: 'Tambah Teks',
    drawSig: 'Tandatangan',
    uploadSig: 'Muat naik tandatangan',
    font: 'Fon',
    textSize: 'Saiz teks',
    textColor: 'Warna',
    dragHint: 'Tarik ikon ⠿ untuk pindah. Setiap halaman ada anotasi sendiri.',
    quality: 'Tahap mampatan',
    resolution: 'Resolusi',
    compressHint: 'Mampatan menukar setiap halaman kepada imej. Gunakan “Simpan PDF” jika anda mahu teks PDF kekal boleh dipilih.',
    fitWidth: 'Muat skrin',
    pageHint: 'Halaman',
    savePdf: 'Muat Turun PDF',
    saveCompressed: 'Simpan versi mampat',
    print: 'Cetak',
    shareDoc: 'Kongsi Dokumen',
    shareApp: 'Kongsi Web App',
    telegram: 'Telegram',
    howTitle: 'Cara guna (contoh: hantar IC kepada Cuckoo)',
    how1: 'Pilih gambar IC (atau ambil gambar dengan kamera) / fail PDF.',
    how2: 'Tekan preset “FOR CUCKOO ONLY” atau taip tujuan anda sendiri.',
    how3: 'Tekan “Muat Turun PDF” atau “Kongsi Dokumen” — fail berpalang sedia dihantar.',
    how4: 'Setiap halaman boleh ada tandatangan/teks sendiri; hantar fail berpalang itu sahaja.',
    footerNote: 'Semua pemprosesan berlaku dalam pelayar anda. Tiada fail dihantar ke pelayan.',
    sigTitle: 'Tandatangan',
    sigHint: 'Lukis dengan jari atau tetikus.',
    clearPad: 'Padam',
    applySig: 'Guna Tandatangan',
    previewTitle: 'Pratonton hasil',
    handleTitle: 'Tarik sini',
    // mesej
    errType: 'Jenis fail ini tidak disokong. Sila guna PDF atau gambar (JPG/PNG/WEBP).',
    errHeic: 'Foto HEIC (format iPhone) tidak boleh dibaca oleh pelayar. Sila ambil gambar semula (kamera dalam app ini) atau tukar ke JPG.',
    errSize: 'Fail terlalu besar ({size}). Had: {limit}. Sila kecilkan fail dahulu.',
    errPdf: 'Gagal membaca fail PDF: {msg}',
    errPassword: 'PDF ini ada kata laluan. Sila buka kunci dahulu sebelum dimuat naik.',
    errEmpty: 'Fail tidak dapat dibaca (kosong atau rosak).',
    errDocx: 'Fail .DOCX tidak dapat dibaca. Sila “Save As PDF” dari Word dahulu.',
    busyOpen: 'Membuka fail…',
    busyExport: 'Menyediakan PDF…',
    busyCompress: 'Memampatkan…',
    busyShare: 'Menyediakan fail untuk dikongsi…',
    okLoad: 'Siap! Palang sedia — tekan “Muat Turun PDF”.',
    okSave: 'PDF dimuat turun ({size}).',
    okCompress: 'Selesai: {from} → {to}.',
    okShare: 'Fail dihantar ke menu kongsi.',
    shareFallback: 'Fail dimuat turun. WhatsApp dibuka untuk hantar fail itu.',
    shareCancelled: 'Perkongsian dibatalkan.',
    docxWarn: 'Fail Word dikesan: teks sahaja disokong. Periksa susun atur sebelum hantar.',
    zoomFit: 'Muat skrin',
    pagesOf: 'Halaman'
  },
  en: {
    brandTag: '100% IN-BROWSER — FILES NEVER UPLOADED',
    install: 'Install App',
    heroTitle: 'Watermark ID/IC, Fill Forms & Compress PDF',
    heroSub: 'Add a security cross-line + purpose text (e.g. “FOR CUCKOO ONLY”) to copies of your MyKad, licence or passport before handing them to anyone. Everything runs in your browser — your files go nowhere.',
    chipPrivate: 'No server upload',
    chipMobile: 'Mobile friendly',
    chipFree: 'Free',
    tabProtect: 'Watermark ID / IC',
    tabProtectSub: 'Cross-line + purpose',
    tabFill: 'Fill Forms & Sign',
    tabFillSub: 'Type & sign',
    tabCompress: 'Compress PDF',
    tabCompressSub: 'Shrink file size',
    dropMain: 'Choose a file or drop it here',
    dropSub: 'Supports PDF, images (JPG/PNG/WEBP) & Word (.DOCX) — up to 60 MB',
    useCamera: 'Take Photo (Camera)',
    loadSample: 'Try a Sample IC',
    privacyNote: '🔒 Files are processed 100% on your device. No uploads, no server storage.',
    clearFile: '🗑️ Remove file',
    wmText: 'Cross-line text',
    wmSize: 'Size',
    wmAngle: 'Angle',
    wmOpacity: 'Opacity',
    wmTile: 'Repeat across page',
    applyAllPages: 'Apply to all pages',
    wmReset: 'Recentre watermark',
    wmDragHint: 'Drag the watermark on the document to move it.',
    addText: 'Add Text',
    drawSig: 'Draw Signature',
    uploadSig: 'Upload signature',
    font: 'Font',
    textSize: 'Text size',
    textColor: 'Colour',
    dragHint: 'Drag the ⠿ handle to move. Each page keeps its own annotations.',
    quality: 'Compression level',
    resolution: 'Resolution',
    compressHint: 'Compression rasterises each page. Use “Download PDF” if you need the PDF text to stay selectable.',
    fitWidth: 'Fit width',
    pageHint: 'Page',
    savePdf: 'Download PDF',
    saveCompressed: 'Save compressed copy',
    print: 'Print',
    shareDoc: 'Share Document',
    shareApp: 'Share Web App',
    telegram: 'Telegram',
    howTitle: 'How to use (example: sending IC to Cuckoo)',
    how1: 'Choose your IC photo (or shoot it with the camera) / a PDF file.',
    how2: 'Tap the “FOR CUCKOO ONLY” preset or type your own purpose.',
    how3: 'Tap “Download PDF” or “Share Document” — the watermarked file is ready to send.',
    how4: 'Each page can hold its own text/signature; send only the watermarked file.',
    footerNote: 'All processing happens in your browser. No file is sent to a server.',
    sigTitle: 'Signature',
    sigHint: 'Draw with your finger or mouse.',
    clearPad: 'Clear',
    applySig: 'Apply Signature',
    previewTitle: 'Result preview',
    handleTitle: 'Drag here',
    errType: 'This file type is not supported. Use PDF or an image (JPG/PNG/WEBP).',
    errHeic: 'HEIC photos (iPhone format) cannot be decoded by the browser. Retake using the camera button or convert to JPG.',
    errSize: 'File is too large ({size}). Limit: {limit}. Please shrink it first.',
    errPdf: 'Could not read the PDF: {msg}',
    errPassword: 'This PDF is password protected. Please unlock it first.',
    errEmpty: 'The file could not be read (empty or corrupted).',
    errDocx: 'Could not read the .DOCX file. Please “Save As PDF” from Word first.',
    busyOpen: 'Opening file…',
    busyExport: 'Building PDF…',
    busyCompress: 'Compressing…',
    busyShare: 'Preparing file to share…',
    okLoad: 'Done! Watermark ready — tap “Download PDF”.',
    okSave: 'PDF downloaded ({size}).',
    okCompress: 'Done: {from} → {to}.',
    okShare: 'File sent to the share sheet.',
    shareFallback: 'File downloaded. WhatsApp opened to send it.',
    shareCancelled: 'Sharing cancelled.',
    docxWarn: 'Word file detected: text-only support. Check the layout before sending.',
    zoomFit: 'Fit width',
    pagesOf: 'Page'
  },
  zh: {
    brandTag: '100% 浏览器内处理 — 文件不上传',
    install: '安装应用',
    heroTitle: '身份证水印、填表与压缩 PDF',
    heroSub: '在把身份证、驾照或护照副本交给他人之前，加上安全水印与用途文字（例如 “FOR CUCKOO ONLY”）。全部在浏览器内完成，文件不会上传。',
    chipPrivate: '不上传到服务器',
    chipMobile: '手机友好',
    chipFree: '免费',
    tabProtect: '身份证水印',
    tabProtectSub: '水印 + 用途文字',
    tabFill: '填表与签名',
    tabFillSub: '输入与签名',
    tabCompress: '压缩 PDF',
    tabCompressSub: '减小文件体积',
    dropMain: '选择文件或拖到此处',
    dropSub: '支持 PDF、图片（JPG/PNG/WEBP）与 Word（.DOCX）— 最大 60 MB',
    useCamera: '拍照（相机）',
    loadSample: '试用示例身份证',
    privacyNote: '🔒 全部在本机浏览器处理，不上传、不存储。',
    clearFile: '🗑️ 移除文件',
    wmText: '水印文字',
    wmSize: '大小',
    wmAngle: '角度',
    wmOpacity: '不透明度',
    wmTile: '整页重复',
    applyAllPages: '应用到所有页面',
    wmReset: '水印回到中心',
    wmDragHint: '在文档上拖动水印来移动位置。',
    addText: '添加文字',
    drawSig: '手写签名',
    uploadSig: '上传签名图片',
    font: '字体',
    textSize: '文字大小',
    textColor: '颜色',
    dragHint: '拖动 ⠿ 手柄来移动。每一页都有自己的标注。',
    quality: '压缩强度',
    resolution: '分辨率',
    compressHint: '压缩会把每页转为图片。若需要保留可选文字，请使用“下载 PDF”。',
    fitWidth: '适应宽度',
    pageHint: '页',
    savePdf: '下载 PDF',
    saveCompressed: '保存压缩版',
    print: '打印',
    shareDoc: '分享文档',
    shareApp: '分享应用',
    telegram: '电报',
    howTitle: '使用方法（示例：把 IC 交给 Cuckoo）',
    how1: '选择 IC 照片（或使用相机拍摄）/ PDF 文件。',
    how2: '点击 “FOR CUCKOO ONLY” 预设，或输入自己的用途。',
    how3: '点击“下载 PDF”或“分享文档”，带水印的文件即可发送。',
    how4: '每一页可有自己的文字/签名；只发送带水印的文件。',
    footerNote: '所有处理都在浏览器中完成，文件不会发送到服务器。',
    sigTitle: '签名',
    sigHint: '用手指或鼠标书写。',
    clearPad: '清除',
    applySig: '使用签名',
    previewTitle: '结果预览',
    handleTitle: '拖这里',
    errType: '不支持该文件类型，请使用 PDF 或图片（JPG/PNG/WEBP）。',
    errHeic: '浏览器无法读取 HEIC（iPhone 格式）照片。请用相机按钮重拍或转换为 JPG。',
    errSize: '文件太大（{size}）。上限：{limit}。请先压缩。',
    errPdf: '无法读取 PDF：{msg}',
    errPassword: '该 PDF 有密码，请先解锁。',
    errEmpty: '无法读取文件（空或损坏）。',
    errDocx: '无法读取 .DOCX。请先在 Word 中“另存为 PDF”。',
    busyOpen: '正在打开文件…',
    busyExport: '正在生成 PDF…',
    busyCompress: '正在压缩…',
    busyShare: '正在准备分享…',
    okLoad: '完成！水印已就绪，点击“下载 PDF”。',
    okSave: 'PDF 已下载（{size}）。',
    okCompress: '完成：{from} → {to}。',
    okShare: '文件已发送到分享菜单。',
    shareFallback: '文件已下载，并打开 WhatsApp 发送。',
    shareCancelled: '已取消分享。',
    docxWarn: '检测到 Word 文件：仅支持文字。发送前请检查排版。',
    zoomFit: '适应宽度',
    pagesOf: '页'
  }
};

let LANG = localStorage.getItem('pdfeasy_lang') || 'bm';
const t = (k, vars) => {
  let s = (I18N[LANG] && I18N[LANG][k]) || I18N.bm[k] || k;
  if (vars) Object.keys(vars).forEach((v) => { s = s.replace('{' + v + '}', vars[v]); });
  return s;
};

function applyLang() {
  document.documentElement.lang = LANG === 'bm' ? 'ms' : LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.getAttribute('data-i18n');
    if (I18N[LANG] && I18N[LANG][k]) el.textContent = I18N[LANG][k];
  });
  const sel = $('lang-select');
  if (sel) sel.value = LANG;
  const hint = document.querySelector('.js-wm-hint');
  if (hint) hint.textContent = t('wmDragHint');
}

/* --------------------------- helpers --------------------------- */
let toastTimer = null;
function toast(msg, type) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4200);
}
function busy(on, text) {
  $('busy-text').textContent = text || '';
  $('busy').classList.toggle('hidden', !on);
}
function fmt(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}
function slug(s) {
  return (s || 'dokumen').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}
// StandardFonts (WinAnsi) tidak menyokong CJK/emoji → bersihkan + beri amaran
function sanitize(str) {
  let changed = false;
  const out = String(str).replace(/[^\u0000-\u00FF\u2018\u2019\u201C\u201D\u2013\u2014]/g, () => { changed = true; return '?'; });
  return { text: out, changed };
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Saiz palang berkesan: hadkan supaya teks sentiasa muat dalam lebar halaman
function effectiveWmSize(userSize, text, pageWidth) {
  const len = Math.max(6, String(text || '').length);
  return Math.max(6, Math.min(userSize, (pageWidth / len) * 2.05));
}
function isMobile() { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); }
function extOf(name) {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

/* --------------------------- file intake --------------------------- */
async function handleFile(file) {
  if (!file) return;
  const ext = extOf(file.name);
  const type = file.type || '';
  const limit = isMobile() ? MAX_BYTES_MOBILE : MAX_BYTES_DESKTOP;
  const label = isMobile() ? '25 MB' : '60 MB';

  if (file.size === 0) { toast(t('errEmpty'), 'err'); return; }
  if (file.size > limit) { toast(t('errSize', { size: fmt(file.size), limit: label }), 'err'); return; }

  const isPdf = type === 'application/pdf' || ext === 'pdf';
  const isImg = type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext);
  const isDocx = type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx';

  if (!isPdf && !isImg && !isDocx) { toast(t('errType'), 'err'); return; }
  if (['heic', 'heif'].includes(ext) || /heic|heif/.test(type)) { toast(t('errHeic'), 'err'); return; }

  busy(true, t('busyOpen'));
  try {
    resetDoc(false);
    state.file = file;
    $('file-name').textContent = file.name;
    $('file-meta').textContent = fmt(file.size) + ' • ' + (type || ext || '?');

    if (isPdf) {
      const buf = await file.arrayBuffer();
      state.pdfBytes = buf.slice(0);
      state.kind = 'pdf';
      state.pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      state.pages = state.pdfDoc.numPages;
      state.page = 1;
    } else if (isImg) {
      state.kind = 'image';
      state.imgIsPng = /png/.test(type) || ext === 'png';
      const url = URL.createObjectURL(file);
      state.imgEl = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error('imej tidak dapat dibaca'));
        im.src = url;
      });
      state.imgW = state.imgEl.naturalWidth;
      state.imgH = state.imgEl.naturalHeight;
      state.pages = 1;
      state.page = 1;
    } else {
      const mam = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mammoth');
      const out = await mam.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      state.kind = 'docx';
      state.docxText = (out.value || '').trim();
      if (!state.docxText) throw new Error('tiada teks');
      state.pdfBytes = await buildTextPdfBytes(state.docxText);
      state.pdfDoc = await pdfjsLib.getDocument({ data: state.pdfBytes.slice(0) }).promise;
      state.pages = state.pdfDoc.numPages;
      state.page = 1;
      toast(t('docxWarn'), 'ok');
    }

    $('upload-card').classList.add('hidden');
    $('workspace').classList.remove('hidden');
    $('tot-page').textContent = state.pages;
    $('page-nav').classList.toggle('hidden', state.pages < 2);
    await fitToWidth();
    refreshLayer();
    toast(t('okLoad'), 'ok');
  } catch (e) {
    console.error(e);
    if (e && (e.name === 'PasswordException' || /password/i.test(e.message || ''))) toast(t('errPassword'), 'err');
    else if (state.kind === 'pdf') toast(t('errPdf', { msg: (e.message || e).toString().slice(0, 90) }), 'err');
    else if (isDocx) toast(t('errDocx'), 'err');
    else toast(t('errEmpty'), 'err');
    resetDoc(true);
  } finally {
    busy(false);
  }
}

function loadScript(src, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res(window[globalName]);
    s.onerror = () => rej(new Error('gagal memuat ' + src));
    document.head.appendChild(s);
  });
}

/* --------------------------- render --------------------------- */
async function fitToWidth() {
  state.fit = true;
  state.zoom = 1;
  await render();
}

async function render() {
  const canvas = $('doc-canvas');
  const ctx = canvas.getContext('2d');
  const scroll = $('canvas-scroll');
  const wrap = $('canvas-wrap');

  if ((state.kind === 'pdf' || state.kind === 'docx') && state.pdfDoc) {
    const page = await state.pdfDoc.getPage(state.page);
    const base = page.getViewport({ scale: 1 });
    let scale;
    if (state.fit) {
      const avail = Math.max(240, scroll.clientWidth - 24);
      scale = Math.min(3, Math.max(0.4, avail / base.width));
    } else {
      scale = state.zoom;
    }
    state.shownScale = scale;
    const vp = page.getViewport({ scale });
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    wrap.style.width = canvas.width + 'px';
    wrap.style.height = canvas.height + 'px';
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
  } else if (state.kind === 'image' && state.imgEl) {
    const avail = Math.max(240, scroll.clientWidth - 24);
    const maxW = state.fit ? avail : Math.min(state.imgW, state.imgW * state.zoom);
    const ratio = Math.min(1, maxW / state.imgW);
    state.shownScale = ratio;
    canvas.width = Math.floor(state.imgW * ratio);
    canvas.height = Math.floor(state.imgH * ratio);
    wrap.style.width = canvas.width + 'px';
    wrap.style.height = canvas.height + 'px';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.imgEl, 0, 0, canvas.width, canvas.height);
  }

  $('page-nav').classList.toggle('hidden', state.pages < 2);
  $('zoom-label').textContent = Math.round((state.shownScale || 1) * 100) + '%';
}

// lukis semula lapisan: pratonton palang + anotasi halaman semasa
// keepStore=true → jangan simpan semula (dipanggil selepas tukar halaman)
function refreshLayer(opts) {
  const layer = $('annotation-layer');
  if (!opts || !opts.keepStore) {
    if (state.kind) savePageAnnos(state.page);   // jangan hilang suntingan semasa
  }
  layer.innerHTML = '';
  state.annos = [];
  renderWatermarkPreview();
  loadPageAnnos(state.page);
}

/* --------------------------- watermark (boleh ditarik) --------------------------- */
function wmStyles() {
  return {
    text: $('wm-text').value || '',
    size: +$('wm-size').value,
    angle: +$('wm-angle').value,
    opacity: +$('wm-opacity').value / 100,
    tile: $('wm-tile').checked,
    rx: state.wmPos.rx,
    ry: state.wmPos.ry
  };
}

function renderWatermarkPreview() {
  const layer = $('annotation-layer');
  const old = layer.querySelector('.wm-preview');
  if (old) old.remove();
  if (state.tab !== 'protect') return;
  const w = wmStyles();
  if (!w.text) return;

  const cvW = $('doc-canvas').width || 600;
  const size = effectiveWmSize(w.size * (cvW / 600), w.text, cvW);

  const box = document.createElement('div');
  box.className = 'wm-preview';
  box.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  const rows = w.tile ? 4 : 1;
  for (let i = 0; i < rows; i++) {
    const row = document.createElement('div');
    if (w.tile) {
      row.style.cssText = 'position:absolute;left:0;right:0;display:flex;justify-content:center;top:' + (12 + i * 24) + '%;';
    } else {
      row.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
    }
    row.innerHTML = '<div class="wm-band" style="transform:rotate(' + w.angle + 'deg);opacity:' + w.opacity + ';' +
      'border-top:3px solid #dc2626;border-bottom:3px solid #dc2626;padding:4px 14px;">' +
      '<span style="font-size:' + size + 'px;font-weight:900;color:#dc2626;letter-spacing:1.5px;' +
      'text-transform:uppercase;white-space:nowrap;">' + escapeHtml(w.text) + '</span></div>';
    const band = row.querySelector('.wm-band');
    if (!w.tile) {
      // kedudukan dari state.wmPos (boleh ditarik)
      band.style.position = 'absolute';
      band.style.left = (state.wmPos.rx * 100) + '%';
      band.style.top = (state.wmPos.ry * 100) + '%';
      band.style.transform += ' translate(-50%,-50%)';
      band.style.pointerEvents = 'auto';
      band.style.cursor = 'move';
      band.style.touchAction = 'none';
      makeWatermarkDraggable(band);
    }
    box.appendChild(row);
  }
  layer.appendChild(box);
}

function makeWatermarkDraggable(band) {
  const layer = $('annotation-layer');
  let dragging = false;
  const setFrom = (x, y) => {
    const r = layer.getBoundingClientRect();
    state.wmPos.rx = Math.min(0.95, Math.max(0.05, (x - r.left) / r.width));
    state.wmPos.ry = Math.min(0.95, Math.max(0.05, (y - r.top) / r.height));
    band.style.left = (state.wmPos.rx * 100) + '%';
    band.style.top = (state.wmPos.ry * 100) + '%';
  };
  const down = (e) => {
    dragging = true;
    const p = e.touches ? e.touches[0] : e;
    setFrom(p.clientX, p.clientY);
    if (!e.touches) e.preventDefault();
  };
  const move = (e) => {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    setFrom(p.clientX, p.clientY);
    if (e.cancelable) e.preventDefault();
  };
  const up = () => { dragging = false; };
  band.addEventListener('mousedown', down);
  band.addEventListener('touchstart', down, { passive: true });
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  band.addEventListener('touchmove', move, { passive: false });
  band.addEventListener('touchend', up);
}

/* --------------------------- anotasi (handle drag + per halaman) --------------------------- */
function makeDraggable(el, handle) {
  const grip = handle || el;
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;

  const down = (e) => {
    if (e.target.closest('input,button,select,img')) return;
    dragging = true;
    const p = e.touches ? e.touches[0] : e;
    sx = p.clientX; sy = p.clientY;
    ox = el.offsetLeft; oy = el.offsetTop;
    if (!e.touches) e.preventDefault();
  };
  const move = (e) => {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const layer = $('annotation-layer');
    let nx = ox + (p.clientX - sx);
    let ny = oy + (p.clientY - sy);
    nx = Math.max(-20, Math.min(layer.clientWidth - 30, nx));
    ny = Math.max(-20, Math.min(layer.clientHeight - 20, ny));
    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
    if (e.cancelable) e.preventDefault();
  };
  const up = () => { dragging = false; };

  grip.addEventListener('mousedown', down);
  grip.addEventListener('touchstart', down, { passive: true });
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  grip.addEventListener('touchmove', move, { passive: false });
  grip.addEventListener('touchend', up);
}

function handleSpan() {
  return '<span class="drag-handle" title="' + t('handleTitle') + '">⠿</span>';
}

function createTextEl(data) {
  const el = document.createElement('div');
  el.className = 'anno-item text';
  el.style.left = ((data.rx != null ? data.rx : 0.06) * 100) + '%';
  el.style.top = ((data.ry != null ? data.ry : 0.06) * 100) + '%';
  el.innerHTML = handleSpan() +
    '<input type="text" value="' + escapeHtml(data.val || (LANG === 'bm' ? 'Taip di sini…' : 'Type here…')) + '">' +
    '<button class="anno-del" type="button">✕</button>';
  const input = el.querySelector('input');
  input.style.fontFamily = data.font || 'Helvetica, Arial, sans-serif';
  input.style.fontSize = (data.size || 14) + 'px';
  input.style.color = data.color || '#0f172a';
  el.querySelector('.anno-del').addEventListener('click', () => {
    el.remove();
    state.annos = state.annos.filter((a) => a.el !== el);
  });
  makeDraggable(el, el.querySelector('.drag-handle'));
  return el;
}

function createSigEl(data) {
  const el = document.createElement('div');
  el.className = 'anno-item sig';
  el.style.left = ((data.rx != null ? data.rx : 0.1) * 100) + '%';
  el.style.top = ((data.ry != null ? data.ry : 0.1) * 100) + '%';
  const img = document.createElement('img');
  img.src = data.src;
  img.style.width = ((data.rw != null ? data.rw : 0.22) * 100) + '%';
  img.style.maxWidth = 'none';
  img.style.pointerEvents = 'none';
  const mk = (txt, title, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'anno-del small';
    b.textContent = txt;
    b.title = title;
    b.addEventListener('click', fn);
    return b;
  };
  const minus = mk('－', 'kecil', () => { img.style.width = Math.max(30, img.clientWidth - 20) + 'px'; });
  const plus = mk('＋', 'besar', () => { img.style.width = (img.clientWidth + 20) + 'px'; });
  const del = mk('✕', 'buang', () => { el.remove(); state.annos = state.annos.filter((a) => a.el !== el); });
  el.append(Object.assign(document.createElement('span'), { className: 'drag-handle', textContent: '⠿', title: t('handleTitle') }), img, minus, plus, del);
  makeDraggable(el, el.querySelector('.drag-handle'));
  return el;
}

function addTextAnno(data) {
  const el = createTextEl(data || {});
  $('annotation-layer').appendChild(el);
  state.annos.push({ el: el, type: 'text' });
  const input = el.querySelector('input');
  input.focus();
  input.select();
}

function addSignatureAnno(dataUrl) {
  const el = createSigEl({ src: dataUrl });
  $('annotation-layer').appendChild(el);
  state.annos.push({ el: el, type: 'sig' });
}

// ---- simpan / pulih anotasi mengikut halaman (ISOLASI MUKA SURAT) ----
function annosFromDom() {
  const layer = $('annotation-layer');
  const lw = layer.clientWidth || 1;
  const lh = layer.clientHeight || 1;
  const out = [];
  layer.querySelectorAll('.anno-item').forEach((el) => {
    const rx = el.offsetLeft / lw;
    const ry = el.offsetTop / lh;
    const input = el.querySelector('input');
    const img = el.querySelector('img');
    if (input) {
      out.push({
        type: 'text', rx: rx, ry: ry, val: input.value,
        font: input.style.fontFamily, size: parseFloat(input.style.fontSize) || 14,
        color: rgbToHex(input.style.color)
      });
    } else if (img) {
      out.push({ type: 'sig', rx: rx, ry: ry, rw: img.clientWidth / lw, src: img.src });
    }
  });
  return out;
}

function savePageAnnos(page) {
  state.annosByPage[page] = annosFromDom();
}

function loadPageAnnos(page) {
  const layer = $('annotation-layer');
  layer.querySelectorAll('.anno-item').forEach((e) => e.remove());
  state.annos = [];
  (state.annosByPage[page] || []).forEach((d) => {
    const el = d.type === 'text' ? createTextEl(d) : createSigEl(d);
    layer.appendChild(el);
    state.annos.push({ el: el, type: d.type });
  });
}

function rgbToHex(c) {
  if (!c) return '#0f172a';
  if (c.startsWith('#')) return c;
  const m = c.match(/\d+/g);
  if (!m || m.length < 3) return '#0f172a';
  return '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('');
}

async function goPage(target) {
  if (target < 1 || target > state.pages) return;
  savePageAnnos(state.page);            // simpan anotasi halaman semasa
  state.page = target;
  $('cur-page').textContent = state.page;
  // kosongkan SEGERA supaya anotasi halaman lama tak terlekat/tersimpan salah
  $('annotation-layer').innerHTML = '';
  state.annos = [];
  await render();
  refreshLayer({ keepStore: true });    // pulih anotasi halaman baharu sahaja
}

/* --------------------------- signature pad --------------------------- */
let sigCtx = null, sigDrawing = false;
function openSig() {
  $('sig-modal').classList.remove('hidden');
  const cv = $('sig-canvas');
  const rect = cv.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(rect.width * dpr);
  cv.height = Math.round(rect.height * dpr);
  sigCtx = cv.getContext('2d');
  sigCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sigCtx.fillStyle = '#fff';
  sigCtx.fillRect(0, 0, rect.width, rect.height);
  sigCtx.strokeStyle = '#0f172a';
  sigCtx.lineWidth = 2.4;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';

  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  cv.onmousedown = (e) => { e.preventDefault(); sigDrawing = true; const p = pos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); };
  cv.onmousemove = (e) => { if (!sigDrawing) return; const p = pos(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); };
  cv.onmouseup = cv.onmouseleave = () => { sigDrawing = false; };
  cv.ontouchstart = (e) => { e.preventDefault(); sigDrawing = true; const p = pos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); };
  cv.ontouchmove = (e) => { if (!sigDrawing) return; e.preventDefault(); const p = pos(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); };
  cv.ontouchend = () => { sigDrawing = false; };
}
function closeSig() { $('sig-modal').classList.add('hidden'); }
function clearSig() {
  const cv = $('sig-canvas');
  const r = cv.getBoundingClientRect();
  sigCtx.save();
  sigCtx.setTransform(1, 0, 0, 1, 0, 0);
  sigCtx.fillStyle = '#fff';
  sigCtx.fillRect(0, 0, cv.width, cv.height);
  sigCtx.restore();
  sigCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
}

/* --------------------------- EKSPORT: PDF vektor --------------------------- */
async function buildSafePdf() {
  const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
  const out = await PDFDocument.create();
  const w = wmStyles();
  const clean = sanitize(w.text);
  const allPages = $('wm-all-pages').checked;
  savePageAnnos(state.page);              // pastikan suntingan semasa disimpan

  const font = await out.embedFont(StandardFonts.HelveticaBold);

  let src = null, created = [], pagesToUse = [];
  if (state.kind !== 'image') {
    src = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true });
    const pageCount = src.getPageCount();
    pagesToUse = allPages ? Array.from({ length: pageCount }, (_, i) => i) : [state.page - 1];
    for (let i = 0; i < pageCount; i++) {
      const [copied] = await out.copyPages(src, [i]);
      out.addPage(copied);
      created.push(copied);
    }
  }

  const rot = (dx, dy, th) => ({ x: dx * Math.cos(th) - dy * Math.sin(th), y: dx * Math.sin(th) + dy * Math.cos(th) });

  const drawBars = (page, size, text, opacity, angle, cx, cy, fontObj, color) => {
    const th = (angle * Math.PI) / 180;
    const tw = fontObj.widthOfTextAtSize(text, size);
    const padX = size * 0.6;
    const padY = size * 0.30;
    const bw = tw + padX * 2;
    const bh = size + padY * 2;
    const lineH = Math.max(1.5, size * 0.10);
    const dyBar = bh / 2 - lineH / 2;
    const o = rot(bw / 2, lineH / 2, th);
    [dyBar, -dyBar].forEach((dy) => {
      const c = rot(0, dy, th);
      page.drawRectangle({
        x: cx + c.x - o.x, y: cy + c.y - o.y, width: bw, height: lineH,
        color: color, opacity: opacity, rotate: degrees(angle)
      });
    });
    const tOff = rot(tw / 2, size * 0.34, th);
    page.drawText(text, {
      x: cx - tOff.x, y: cy - tOff.y, size: size, font: fontObj,
      color: color, opacity: opacity, rotate: degrees(angle)
    });
  };

  const red = rgb(0.86, 0.15, 0.15);

  const paintWatermark = (page) => {
    const { width: pw, height: ph } = page.getSize();
    const txt = sanitize(w.text).text.trim().toUpperCase();
    if (!txt) return;
    const size = effectiveWmSize(w.size, txt, pw);
    if (w.tile) {
      const stepX = pw / 3, stepY = ph / 4;
      for (let ix = 1; ix <= 3; ix++) {
        for (let iy = 1; iy <= 4; iy++) {
          drawBars(page, size * 0.62, txt, w.opacity * 0.85, w.angle, ix * stepX - stepX / 2, iy * stepY - stepY / 2, font, red);
        }
      }
    } else {
      // kedudukan boleh ditarik (state.wmPos: relative, asal atas-kiri)
      const cx = w.rx * pw;
      const cy = ph - w.ry * ph;
      drawBars(page, size, txt, w.opacity, w.angle, cx, cy, font, red);
    }
  };

  if (state.kind === 'image' && state.imgEl) {
    const png = state.imgIsPng;
    const dataUrl = await imageToDataUrl(state.imgEl, png);
    const emb = png ? await out.embedPng(dataUrl) : await out.embedJpg(dataUrl);
    const pw = Math.min(595, (state.imgW * 72) / 150 * 2);
    const ph = pw * (state.imgH / state.imgW);
    const page = out.addPage([pw, ph]);
    page.drawImage(emb, { x: 0, y: 0, width: pw, height: ph });
    paintWatermark(page);
    await drawAnnosOnPage(page, state.annosByPage[1] || [], pw, ph);
  } else {
    for (const idx of pagesToUse) {
      const pg = created[idx];
      const { width: pw, height: ph } = pg.getSize();
      paintWatermark(pg);
      await drawAnnosOnPage(pg, state.annosByPage[idx + 1] || [], pw, ph);
    }
  }

  if (clean.changed) {
    toast(LANG === 'bm' ? 'Sebahagian aksara (CJK/emoji) tidak disokong dan ditukar ke “?”.'
      : 'Some characters (CJK/emoji) are unsupported and were replaced with “?”.', 'err');
  }

  return await out.save();
}

async function imageToDataUrl(imgEl, png) {
  const cv = document.createElement('canvas');
  cv.width = imgEl.naturalWidth;
  cv.height = imgEl.naturalHeight;
  const c = cv.getContext('2d');
  if (!png) { c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); }
  c.drawImage(imgEl, 0, 0);
  return png ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.92);
}

function hexToRgb(hex) {
  const { rgb } = PDFLib;
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '#000000');
  if (!m) return rgb(0, 0, 0);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

async function drawAnnosOnPage(page, list, pw, ph) {
  const fontMap = {
    Helvetica: PDFLib.StandardFonts.Helvetica,
    TimesRoman: PDFLib.StandardFonts.TimesRoman,
    Courier: PDFLib.StandardFonts.Courier
  };
  const embedded = {};
  const pageH = page.getSize().height || ph;
  for (const b of list) {
    if (b.type === 'text') {
      const key = 'Helvetica';
      if (!embedded[key]) embedded[key] = await page.doc.embedFont(fontMap[key]);
      const txt = sanitize(b.val).text;
      if (!txt) continue;
      const realSize = Math.max(6, (b.size || 14) * (ph / 842) * 1.25);
      page.drawText(txt, {
        x: (b.rx || 0) * pw,
        y: pageH - (b.ry || 0) * ph - realSize,
        size: realSize,
        font: embedded[key],
        color: hexToRgb(b.color),
        maxWidth: Math.max(20, pw - (b.rx || 0) * pw - 6)
      });
    } else if (b.type === 'sig') {
      const png = b.src.startsWith('data:image/png');
      const emb = png ? await page.doc.embedPng(b.src) : await page.doc.embedJpg(b.src);
      const iw = (b.rw || 0.22) * pw;
      const dims = emb.scale(1);
      const ih = iw * (dims.height / dims.width);
      page.drawImage(emb, { x: (b.rx || 0) * pw, y: pageH - (b.ry || 0) * ph - ih, width: iw, height: ih });
    }
  }
}

/* --------------------------- EKSPORT: mampat (raster) --------------------------- */
async function buildCompressedPdf() {
  const { PDFDocument } = PDFLib;
  const q = +$('cmp-quality').value;
  const sc = +$('cmp-scale').value;
  const out = await PDFDocument.create();
  const w = wmStyles();
  const wText = sanitize(w.text).text.trim().toUpperCase();
  savePageAnnos(state.page);

  const nPages = state.kind === 'image' ? 1 : state.pages;
  for (let p = 1; p <= nPages; p++) {
    const cv = document.createElement('canvas');
    let pw, ph;
    if (state.kind === 'image') {
      cv.width = state.imgW; cv.height = state.imgH;
      cv.getContext('2d').drawImage(state.imgEl, 0, 0);
      pw = Math.min(595, (state.imgW * 72) / 150 * 2);
      ph = pw * (state.imgH / state.imgW);
    } else {
      const pg = await state.pdfDoc.getPage(p);
      const vp = pg.getViewport({ scale: sc });
      const bb = pg.getViewport({ scale: 1 });
      cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
      await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      pw = bb.width; ph = bb.height;
    }
    if (wText) drawWatermarkRaster(cv, w, wText);
    await drawAnnosRaster(cv, state.annosByPage[p] || [], cv.width, cv.height);
    const jpg = cv.toDataURL('image/jpeg', q);
    const emb = await out.embedJpg(jpg);
    const page = out.addPage([pw, ph]);
    page.drawImage(emb, { x: 0, y: 0, width: pw, height: ph });
  }
  return await out.save();
}

function drawWatermarkRaster(cv, w, text) {
  const c = cv.getContext('2d');
  const size = effectiveWmSize(w.size * (cv.width / 600), text, cv.width);
  c.save();
  c.strokeStyle = 'rgba(220,38,38,' + Math.min(1, w.opacity + 0.25) + ')';
  c.fillStyle = 'rgba(220,38,38,' + w.opacity + ')';
  c.font = '900 ' + size + 'px Helvetica, Arial, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(text).width;
  const padX = size * 0.6, padY = size * 0.35;
  const draw1 = (cx, cy) => {
    c.save();
    c.translate(cx, cy);
    c.rotate((w.angle * Math.PI) / 180);
    c.lineWidth = Math.max(2, size * 0.11);
    c.beginPath(); c.moveTo(-tw / 2 - padX, 0); c.lineTo(tw / 2 + padX, 0); c.stroke();
    c.fillText(text, 0, 0);
    c.strokeRect(-tw / 2 - padX, -size / 2 - padY, tw + padX * 2, size + padY * 2);
    c.restore();
  };
  if (w.tile) {
    for (let ix = 1; ix <= 3; ix++) for (let iy = 1; iy <= 4; iy++) draw1((cv.width / 3) * (ix - 0.5), (cv.height / 4) * (iy - 0.5));
  } else {
    draw1(w.rx * cv.width, w.ry * cv.height);
  }
  c.restore();
}

function drawAnnosRaster(cv, list, cw, ch) {
  const c = cv.getContext('2d');
  const jobs = [];
  list.forEach((b) => {
    if (b.type === 'text') {
      const size = Math.max(8, (b.size || 14) * (cw / 600) * 1.7);
      c.save();
      c.fillStyle = b.color || '#0f172a';
      c.font = '700 ' + size + 'px Helvetica, Arial, sans-serif';
      c.textBaseline = 'top';
      c.fillText(sanitize(b.val).text, b.rx * cw, b.ry * ch);
      c.restore();
    } else if (b.type === 'sig') {
      jobs.push(new Promise((res) => {
        const im = new Image();
        im.onload = () => {
          const iw = (b.rw || 0.22) * cw;
          c.drawImage(im, b.rx * cw, b.ry * ch, iw, iw * (im.height / im.width));
          res();
        };
        im.onerror = () => res();
        im.src = b.src;
      }));
    }
  });
  return Promise.all(jobs);
}

/* --------------------------- PDF teks (DOCX) --------------------------- */
async function buildTextPdfBytes(text) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 11, lh = 15, margin = 48;
  const pw = 595, ph = 842;
  const maxW = pw - margin * 2;
  const lines = [];
  for (const raw of sanitize(text).text.split(/\r?\n/)) {
    let line = '';
    for (const word of raw.split(/\s+/)) {
      const test = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(test, size) > maxW) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  let page = doc.addPage([pw, ph]);
  let y = ph - margin;
  for (const line of lines) {
    if (y < margin) { page = doc.addPage([pw, ph]); y = ph - margin; }
    page.drawText(line || ' ', { x: margin, y: y, size: size, font: font, color: rgb(0.06, 0.09, 0.16) });
    y -= lh;
  }
  return await doc.save();
}

/* --------------------------- KONGSI & CETAK --------------------------- */
function shareTextOnly(via) {
  const text = encodeURIComponent(PROMO_TEXT);
  const url = encodeURIComponent(APP_URL);
  const links = {
    whatsapp: 'https://api.whatsapp.com/send?text=' + text,
    telegram: 'https://t.me/share/url?url=' + url + '&text=' + text
  };
  window.open(links[via] || links.whatsapp, '_blank', 'noopener');
}

async function shareDocument() {
  if (!state.kind) { toast(t('errType'), 'err'); return; }
  busy(true, t('busyShare'));
  try {
    const bytes = await buildSafePdf();
    const name = 'PALANG-' + slug(state.file && state.file.name) + '-' + Date.now() + '.pdf';
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const file = new File([blob], name, { type: 'application/pdf' });
    $('out-info').textContent = name + ' • ' + fmt(bytes.length) + ' • ' + state.pages + ' ' + t('pagesOf');

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'PDFEasy', text: PROMO_TEXT });
      toast(t('okShare'), 'ok');
    } else if (navigator.share) {
      download(blob, name);
      await navigator.share({ title: 'PDFEasy', text: PROMO_TEXT, url: APP_URL }).catch(() => {});
      toast(t('shareFallback'), 'ok');
    } else {
      download(blob, name);
      shareTextOnly('whatsapp');
      toast(t('shareFallback'), 'ok');
    }
  } catch (e) {
    if (e && e.name === 'AbortError') toast(t('shareCancelled'));
    else { console.error(e); toast((e.message || String(e)).slice(0, 120), 'err'); }
  } finally { busy(false); }
}

async function shareApp() {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'PDFEasy', text: PROMO_TEXT, url: APP_URL });
    } else {
      shareTextOnly('whatsapp');
    }
  } catch (e) {
    if (e && e.name !== 'AbortError') shareTextOnly('whatsapp');
  }
}

/* --------------------------- UI wiring --------------------------- */
function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab));
  renderWatermarkPreview();
}

function resetDoc(showUpload) {
  state.kind = null; state.file = null; state.pdfBytes = null; state.pdfDoc = null;
  state.imgEl = null; state.docxText = null; state.pages = 1; state.page = 1;
  state.annos = []; state.annosByPage = {};
  state.wmPos = { rx: 0.5, ry: 0.5 };
  $('annotation-layer').innerHTML = '';
  $('file-input').value = '';
  $('file-camera').value = '';
  $('out-info').textContent = '';
  const cv = $('doc-canvas');
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  if (showUpload !== false) {
    $('workspace').classList.add('hidden');
    $('upload-card').classList.remove('hidden');
  }
}

async function savePdf() {
  if (!state.kind) { toast(t('errType'), 'err'); return; }
  try {
    busy(true, t('busyExport'));
    const bytes = await buildSafePdf();
    const name = 'PALANG-' + slug(state.file && state.file.name) + '-' + Date.now() + '.pdf';
    download(new Blob([bytes], { type: 'application/pdf' }), name);
    $('out-info').textContent = name + ' • ' + fmt(bytes.length) + ' • ' + state.pages + ' ' + t('pagesOf');
    toast(t('okSave', { size: fmt(bytes.length) }), 'ok');
  } catch (e) {
    console.error(e);
    toast((e.message || String(e)).slice(0, 120), 'err');
  } finally { busy(false); }
}

async function saveCompressed() {
  if (!state.kind) { toast(t('errType'), 'err'); return; }
  try {
    busy(true, t('busyCompress'));
    const before = state.file ? state.file.size : 0;
    const bytes = await buildCompressedPdf();
    const name = 'MAMPAT-' + slug(state.file && state.file.name) + '-' + Date.now() + '.pdf';
    download(new Blob([bytes], { type: 'application/pdf' }), name);
    $('out-info').textContent = name + ' • ' + fmt(before) + ' → ' + fmt(bytes.length);
    toast(t('okCompress', { from: fmt(before), to: fmt(bytes.length) }), 'ok');
  } catch (e) {
    console.error(e);
    toast((e.message || String(e)).slice(0, 120), 'err');
  } finally { busy(false); }
}

async function printDoc() {
  if (!state.kind) return;
  try {
    busy(true, t('busyExport'));
    const bytes = await buildSafePdf();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const win = window.open(url, '_blank');
    if (win) setTimeout(() => { try { win.print(); } catch (e) {} }, 1200);
    else download(new Blob([bytes], { type: 'application/pdf' }), 'CETAK-' + slug(state.file && state.file.name) + '.pdf');
    setTimeout(() => URL.revokeObjectURL(url), 90000);
  } catch (e) { toast((e.message || String(e)).slice(0, 120), 'err'); }
  finally { busy(false); }
}

function bind() {
  $('lang-select').addEventListener('change', (e) => {
    LANG = e.target.value;
    localStorage.setItem('pdfeasy_lang', LANG);
    applyLang();
    setTab(state.tab);
  });

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

  $('file-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
  $('file-camera').addEventListener('change', (e) => handleFile(e.target.files[0]));

  const dz = $('dropzone');
  dz.addEventListener('click', (e) => { if (e.target.id === 'file-input') e.preventDefault(); });
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.files;
    if (items && items[0]) handleFile(items[0]);
  });

  ['wm-text', 'wm-size', 'wm-angle', 'wm-opacity', 'wm-tile'].forEach((id) => {
    $(id).addEventListener('input', renderWatermarkPreview);
  });
  document.querySelectorAll('#wm-presets .chip-btn').forEach((b) => {
    b.addEventListener('click', () => { $('wm-text').value = b.dataset.wm; renderWatermarkPreview(); });
  });
  $('btn-wm-reset').addEventListener('click', () => {
    state.wmPos = { rx: 0.5, ry: 0.5 };
    renderWatermarkPreview();
    toast(LANG === 'bm' ? 'Palang dikembalikan ke tengah.' : 'Watermark recentred.', 'ok');
  });

  $('btn-add-text').addEventListener('click', () => addTextAnno({
    font: $('font-family').value === 'Helvetica' ? 'Helvetica, Arial, sans-serif'
      : $('font-family').value === 'TimesRoman' ? '"Times New Roman", serif' : '"Courier New", monospace',
    size: +$('text-size').value,
    color: $('text-color').value
  }));

  // kemas kini gaya teks yang sedang difokus (UX)
  const styleFocused = () => {
    const el = document.activeElement;
    if (el && el.tagName === 'INPUT' && el.closest('.anno-item')) {
      el.style.fontFamily = $('font-family').value === 'Helvetica' ? 'Helvetica, Arial, sans-serif'
        : $('font-family').value === 'TimesRoman' ? '"Times New Roman", serif' : '"Courier New", monospace';
      el.style.fontSize = $('text-size').value + 'px';
      el.style.color = $('text-color').value;
    }
  };
  ['font-family', 'text-size', 'text-color'].forEach((id) => $(id).addEventListener('input', styleFocused));
  $('font-family').addEventListener('change', styleFocused);

  $('btn-open-sig').addEventListener('click', openSig);
  $('btn-close-sig').addEventListener('click', closeSig);
  $('btn-clear-sig').addEventListener('click', clearSig);
  $('btn-apply-sig').addEventListener('click', () => {
    addSignatureAnno($('sig-canvas').toDataURL('image/png'));
    closeSig();
  });
  $('file-sig').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    addSignatureAnno(url);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  });

  $('btn-zoom-in').addEventListener('click', () => {
    state.fit = false;
    const base = state.shownScale || 1;
    state.zoom = Math.min(4, base * 1.2);
    render().then(refreshLayer);
  });
  $('btn-zoom-out').addEventListener('click', () => {
    state.fit = false;
    const base = state.shownScale || 1;
    state.zoom = Math.max(0.3, base / 1.2);
    render().then(refreshLayer);
  });
  $('btn-fit').addEventListener('click', () => fitToWidth().then(refreshLayer));
  $('btn-prev').addEventListener('click', () => goPage(state.page - 1));
  $('btn-next').addEventListener('click', () => goPage(state.page + 1));

  $('btn-reset').addEventListener('click', () => resetDoc(true));

  $('btn-save-pdf').addEventListener('click', savePdf);
  $('btn-save-compressed').addEventListener('click', saveCompressed);
  $('btn-print').addEventListener('click', printDoc);
  $('btn-share-doc').addEventListener('click', shareDocument);
  $('btn-share-app').addEventListener('click', shareApp);
  $('btn-share-telegram').addEventListener('click', () => shareTextOnly('telegram'));

  window.addEventListener('resize', () => { if (state.kind && state.fit) render().then(refreshLayer); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.kind && state.fit) render().then(refreshLayer); });

  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    $('btn-install').classList.remove('hidden');
  });
  $('btn-install').addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    $('btn-install').classList.add('hidden');
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

/* --------------------------- cangkuk ujian --------------------------- */
window.__pdfeasy = {
  state: state,
  buildSafePdf: buildSafePdf,
  buildCompressedPdf: buildCompressedPdf,
  setFile: handleFile,
  wm: wmStyles,
  annosFromDom: annosFromDom,
  savePageAnnos: savePageAnnos,
  loadPageAnnos: loadPageAnnos,
  goPage: goPage,
  addTextAnno: addTextAnno,
  addSignatureAnno: addSignatureAnno,
  shareDocument: shareDocument,
  render: render,
  refreshLayer: refreshLayer
};

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  setTab('protect');
  bind();
});
