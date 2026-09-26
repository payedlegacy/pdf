/* =====================================================================
   PDFEasy — pdf.payedlegacy.my
   100% client-side PDF utility: watermark/palang ID, isi borang, tanda
   tangan, mampatkan PDF. Tiada fail dimuat naik ke pelayan.
   ===================================================================== */
'use strict';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const MAX_BYTES_DESKTOP = 60 * 1024 * 1024;
const MAX_BYTES_MOBILE = 25 * 1024 * 1024;

const state = {
  kind: null,          // 'pdf' | 'image' | 'docx'
  file: null,
  pdfBytes: null,      // ArrayBuffer asal (untuk export vektor)
  pdfDoc: null,        // pdf.js document (preview)
  imgEl: null,         // HTMLImageElement (image kind)
  imgIsPng: false,
  imgW: 0, imgH: 0,
  page: 1,
  pages: 1,
  tab: 'protect',
  zoom: 1,
  fit: true,
  annos: [],           // {el, type:'text'|'sig'}
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
    addText: 'Tambah Teks',
    drawSig: 'Tandatangan',
    uploadSig: 'Muat naik tandatangan',
    font: 'Fon',
    textSize: 'Saiz teks',
    textColor: 'Warna',
    dragHint: 'Seret elemen pada dokumen untuk atur kedudukan. Elemen akan dicetak pada PDF yang dimuat turun.',
    quality: 'Tahap mampatan',
    resolution: 'Resolusi',
    compressHint: 'Mampatan menukar setiap halaman kepada imej. Gunakan “Simpan PDF” jika anda mahu teks PDF kekal boleh dipilih.',
    fitWidth: 'Muat skrin',
    savePdf: 'Simpan PDF (watermark + tandatangan)',
    saveCompressed: 'Simpan versi mampat',
    print: 'Cetak',
    howTitle: 'Cara guna (contoh: hantar IC kepada Cuckoo)',
    how1: 'Pilih gambar IC (atau ambil gambar dengan kamera) / fail PDF.',
    how2: 'Tekan preset “FOR CUCKOO ONLY” atau taip tujuan anda sendiri.',
    how3: 'Tekan “Simpan PDF” — fail baharu yang sudah ada palang merah akan dimuat turun.',
    how4: 'Hantar fail berpalang itu. IC asal anda tidak pernah dimuat naik ke internet.',
    footerNote: 'Semua pemprosesan berlaku dalam pelayar anda. Tiada fail dihantar ke pelayan.',
    sigTitle: 'Tandatangan',
    sigHint: 'Lukis dengan jari atau tetikus.',
    clearPad: 'Padam',
    applySig: 'Guna Tandatangan',
    previewTitle: 'Pratonton hasil',
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
    okLoad: 'Siap! Palang sedia — tekan “Simpan PDF”.',
    okSave: 'PDF dimuat turun ({size}).',
    okCompress: 'Selesai: {from} → {to}.',
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
    addText: 'Add Text',
    drawSig: 'Draw Signature',
    uploadSig: 'Upload signature',
    font: 'Font',
    textSize: 'Text size',
    textColor: 'Colour',
    dragHint: 'Drag elements on the document to position them. They will be printed into the downloaded PDF.',
    quality: 'Compression level',
    resolution: 'Resolution',
    compressHint: 'Compression rasterises each page. Use “Save PDF” if you need the PDF text to stay selectable.',
    fitWidth: 'Fit width',
    savePdf: 'Save PDF (watermark + signature)',
    saveCompressed: 'Save compressed copy',
    print: 'Print',
    howTitle: 'How to use (example: sending IC to Cuckoo)',
    how1: 'Choose your IC photo (or shoot it with the camera) / a PDF file.',
    how2: 'Tap the “FOR CUCKOO ONLY” preset or type your own purpose.',
    how3: 'Tap “Save PDF” — a new file with the red cross-line downloads.',
    how4: 'Send the watermarked file. Your original IC never leaves your device.',
    footerNote: 'All processing happens in your browser. No file is sent to a server.',
    sigTitle: 'Signature',
    sigHint: 'Draw with your finger or mouse.',
    clearPad: 'Clear',
    applySig: 'Apply Signature',
    previewTitle: 'Result preview',
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
    okLoad: 'Done! Watermark ready — tap “Save PDF”.',
    okSave: 'PDF downloaded ({size}).',
    okCompress: 'Done: {from} → {to}.',
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
    addText: '添加文字',
    drawSig: '手写签名',
    uploadSig: '上传签名图片',
    font: '字体',
    textSize: '文字大小',
    textColor: '颜色',
    dragHint: '拖动文档上的元素来定位，保存时会被打印到 PDF 中。',
    quality: '压缩强度',
    resolution: '分辨率',
    compressHint: '压缩会把每页转为图片。若需要保留可选文字，请使用“保存 PDF”。',
    fitWidth: '适应宽度',
    savePdf: '保存 PDF（水印 + 签名）',
    saveCompressed: '保存压缩版',
    print: '打印',
    howTitle: '使用方法（示例：把 IC 交给 Cuckoo）',
    how1: '选择 IC 照片（或使用相机拍摄）/ PDF 文件。',
    how2: '点击 “FOR CUCKOO ONLY” 预设，或输入自己的用途。',
    how3: '点击“保存 PDF”，带红色水印的新文件会下载。',
    how4: '把带水印的文件发出去，原始 IC 从未离开你的设备。',
    footerNote: '所有处理都在浏览器中完成，文件不会发送到服务器。',
    sigTitle: '签名',
    sigHint: '用手指或鼠标书写。',
    clearPad: '清除',
    applySig: '使用签名',
    previewTitle: '结果预览',
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
    okLoad: '完成！水印已就绪，点击“保存 PDF”。',
    okSave: 'PDF 已下载（{size}）。',
    okCompress: '完成：{from} → {to}。',
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
function bytesOf(dataUrl) {
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}
// StandardFonts (WinAnsi) tidak menyokong aksara CJK/emoji — bersihkan + beri amaran.
function sanitize(str) {
  let changed = false;
  const out = String(str).replace(/[^\u0000-\u00FF\u2018\u2019\u201C\u201D\u2013\u2014]/g, () => { changed = true; return '?'; });
  return { text: out, changed };
}

/* --------------------------- file intake --------------------------- */
function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
function extOf(name) {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

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
      // DOCX → teks ke PDF (mammoth dimuat secara malas)
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

/* --------------------------- render preview --------------------------- */
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

  if (state.kind === 'pdf' && state.pdfDoc) {
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
    const scroll2 = scroll.clientWidth - 24;
    const maxW = state.fit ? Math.max(240, scroll2) : Math.min(state.imgW, state.imgW * state.zoom);
    const ratio = Math.min(1, maxW / state.imgW);
    state.shownScale = ratio;
    canvas.width = Math.floor(state.imgW * ratio);
    canvas.height = Math.floor(state.imgH * ratio);
    wrap.style.width = canvas.width + 'px';
    wrap.style.height = canvas.height + 'px';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.imgEl, 0, 0, canvas.width, canvas.height);
  } else if (state.kind === 'docx' && state.pdfDoc) {
    const page = await state.pdfDoc.getPage(state.page);
    const base = page.getViewport({ scale: 1 });
    const avail = Math.max(240, scroll.clientWidth - 24);
    const scale = state.fit ? avail / base.width : state.zoom;
    state.shownScale = scale;
    const vp = page.getViewport({ scale });
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    wrap.style.width = canvas.width + 'px';
    wrap.style.height = canvas.height + 'px';
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
  }
  $('page-nav').classList.toggle('hidden', state.pages < 2);
  renderWatermarkPreview();
  $('zoom-label').textContent = Math.round((state.shownScale || 1) * 100) + '%';
}

/* --------------------------- watermark preview --------------------------- */
function wmStyles() {
  return {
    text: $('wm-text').value || '',
    size: +$('wm-size').value,
    angle: +$('wm-angle').value,
    opacity: +$('wm-opacity').value / 100,
    tile: $('wm-tile').checked
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
  // saiz efektif sama seperti eksport (WYSIWYG) — auto-kecil jika teks panjang
  const size = effectiveWmSize(w.size * (cvW / 600), w.text, cvW);

  const box = document.createElement('div');
  box.className = 'wm-preview';
  box.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  const rows = w.tile ? 4 : 1;
  for (let i = 0; i < rows; i++) {
    const row = document.createElement('div');
    row.style.cssText = 'position:absolute;left:0;right:0;display:flex;justify-content:center;' +
      (w.tile ? 'top:' + (12 + i * 24) + '%;' : 'top:45%;');
    row.innerHTML = '<div style="transform:rotate(' + w.angle + 'deg);opacity:' + w.opacity + ';' +
      'border-top:3px solid #dc2626;border-bottom:3px solid #dc2626;padding:4px 14px;">' +
      '<span style="font-size:' + size + 'px;font-weight:900;color:#dc2626;letter-spacing:1.5px;' +
      'text-transform:uppercase;white-space:nowrap;">' + escapeHtml(w.text) + '</span></div>';
    box.appendChild(row);
  }
  layer.appendChild(box);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Saiz palang berkesan: hadkan supaya teks sentiasa muat dalam lebar halaman.
// Digunakan oleh pratonton (px) & eksport (pt) supaya hasil sama (WYSIWYG).
function effectiveWmSize(userSize, text, pageWidth) {
  const len = Math.max(6, String(text || '').length);
  return Math.max(6, Math.min(userSize, (pageWidth / len) * 2.05));
}

/* --------------------------- annotations --------------------------- */
function makeDraggable(el) {
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

  const start = (x, y) => {
    dragging = true;
    sx = x; sy = y;
    ox = el.offsetLeft; oy = el.offsetTop;
  };
  const move = (x, y) => {
    if (!dragging) return;
    const layer = $('annotation-layer');
    let nx = ox + (x - sx);
    let ny = oy + (y - sy);
    nx = Math.max(-20, Math.min(layer.clientWidth - 30, nx));
    ny = Math.max(-20, Math.min(layer.clientHeight - 20, ny));
    el.style.left = nx + 'px';
    el.style.top = ny + 'px';
  };
  const end = () => { dragging = false; };

  el.addEventListener('mousedown', (e) => { if (e.target.closest('input,button')) return; e.preventDefault(); start(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
  window.addEventListener('mouseup', end);
  el.addEventListener('touchstart', (e) => {
    if (e.target.closest('input,button')) return;
    const tt = e.touches[0];
    start(tt.clientX, tt.clientY);
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    const tt = e.touches[0];
    move(tt.clientX, tt.clientY);
  }, { passive: false });
  el.addEventListener('touchend', end);
}

function addTextAnno() {
  const layer = $('annotation-layer');
  const el = document.createElement('div');
  el.className = 'anno-item';
  el.style.left = '24px';
  el.style.top = '24px';
  el.innerHTML = '<input type="text" value="' + escapeHtml(LANG === 'bm' ? 'Taip di sini…' : 'Type here…') + '">' +
    '<button class="anno-del" title="delete">✕</button>';
  el.querySelector('.anno-del').addEventListener('click', () => { el.remove(); state.annos = state.annos.filter((a) => a.el !== el); });
  layer.appendChild(el);
  makeDraggable(el);
  state.annos.push({ el: el, type: 'text' });
  el.querySelector('input').focus();
}

function addSignatureAnno(dataUrl) {
  const layer = $('annotation-layer');
  const el = document.createElement('div');
  el.className = 'anno-item sig';
  el.style.left = '40px';
  el.style.top = '40px';
  const img = document.createElement('img');
  img.src = dataUrl;
  img.style.width = '120px';
  img.style.height = 'auto';
  img.style.pointerEvents = 'none';
  const del = document.createElement('button');
  del.className = 'anno-del';
  del.textContent = '✕';
  del.addEventListener('click', () => { el.remove(); state.annos = state.annos.filter((a) => a.el !== el); });
  const bigger = document.createElement('button');
  bigger.className = 'anno-del';
  bigger.textContent = '＋';
  bigger.title = 'besar';
  bigger.addEventListener('click', () => { img.style.width = (img.clientWidth + 20) + 'px'; });
  const smaller = document.createElement('button');
  smaller.className = 'anno-del';
  smaller.textContent = '－';
  smaller.title = 'kecil';
  smaller.addEventListener('click', () => { img.style.width = Math.max(40, img.clientWidth - 20) + 'px'; });
  el.append(img, smaller, bigger, del);
  layer.appendChild(el);
  makeDraggable(el);
  state.annos.push({ el: el, type: 'sig', img: img });
}

/* --------------------------- signature pad --------------------------- */
let sigCtx = null, sigDrawing = false, sigHasInk = false;
function openSig() {
  $('sig-modal').classList.remove('hidden');
  const cv = $('sig-canvas');
  const rect = cv.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(rect.width * dpr);
  cv.height = Math.round(rect.height * dpr);
  sigCtx = cv.getContext('2d');
  sigCtx.scale(dpr, dpr);
  sigCtx.fillStyle = '#fff';
  sigCtx.fillRect(0, 0, rect.width, rect.height);
  sigCtx.strokeStyle = '#0f172a';
  sigCtx.lineWidth = 2.4;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
  sigHasInk = false;

  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const down = (e) => { e.preventDefault(); sigDrawing = true; const p = pos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); };
  const move = (e) => {
    if (!sigDrawing) return;
    e.preventDefault();
    const p = pos(e);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
    sigHasInk = true;
  };
  const up = () => { sigDrawing = false; };
  cv.onmousedown = down; cv.onmousemove = move; cv.onmouseup = up; cv.onmouseleave = up;
  cv.ontouchstart = down; cv.ontouchmove = move; cv.ontouchend = up;
}
function closeSig() { $('sig-modal').classList.add('hidden'); }
function clearSig() {
  const cv = $('sig-canvas');
  const r = cv.getBoundingClientRect();
  sigCtx.save(); sigCtx.setTransform(1, 0, 0, 1, 0, 0);
  sigCtx.fillStyle = '#fff'; sigCtx.fillRect(0, 0, cv.width, cv.height); sigCtx.restore();
  sigHasInk = false;
}

/* --------------------------- EXPORT: PDF vektor (kekalkan teks) --------------------------- */
function wmDrawSpec(w, pageW, pageH) {
  const font = 'Helvetica-Bold';
  return { font: font, size: w.size, angle: w.angle, opacity: w.opacity, tile: w.tile, text: sanitize(w.text).text.trim().toUpperCase() };
}

async function buildSafePdf() {
  const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
  const out = await PDFDocument.create();
  const w = wmStyles();
  const clean = sanitize(w.text);
  const allPages = $('wm-all-pages').checked;
  const annoBoxes = collectAnnos();

  // ---- sumber: PDF asal (kecuali input gambar) ----
  const font = await out.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await out.embedFont(StandardFonts.Helvetica);

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

  // putaran seragam: semua elemen berpusing pada pusat jalur
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

  const paintWatermark = (page, wSpec) => {
    const { width: pw, height: ph } = page.getSize();
    if (!wSpec.text) return;
    const size = effectiveWmSize(wSpec.size, wSpec.text, pw);
    const f = font;
    if (wSpec.tile) {
      const stepX = pw / 3;
      const stepY = ph / 4;
      for (let ix = 1; ix <= 3; ix++) {
        for (let iy = 1; iy <= 4; iy++) {
          drawBars(page, size * 0.62, wSpec.text, wSpec.opacity * 0.85, wSpec.angle, ix * stepX - stepX / 2, iy * stepY - stepY / 2, f, red);
        }
      }
    } else {
      drawBars(page, size, wSpec.text, wSpec.opacity, wSpec.angle, pw / 2, ph / 2, f, red);
    }
  };

  // ---- sumber: gambar (IC) ----
  if (state.kind === 'image' && state.imgEl) {
    const iw = state.imgW, ih = state.imgH;
    const png = state.imgIsPng;
    const dataUrl = await imageToDataUrl(state.imgEl, png);
    const emb = png ? await out.embedPng(dataUrl) : await out.embedJpg(dataUrl);
    const pw = Math.min(595, (iw * 72) / 150 * 2);
    const ph = pw * (ih / iw);
    const page = out.addPage([pw, ph]);
    page.drawImage(emb, { x: 0, y: 0, width: pw, height: ph });
    paintWatermark(page, wmDrawSpec(w, pw, ph));
    drawAnnosOnPage(page, annoBoxes, pw, ph);
  } else {
    // ---- sumber: PDF ----
    for (const idx of pagesToUse) {
      const pg = created[idx];
      const { width: pw, height: ph } = pg.getSize();
      paintWatermark(pg, wmDrawSpec(w, pw, ph));
      if (idx === state.page - 1) drawAnnosOnPage(pg, annoBoxes, pw, ph);
    }
  }

  if (clean.changed) toast(LANG === 'bm' ? 'Sebahagian aksara (CJK/emoji) tidak disokong dan ditukar ke “?”.' : 'Some characters (CJK/emoji) are unsupported and were replaced with “?”.', 'err');

  const bytes = await out.save();
  return bytes;
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

function collectAnnos() {
  const layer = $('annotation-layer');
  const lw = layer.clientWidth || 1;
  const lh = layer.clientHeight || 1;
  return state.annos.filter((a) => a.el.isConnected).map((a) => {
    const el = a.el;
    const rel = {
      x: el.offsetLeft / lw,
      y: el.offsetTop / lh,
      w: el.offsetWidth / lw,
      h: el.offsetHeight / lh
    };
    if (a.type === 'text') {
      return {
        type: 'text',
        text: el.querySelector('input').value,
        rel: rel,
        font: $('font-family').value,
        size: +$('text-size').value,
        color: $('text-color').value
      };
    }
    return { type: 'sig', dataUrl: a.img.src, rel: rel };
  });
}

function hexToRgb(hex) {
  const { rgb } = PDFLib;
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '#000000');
  if (!m) return rgb(0, 0, 0);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

async function drawAnnosOnPage(page, boxes, pw, ph) {
  const { degrees } = PDFLib;
  const fontMap = {
    Helvetica: PDFLib.StandardFonts.Helvetica,
    TimesRoman: PDFLib.StandardFonts.TimesRoman,
    Courier: PDFLib.StandardFonts.Courier
  };
  const embedded = {};
  for (const b of boxes) {
    if (b.type === 'text') {
      const key = b.font;
      if (!embedded[key]) embedded[key] = await page.doc.embedFont(fontMap[key] || PDFLib.StandardFonts.Helvetica);
      const f = embedded[key];
      const txt = sanitize(b.text).text || ' ';
      const size = Math.max(6, b.size * (ph / (page.getSize().height || ph)) * (pw / Math.max(1, page.getSize().width)));
      const scale = Math.min(pw, ph) / 842;
      const realSize = Math.max(6, b.size * 1.25 * scale);
      page.drawText(txt, {
        x: b.rel.x * pw,
        y: ph - b.rel.y * ph - realSize,
        size: realSize,
        font: f,
        color: hexToRgb(b.color),
        rotate: degrees(0),
        maxWidth: pw - b.rel.x * pw - 8
      });
    } else if (b.type === 'sig') {
      const png = b.dataUrl.startsWith('data:image/png');
      const emb = png ? await page.doc.embedPng(b.dataUrl) : await page.doc.embedJpg(b.dataUrl);
      const iw = b.rel.w * pw;
      const ih = b.rel.h * ph;
      page.drawImage(emb, { x: b.rel.x * pw, y: ph - b.rel.y * ph - ih, width: iw, height: ih });
    }
  }
}

/* --------------------------- EXPORT: mampat (raster) --------------------------- */
async function buildCompressedPdf() {
  const { PDFDocument } = PDFLib;
  const q = +$('cmp-quality').value;
  const sc = +$('cmp-scale').value;
  const out = await PDFDocument.create();
  const w = wmStyles();
  const wSpecText = sanitize(w.text).text.trim().toUpperCase();

  const nPages = state.kind === 'image' ? 1 : state.pages;
  for (let p = 1; p <= nPages; p++) {
    let cv = document.createElement('canvas');
    let pw, ph;
    if (state.kind === 'image') {
      cv.width = state.imgW; cv.height = state.imgH;
      cv.getContext('2d').drawImage(state.imgEl, 0, 0);
      pw = Math.min(595, (state.imgW * 72) / 150 * 2);
      ph = pw * (state.imgH / state.imgW);
    } else {
      const pg = await state.pdfDoc.getPage(p);
      const base = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: sc });
      cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
      await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      const bb = pg.getViewport({ scale: 1 });
      pw = bb.width; ph = bb.height;
    }
    if (wSpecText) drawWatermarkRaster(cv, w, wSpecText);
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
    draw1(cv.width / 2, cv.height / 2);
  }
  c.restore();
}

/* --------------------------- PDF teks (DOCX) --------------------------- */
async function buildTextPdfBytes(text) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 11, lh = 15, margin = 48;
  const pw = 595, ph = 842;
  const maxW = pw - margin * 2;
  const clean = sanitize(text).text.split(/\r?\n/);
  const lines = [];
  for (const raw of clean) {
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
    page.drawText(line || ' ', { x: margin, y: y, size, font, color: rgb(0.06, 0.09, 0.16) });
    y -= lh;
  }
  return await doc.save();
}

/* --------------------------- UI wiring --------------------------- */
function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab));
  document.querySelectorAll('.wm-preview').forEach((e) => e.remove());
  renderWatermarkPreview();
}

function resetDoc(showUpload) {
  state.kind = null; state.file = null; state.pdfBytes = null; state.pdfDoc = null;
  state.imgEl = null; state.docxText = null; state.pages = 1; state.page = 1;
  state.annos.forEach((a) => a.el.remove());
  state.annos = [];
  $('annotation-layer').querySelectorAll('.anno-item, .wm-preview').forEach((e) => e.remove());
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

  $('btn-add-text').addEventListener('click', addTextAnno);
  $('btn-open-sig').addEventListener('click', openSig);
  $('btn-close-sig').addEventListener('click', closeSig);
  $('btn-clear-sig').addEventListener('click', clearSig);
  $('btn-apply-sig').addEventListener('click', () => {
    const cv = $('sig-canvas');
    addSignatureAnno(cv.toDataURL('image/png'));
    closeSig();
  });
  $('file-sig').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    addSignatureAnno(url);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  });

  $('btn-zoom-in').addEventListener('click', () => { state.fit = false; state.zoom = Math.min(4, (state.zoom || 1) * 1.2); render(); });
  $('btn-zoom-out').addEventListener('click', () => { state.fit = false; state.zoom = Math.max(0.3, (state.zoom || 1) / 1.2); render(); });
  $('btn-fit').addEventListener('click', fitToWidth);
  $('btn-prev').addEventListener('click', () => { if (state.page > 1) { state.page--; $('cur-page').textContent = state.page; render(); } });
  $('btn-next').addEventListener('click', () => { if (state.page < state.pages) { state.page++; $('cur-page').textContent = state.page; render(); } });

  $('btn-reset').addEventListener('click', () => resetDoc(true));

  $('btn-save-pdf').addEventListener('click', async () => {
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
  });

  $('btn-save-compressed').addEventListener('click', async () => {
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
  });

  $('btn-print').addEventListener('click', async () => {
    if (!state.kind) return;
    try {
      busy(true, t('busyExport'));
      const bytes = await buildSafePdf();
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { toast((e.message || String(e)).slice(0, 120), 'err'); }
    finally { busy(false); }
  });

  window.addEventListener('resize', () => { if (state.kind && state.fit) render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.kind && state.fit) render(); });

  // PWA install
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

/* --------------------------- test hooks --------------------------- */
window.__pdfeasy = {
  state: state,
  buildSafePdf: buildSafePdf,
  buildCompressedPdf: buildCompressedPdf,
  setFile: handleFile,
  wm: wmStyles,
  collectAnnos: collectAnnos,
  render: render
};

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  setTab('protect');
  bind();
});
