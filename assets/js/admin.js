/* ══════════════════════════════════════════════════════════════════
   admin.js  —  Plava Content Studio (Product-level)
   Firebase auth · Cloudinary uploads · Firestore CRUD
   Search, filter, bulk actions, edit modal, 50-item caps per section
   ══════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────────
   CONFIG
────────────────────────────────────────────────────────────────── */

const FIRESTORE_DOC = 'sites/plava';
const ADMIN_EMAIL   = 'kowshikmahi1209@gmail.com';
const MAX_ITEMS     = 50;                 // cap for products/gallery/testimonials/instagram/blog
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DEFAULT_MAX_MB = 5;

// Per-section config: list key, render targets, etc.
const SECTIONS = ['products', 'gallery', 'testimonials', 'instagram', 'blog'];

// In-memory cache of the current Firestore document
let CACHE = {};
// Selected item IDs per section, for bulk actions
const SELECTED = { products: new Set(), gallery: new Set(), testimonials: new Set(), instagram: new Set(), blog: new Set() };
// Active search/filter state per section
const FILTERS = {
  products: { q: '', cat: '' },
  gallery: { q: '', cat: '' },
  testimonials: { q: '', cat: '' },
  instagram: { q: '' },
  blog: { q: '', cat: '' },
};

/* ──────────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────────── */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function setStatus(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#e63946' : 'var(--jade)';
}
function escapeHtml(str) {
  return (str || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function toast(msg, type = '') {
  const stack = document.querySelector('[data-toast-stack]');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast${type ? ' toast-' + type : ''}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ──────────────────────────────────────────────────────────────────
   CLOUDINARY UPLOAD (with size/type validation)
────────────────────────────────────────────────────────────────── */

function validateFile(file, maxMb) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported file type "${file.type || 'unknown'}". Use JPG, PNG, WebP or GIF.`;
  }
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — max allowed is ${maxMb}MB.`;
  }
  return null;
}

async function uploadToCloudinary(file) {
  if (!window.CLOUDINARY_CLOUD_NAME || !window.CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Check cloudinary-config.js.');
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', window.CLOUDINARY_UPLOAD_PRESET);
  fd.append('folder', 'plava');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/auto/upload`, {
    method: 'POST', body: fd
  });
  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try { const j = await res.json(); if (j.error?.message) msg = j.error.message; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  return data.secure_url;
}

/* ──────────────────────────────────────────────────────────────────
   FIRESTORE I/O
────────────────────────────────────────────────────────────────── */

async function firestoreGet() {
  const snap = await firebase.firestore().doc(FIRESTORE_DOC).get();
  return snap.exists ? snap.data() : {};
}
async function firestoreSet(fields) {
  await firebase.firestore().doc(FIRESTORE_DOC).set(fields, { merge: true });
}

/* ──────────────────────────────────────────────────────────────────
   UPLOAD BOX: drag & drop + validation + preview
────────────────────────────────────────────────────────────────── */

function initUploadBoxes() {
  document.querySelectorAll('.upload-box').forEach(box => {
    const input = box.querySelector('input[type="file"]');
    if (!input) return;
    const maxMb = Number(box.dataset.maxMb) || DEFAULT_MAX_MB;
    const previewKey = box.dataset.uploadFor;
    const preview = previewKey ? document.querySelector(`[data-preview="${previewKey}"]`) : null;
    const labelSpan = box.querySelector('span:not(.upload-icon):not(.upload-sub)');

    function handleFile(file) {
      box.classList.remove('upload-error');
      const err = validateFile(file, maxMb);
      if (err) {
        box.classList.add('upload-error');
        toast(err, 'error');
        input.value = '';
        return;
      }
      if (preview) {
        const img = preview.querySelector('img');
        const placeholder = preview.querySelector('.preview-placeholder');
        const url = URL.createObjectURL(file);
        img.src = url;
        img.hidden = false;
        if (placeholder) placeholder.hidden = true;
      }
      if (labelSpan) labelSpan.textContent = file.name;
    }

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) handleFile(file);
    });
    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('drag-over'); });
    box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
    box.addEventListener('drop', e => {
      e.preventDefault();
      box.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleFile(file);
    });
  });
}

function resetUploadBox(form) {
  form.querySelectorAll('.upload-box').forEach(box => {
    box.classList.remove('upload-error', 'drag-over');
    const span = box.querySelector('span:not(.upload-icon):not(.upload-sub)');
    if (span) span.textContent = 'Click to choose image or drag here';
  });
  form.querySelectorAll('.img-preview img').forEach(img => { img.src = ''; img.hidden = true; });
  form.querySelectorAll('.preview-placeholder').forEach(el => { el.hidden = false; });
}

/* ──────────────────────────────────────────────────────────────────
   LIMIT BADGE
────────────────────────────────────────────────────────────────── */

function updateLimitBadge(section, count) {
  const el = document.querySelector(`[data-limit="${section}"]`);
  if (!el) return;
  el.textContent = `${count} / ${MAX_ITEMS}`;
  el.classList.remove('limit-warn', 'limit-full');
  if (count >= MAX_ITEMS) el.classList.add('limit-full');
  else if (count >= MAX_ITEMS - 5) el.classList.add('limit-warn');
}
function updateCount(section, count) {
  const el = document.querySelector(`[data-count="${section}"]`);
  if (el) el.textContent = `${count} item${count === 1 ? '' : 's'}`;
}
function checkLimit(section) {
  const items = CACHE[section] || [];
  if (items.length >= MAX_ITEMS) {
    toast(`${section[0].toUpperCase() + section.slice(1)} is at the ${MAX_ITEMS}-item limit. Delete an item before adding a new one.`, 'error');
    return false;
  }
  return true;
}

/* ──────────────────────────────────────────────────────────────────
   FILTER OPTIONS (populate category dropdowns from data)
────────────────────────────────────────────────────────────────── */

function refreshFilterOptions(section, items, field = 'category') {
  const select = document.querySelector(`[data-filter="${section}"]`);
  if (!select || section === 'testimonials') {
    if (select && section === 'testimonials') return; // static options
    if (!select) return;
  }
  const current = select.value;
  const cats = [...new Set(items.map(i => i[field]).filter(Boolean))].sort();
  select.innerHTML = `<option value="">All categories</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (cats.includes(current)) select.value = current;
}

/* ──────────────────────────────────────────────────────────────────
   FILTER + SEARCH LOGIC
────────────────────────────────────────────────────────────────── */

function filterItems(section, items) {
  const f = FILTERS[section] || {};
  const q = (f.q || '').toLowerCase().trim();
  return items.filter(item => {
    if (q) {
      const haystack = Object.values(item).filter(v => typeof v === 'string').join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.cat) {
      if (section === 'testimonials') {
        if (String(item.rating) !== f.cat) return false;
      } else if ((item.category || '') !== f.cat) {
        return false;
      }
    }
    return true;
  });
}

/* ──────────────────────────────────────────────────────────────────
   SELECTION / BULK ACTIONS
────────────────────────────────────────────────────────────────── */

function updateBulkBar(section) {
  const bar = document.querySelector(`[data-bulk-bar="${section}"]`);
  const countEl = document.querySelector(`[data-bulk-count="${section}"]`);
  const n = SELECTED[section].size;
  if (countEl) countEl.textContent = n;
  if (bar) bar.hidden = n === 0;
}

function toggleSelect(section, id, checked) {
  if (checked) SELECTED[section].add(id); else SELECTED[section].delete(id);
  updateBulkBar(section);
}

async function bulkDelete(section) {
  const ids = [...SELECTED[section]];
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} selected item${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
  try {
    const data = await firestoreGet();
    const arr = (data[section] || []).filter(x => !ids.includes(x.id));
    await firestoreSet({ [section]: arr });
    CACHE[section] = arr;
    SELECTED[section].clear();
    renderSection(section);
    toast(`${ids.length} item${ids.length === 1 ? '' : 's'} deleted.`, 'success');
  } catch (e) {
    toast(`Bulk delete failed: ${e.message}`, 'error');
  }
}

/* ──────────────────────────────────────────────────────────────────
   DELETE SINGLE ITEM
────────────────────────────────────────────────────────────────── */

async function deleteItem(section, id, label) {
  if (!confirm(`Delete "${label || 'this item'}"?`)) return;
  try {
    const data = await firestoreGet();
    const arr = (data[section] || []).filter(x => x.id !== id);
    await firestoreSet({ [section]: arr });
    CACHE[section] = arr;
    SELECTED[section].delete(id);
    renderSection(section);
    toast('Item deleted.', 'success');
  } catch (e) {
    toast(`Delete failed: ${e.message}`, 'error');
  }
}

/* ──────────────────────────────────────────────────────────────────
   RENDER: PRODUCTS / TESTIMONIALS (row list)
────────────────────────────────────────────────────────────────── */

function renderProducts() {
  const all = CACHE.products || [];
  refreshFilterOptions('products', all, 'category');
  const items = filterItems('products', all);
  const list = document.querySelector('[data-product-list]');
  if (!list) return;
  list.innerHTML = items.length ? '' : '<p class="empty-state">No products found.</p>';
  items.forEach(p => list.appendChild(buildRow('products', p, {
    img: p.image, title: p.name, meta: [p.meta, p.category].filter(Boolean).join(' · ')
  })));
  updateCount('products', all.length);
  updateLimitBadge('products', all.length);
}

function renderGallery() {
  const all = CACHE.gallery || [];
  refreshFilterOptions('gallery', all, 'category');
  const items = filterItems('gallery', all);
  const list = document.querySelector('[data-gallery-list]');
  if (!list) return;
  list.innerHTML = items.length ? '' : '<p class="empty-state">No gallery items found.</p>';
  items.forEach(g => list.appendChild(buildGridItem('gallery', g, g.image, g.name)));
  updateCount('gallery', all.length);
  updateLimitBadge('gallery', all.length);
}

function renderTestimonials() {
  const all = CACHE.testimonials || [];
  const items = filterItems('testimonials', all);
  const list = document.querySelector('[data-testimonial-list]');
  if (!list) return;
  list.innerHTML = items.length ? '' : '<p class="empty-state">No testimonials found.</p>';
  items.forEach(t => list.appendChild(buildRow('testimonials', t, {
    img: t.photo || null,
    title: `"${(t.quote || '').slice(0, 60)}${(t.quote || '').length > 60 ? '…' : ''}"`,
    meta: `${t.author || ''}${t.role ? ' · ' + t.role : ''} ${'★'.repeat(Number(t.rating) || 5)}`
  })));
  updateCount('testimonials', all.length);
  updateLimitBadge('testimonials', all.length);
}

function renderInstagram() {
  const all = CACHE.instagram || [];
  const items = filterItems('instagram', all);
  const list = document.querySelector('[data-instagram-list]');
  if (!list) return;
  list.innerHTML = items.length ? '' : '<p class="empty-state">No Instagram tiles found.</p>';
  items.forEach(p => list.appendChild(buildGridItem('instagram', p, p.image, p.caption)));
  updateCount('instagram', all.length);
  updateLimitBadge('instagram', all.length);
}

function renderBlog() {
  const all = CACHE.blog || [];
  refreshFilterOptions('blog', all, 'category');
  const items = filterItems('blog', all);
  const list = document.querySelector('[data-blog-list]');
  if (!list) return;
  list.innerHTML = items.length ? '' : '<p class="empty-state">No blog posts found.</p>';
  items.forEach(b => list.appendChild(buildRow('blog', b, {
    img: b.image, title: b.title, meta: [b.category, fmtDate(b.createdAt)].filter(Boolean).join(' · ')
  })));
  updateCount('blog', all.length);
  updateLimitBadge('blog', all.length);
}

function renderEnquiries() {
  const all = CACHE.enquiries || [];
  const q = (FILTERS.enquiries?.q || '').toLowerCase().trim();
  const items = q
    ? all.filter(e => Object.values(e).filter(v => typeof v === 'string').join(' ').toLowerCase().includes(q))
    : all;
  const list = document.querySelector('[data-enquiry-list]');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<p class="empty-state">No enquiries found.</p>';
    updateCount('enquiries', all.length);
    return;
  }
  const sorted = [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  list.innerHTML = '';
  sorted.forEach(e => {
    const row = document.createElement('div');
    row.className = 'enquiry-row';
    const isNew = !e.read;
    row.innerHTML = `
      <div class="enq-head">
        <strong>${escapeHtml(e.name || 'Anonymous')}</strong>
        <span class="enq-badge${isNew ? ' new' : ''}">${isNew ? 'New' : 'Read'}</span>
        <span class="enq-date">${fmtDate(e.createdAt)}</span>
      </div>
      <p>${escapeHtml(e.email || '')}${e.phone ? ' · ' + escapeHtml(e.phone) : ''}</p>
      <p>${escapeHtml(e.message || '')}</p>`;
    list.appendChild(row);
  });
  updateCount('enquiries', all.length);
}

/** Dispatch render by section name. */
function renderSection(section) {
  switch (section) {
    case 'products':     return renderProducts();
    case 'gallery':      return renderGallery();
    case 'testimonials': return renderTestimonials();
    case 'instagram':    return renderInstagram();
    case 'blog':         return renderBlog();
    case 'enquiries':    return renderEnquiries();
  }
}
function renderAllSections() {
  SECTIONS.forEach(renderSection);
  renderEnquiries();
}

/* ──────────────────────────────────────────────────────────────────
   ROW / GRID BUILDERS (with checkbox, edit, delete)
────────────────────────────────────────────────────────────────── */

function buildRow(section, item, { img, title, meta }) {
  const row = document.createElement('div');
  row.className = `studio-row${img ? '' : ' studio-row-no-img'}${SELECTED[section].has(item.id) ? ' row-selected' : ''}`;
  row.dataset.id = item.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = SELECTED[section].has(item.id);
  checkbox.addEventListener('change', () => {
    toggleSelect(section, item.id, checkbox.checked);
    row.classList.toggle('row-selected', checkbox.checked);
  });
  row.appendChild(checkbox);

  if (img) {
    const image = document.createElement('img');
    image.src = img;
    image.alt = title || '';
    row.appendChild(image);
  }

  const metaDiv = document.createElement('div');
  metaDiv.className = 'row-meta';
  metaDiv.innerHTML = `<strong>${escapeHtml(title) || '—'}</strong><span>${escapeHtml(meta) || ''}</span>`;
  row.appendChild(metaDiv);

  const actions = document.createElement('div');
  actions.className = 'row-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.title = 'Edit';
  editBtn.type = 'button';
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', () => openEditModal(section, item));
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-icon danger';
  delBtn.title = 'Delete';
  delBtn.type = 'button';
  delBtn.textContent = '🗑️';
  delBtn.addEventListener('click', () => deleteItem(section, item.id, title));
  actions.appendChild(delBtn);

  row.appendChild(actions);
  return row;
}

function buildGridItem(section, item, img, label) {
  const cell = document.createElement('div');
  cell.className = `studio-grid-item${SELECTED[section].has(item.id) ? ' item-selected' : ''}`;
  cell.dataset.id = item.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'grid-item-check';
  checkbox.checked = SELECTED[section].has(item.id);
  checkbox.addEventListener('click', e => e.stopPropagation());
  checkbox.addEventListener('change', () => {
    toggleSelect(section, item.id, checkbox.checked);
    cell.classList.toggle('item-selected', checkbox.checked);
  });
  cell.appendChild(checkbox);

  const image = document.createElement('img');
  image.src = img || '';
  image.alt = label || '';
  cell.appendChild(image);

  const overlay = document.createElement('div');
  overlay.className = 'grid-item-overlay';
  overlay.innerHTML = `<span>${escapeHtml(label) || ''}</span>`;
  const actions = document.createElement('div');
  actions.className = 'row-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.title = 'Edit';
  editBtn.type = 'button';
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', () => openEditModal(section, item));
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-icon danger';
  delBtn.title = 'Delete';
  delBtn.type = 'button';
  delBtn.textContent = '🗑️';
  delBtn.addEventListener('click', () => deleteItem(section, item.id, label));
  actions.appendChild(delBtn);

  overlay.appendChild(actions);
  cell.appendChild(overlay);
  return cell;
}

/* ──────────────────────────────────────────────────────────────────
   EDIT MODAL  — reuses the original add-form markup for each section
────────────────────────────────────────────────────────────────── */

const FORM_SELECTOR = {
  products: '[data-product-form]',
  gallery: '[data-gallery-form]',
  testimonials: '[data-testimonial-form]',
  instagram: '[data-instagram-form]',
  blog: '[data-blog-form]',
};

function openEditModal(section, item) {
  const sourceForm = document.querySelector(FORM_SELECTOR[section]);
  if (!sourceForm) return;
  const modal = document.querySelector('[data-edit-modal]');
  const body = document.querySelector('[data-modal-body]');
  const title = document.querySelector('[data-modal-title]');
  title.textContent = `Edit ${section.charAt(0).toUpperCase() + section.slice(1)}`;

  // Clone the form for the modal
  const clone = sourceForm.cloneNode(true);
  clone.removeAttribute('data-product-form');
  clone.removeAttribute('data-gallery-form');
  clone.removeAttribute('data-testimonial-form');
  clone.removeAttribute('data-instagram-form');
  clone.removeAttribute('data-blog-form');
  clone.setAttribute('data-modal-form', section);
  clone.querySelectorAll('[data-cancel-edit]').forEach(b => b.remove());
  clone.querySelectorAll('.upload-filename').forEach(b => b.remove());

  // Populate fields
  Object.entries(item).forEach(([key, val]) => {
    const el = clone.querySelector(`[name="${key}"]`);
    if (el && el.type !== 'file' && val !== undefined && val !== null) el.value = val;
  });
  const editIdInput = clone.querySelector('[name="editId"]');
  if (editIdInput) editIdInput.value = item.id;

  // Show current image as preview
  clone.querySelectorAll('.img-preview').forEach(p => {
    const img = p.querySelector('img');
    const placeholder = p.querySelector('.preview-placeholder');
    const possibleKeys = ['image', 'photo'];
    const found = possibleKeys.map(k => item[k]).find(Boolean);
    if (found) {
      img.src = found;
      img.hidden = false;
      if (placeholder) placeholder.hidden = true;
    }
  });

  const submitBtn = clone.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Save Changes';

  body.innerHTML = '';
  body.appendChild(clone);
  modal.hidden = false;

  initUploadBoxes(); // re-wire drag-drop for cloned inputs

  clone.addEventListener('submit', async e => {
    e.preventDefault();
    await handleFormSubmit(section, clone, item.id);
    closeEditModal();
  });
}

function closeEditModal() {
  const modal = document.querySelector('[data-edit-modal]');
  const body = document.querySelector('[data-modal-body]');
  modal.hidden = true;
  body.innerHTML = '';
}

function initModalClose() {
  document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', closeEditModal));
  document.querySelector('[data-edit-modal]').addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) closeEditModal();
  });
}

/* ──────────────────────────────────────────────────────────────────
   GENERIC FORM SUBMIT HANDLER (used for both add and edit)
────────────────────────────────────────────────────────────────── */

const FIELD_MAP = {
  products: ['name', 'meta', 'description', 'category'],
  gallery: ['name', 'category', 'caption'],
  testimonials: ['quote', 'author', 'role', 'rating'],
  instagram: ['caption', 'url', 'tags'],
  blog: ['title', 'category', 'excerpt', 'content'],
};
const IMAGE_FIELD = {
  products: 'image', gallery: 'image', testimonials: 'photo', instagram: 'image', blog: 'image',
};

async function handleFormSubmit(section, form, editId) {
  const statusEl = form.querySelector('.form-status') || document.querySelector(`[data-${section.slice(0, -1)}-status]`);
  setStatus(statusEl, editId ? 'Saving changes…' : 'Adding…');

  if (!editId && !checkLimit(section)) {
    setStatus(statusEl, '');
    return;
  }

  try {
    const f = new FormData(form);
    const item = { id: editId || uid() };
    FIELD_MAP[section].forEach(key => { item[key] = f.get(key) || ''; });

    const imgField = IMAGE_FIELD[section];
    const fileInput = form.querySelector(`[name="${imgField === 'photo' ? 'photo' : 'image'}"]`);
    const file = fileInput?.files?.[0];
    if (file) {
      const maxMb = Number(form.querySelector('.upload-box')?.dataset.maxMb) || DEFAULT_MAX_MB;
      const err = validateFile(file, maxMb);
      if (err) { setStatus(statusEl, err, true); toast(err, 'error'); return; }
      item[imgField] = await uploadToCloudinary(file);
    } else if (editId) {
      // keep existing image if not replaced
      const existing = (CACHE[section] || []).find(x => x.id === editId);
      if (existing) item[imgField] = existing[imgField] || '';
    } else {
      item[imgField] = '';
    }

    if (section === 'blog' && !editId) item.createdAt = Date.now();

    const data = await firestoreGet();
    let arr = data[section] || [];
    if (editId) {
      arr = arr.map(x => x.id === editId ? { ...x, ...item } : x);
    } else {
      arr = [...arr, item];
    }
    await firestoreSet({ [section]: arr });
    CACHE[section] = arr;
    renderSection(section);

    if (!editId) {
      form.reset();
      resetUploadBox(form);
      const editIdInput = form.querySelector('[name="editId"]');
      if (editIdInput) editIdInput.value = '';
    }
    setStatus(statusEl, editId ? '✓ Changes saved.' : '✓ Added successfully.');
    toast(editId ? 'Changes saved.' : 'Item added.', 'success');
  } catch (err) {
    setStatus(statusEl, err.message, true);
    toast(err.message, 'error');
  }
}

/* ──────────────────────────────────────────────────────────────────
   INIT: ADD FORMS (products, gallery, testimonials, instagram, blog)
────────────────────────────────────────────────────────────────── */

function initSectionForm(section) {
  const form = document.querySelector(FORM_SELECTOR[section]);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const editId = form.querySelector('[name="editId"]')?.value || null;
    await handleFormSubmit(section, form, editId);
  });
  const cancelBtn = form.querySelector('[data-cancel-edit]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      form.reset();
      resetUploadBox(form);
      const editIdInput = form.querySelector('[name="editId"]');
      if (editIdInput) editIdInput.value = '';
      cancelBtn.hidden = true;
    });
  }
}

/* ──────────────────────────────────────────────────────────────────
   INIT: SEARCH / FILTER / SELECT-ALL / BULK DELETE
────────────────────────────────────────────────────────────────── */

function initListControls() {
  document.querySelectorAll('[data-search]').forEach(input => {
    const section = input.dataset.search;
    input.addEventListener('input', () => {
      if (!FILTERS[section]) FILTERS[section] = {};
      FILTERS[section].q = input.value;
      renderSection(section);
    });
  });

  document.querySelectorAll('[data-filter]').forEach(select => {
    const section = select.dataset.filter;
    select.addEventListener('change', () => {
      if (!FILTERS[section]) FILTERS[section] = {};
      FILTERS[section].cat = select.value;
      renderSection(section);
    });
  });

  document.querySelectorAll('[data-select-all]').forEach(checkbox => {
    const section = checkbox.dataset.selectAll;
    checkbox.addEventListener('change', () => {
      const items = filterItems(section, CACHE[section] || []);
      if (checkbox.checked) items.forEach(i => SELECTED[section].add(i.id));
      else SELECTED[section].clear();
      renderSection(section);
      updateBulkBar(section);
    });
  });

  document.querySelectorAll('[data-bulk-delete]').forEach(btn => {
    const section = btn.dataset.bulkDelete;
    btn.addEventListener('click', () => bulkDelete(section));
  });
}

/* ──────────────────────────────────────────────────────────────────
   HERO / ABOUT / CONTACT / SETTINGS  (single-document forms)
────────────────────────────────────────────────────────────────── */

function fillForm(selector, values) {
  const form = document.querySelector(selector);
  if (!form) return;
  Object.entries(values).forEach(([key, val]) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (el && val !== undefined && val !== null) el.value = val;
  });
}

function initHeroForm() {
  const form = document.querySelector('[data-content-form]');
  const status = document.querySelector('[data-content-status]');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      const fields = { heroEyebrow: f.get('heroEyebrow'), heroTitle: f.get('heroTitle'), heroText: f.get('heroText'), heroCta: f.get('heroCta') };
      const file = form.querySelector('[name="heroImage"]').files[0];
      if (file) {
        const maxMb = Number(form.querySelector('.upload-box')?.dataset.maxMb) || 8;
        const err = validateFile(file, maxMb);
        if (err) { setStatus(status, err, true); return; }
        fields.heroImage = await uploadToCloudinary(file);
      }
      await firestoreSet(fields);
      Object.assign(CACHE, fields);
      setStatus(status, '✓ Hero content saved.');
      toast('Hero content saved.', 'success');
    } catch (err) { setStatus(status, err.message, true); toast(err.message, 'error'); }
  });
}

function initAboutForm() {
  const form = document.querySelector('[data-about-form]');
  const status = document.querySelector('[data-about-status]');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      const fields = {
        aboutEyebrow: f.get('aboutEyebrow'), aboutTitle: f.get('aboutTitle'),
        aboutText1: f.get('aboutText1'), aboutText2: f.get('aboutText2'),
        features: f.get('features').split('\n').map(s => s.trim()).filter(Boolean),
      };
      const file = form.querySelector('[name="aboutImage"]').files[0];
      if (file) {
        const maxMb = Number(form.querySelector('.upload-box')?.dataset.maxMb) || 6;
        const err = validateFile(file, maxMb);
        if (err) { setStatus(status, err, true); return; }
        fields.aboutImage = await uploadToCloudinary(file);
      }
      await firestoreSet(fields);
      Object.assign(CACHE, fields);
      setStatus(status, '✓ About content saved.');
      toast('About content saved.', 'success');
    } catch (err) { setStatus(status, err.message, true); toast(err.message, 'error'); }
  });
}

function initContactSectionForm() {
  const form = document.querySelector('[data-contact-section-form]');
  const status = document.querySelector('[data-contact-section-status]');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      const fields = {
        contactEyebrow: f.get('contactEyebrow'), contactTitle: f.get('contactTitle'), contactIntro: f.get('contactIntro'),
        contactEmail: f.get('contactEmail'), contactPhone: f.get('contactPhone'), contactAddress: f.get('contactAddress'),
        mapEmbed: f.get('mapEmbed'),
      };
      const file = form.querySelector('[name="contactImage"]').files[0];
      if (file) {
        const maxMb = Number(form.querySelector('.upload-box')?.dataset.maxMb) || 6;
        const err = validateFile(file, maxMb);
        if (err) { setStatus(status, err, true); return; }
        fields.contactImage = await uploadToCloudinary(file);
      }
      await firestoreSet(fields);
      Object.assign(CACHE, fields);
      setStatus(status, '✓ Contact section saved.');
      toast('Contact section saved.', 'success');
    } catch (err) { setStatus(status, err.message, true); toast(err.message, 'error'); }
  });
}

function initSettingsForm() {
  const form = document.querySelector('[data-settings-form]');
  const status = document.querySelector('[data-settings-status]');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      const fields = {
        tagline: f.get('tagline'), email: f.get('email'), address: f.get('address'),
        whatsapp: f.get('whatsapp'), instagram: f.get('instagram'), facebook: f.get('facebook'),
        pinterest: f.get('pinterest'), copyright: f.get('copyright'),
      };
      await firestoreSet(fields);
      Object.assign(CACHE, fields);
      setStatus(status, '✓ Settings saved.');
      toast('Settings saved.', 'success');
    } catch (err) { setStatus(status, err.message, true); toast(err.message, 'error'); }
  });
}

/* ──────────────────────────────────────────────────────────────────
   ENQUIRIES SEARCH + CSV EXPORT
────────────────────────────────────────────────────────────────── */

function initEnquiryControls() {
  const search = document.querySelector('[data-search="enquiries"]');
  if (search) {
    search.addEventListener('input', () => {
      FILTERS.enquiries = { q: search.value };
      renderEnquiries();
    });
  }
  const btn = document.querySelector('[data-export-enquiries]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const enquiries = CACHE.enquiries || [];
    if (!enquiries.length) { toast('No enquiries to export.', 'error'); return; }
    const headers = ['Name', 'Email', 'Phone', 'Message', 'Date'];
    const rows = enquiries.map(e => [e.name || '', e.email || '', e.phone || '', `"${(e.message || '').replace(/"/g, '""')}"`, fmtDate(e.createdAt)]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `plava-enquiries-${Date.now()}.csv`;
    a.click();
  });
}

/* ──────────────────────────────────────────────────────────────────
   BACKUP & RESTORE
────────────────────────────────────────────────────────────────── */

function initBackup() {
  const exportBtn = document.querySelector('[data-export]');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const data = await firestoreGet();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `plava-backup-${Date.now()}.json`;
      a.click();
    });
  }
  const resetBtn = document.querySelector('[data-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('This will overwrite all content with boutique demo data. Download a backup first. Continue?')) return;
      try {
        if (window.SITE_DATA) {
          await firestoreSet(window.SITE_DATA);
          await loadAll();
          toast('Boutique defaults restored.', 'success');
        } else {
          toast('SITE_DATA not found. Make sure data.js is loaded.', 'error');
        }
      } catch (err) { toast(`Restore failed: ${err.message}`, 'error'); }
    });
  }
}

/* ──────────────────────────────────────────────────────────────────
   LOAD ALL DATA FROM FIRESTORE
────────────────────────────────────────────────────────────────── */

async function loadAll() {
  CACHE = await firestoreGet();
  SECTIONS.forEach(s => { if (!CACHE[s]) CACHE[s] = []; });
  if (!CACHE.enquiries) CACHE.enquiries = [];

  renderAllSections();

  fillForm('[data-content-form]', {
    heroEyebrow: CACHE.heroEyebrow, heroTitle: CACHE.heroTitle, heroText: CACHE.heroText, heroCta: CACHE.heroCta,
  });
  fillForm('[data-about-form]', {
    aboutEyebrow: CACHE.aboutEyebrow, aboutTitle: CACHE.aboutTitle, aboutText1: CACHE.aboutText1, aboutText2: CACHE.aboutText2,
    features: Array.isArray(CACHE.features) ? CACHE.features.join('\n') : (CACHE.features || ''),
  });
  fillForm('[data-contact-section-form]', {
    contactEyebrow: CACHE.contactEyebrow, contactTitle: CACHE.contactTitle, contactIntro: CACHE.contactIntro,
    contactEmail: CACHE.contactEmail || CACHE.email, contactPhone: CACHE.contactPhone || CACHE.whatsapp,
    contactAddress: CACHE.contactAddress || CACHE.address, mapEmbed: CACHE.mapEmbed,
  });
  fillForm('[data-settings-form]', {
    tagline: CACHE.tagline, email: CACHE.email, address: CACHE.address, whatsapp: CACHE.whatsapp,
    instagram: CACHE.instagram, facebook: CACHE.facebook, pinterest: CACHE.pinterest, copyright: CACHE.copyright,
  });
}

/* ──────────────────────────────────────────────────────────────────
   AUTH
────────────────────────────────────────────────────────────────── */

function initAuth() {
  const loginPanel  = document.querySelector('[data-login-panel]');
  const adminArea   = document.querySelector('[data-admin-area]');
  const loginForm   = document.querySelector('[data-login-form]');
  const loginStatus = document.querySelector('[data-login-status]');
  const logoutBtn   = document.querySelector('[data-logout]');
  const storageNote = document.querySelector('[data-storage-status]');

  if (storageNote) {
    const fbOk = !!(window.firebase && firebase.app);
    const cdnOk = !!(window.CLOUDINARY_CLOUD_NAME);
    storageNote.textContent = `Firebase: ${fbOk ? '✓ connected' : '✗ not configured'} · Cloudinary: ${cdnOk ? '✓ connected' : '✗ not configured'}`;
  }

  firebase.auth().onAuthStateChanged(async user => {
    if (user && user.email === ADMIN_EMAIL) {
      loginPanel.hidden = true;
      adminArea.hidden = false;
      await loadAll();
      initAllForms();
    } else {
      loginPanel.hidden = false;
      adminArea.hidden = true;
    }
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      setStatus(loginStatus, 'Signing in…');
      const email = loginForm.querySelector('[name="email"]').value.trim();
      const password = loginForm.querySelector('[name="password"]').value;
      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        setStatus(loginStatus, '');
      } catch (err) { setStatus(loginStatus, err.message, true); }
    });
  }
  if (logoutBtn) logoutBtn.addEventListener('click', async () => { await firebase.auth().signOut(); });
}

/* ──────────────────────────────────────────────────────────────────
   STUDIO NAV ACTIVE-LINK HIGHLIGHT
────────────────────────────────────────────────────────────────── */

function initStudioNav() {
  const navLinks = document.querySelectorAll('.studio-nav a');
  const panels = document.querySelectorAll('.studio-panel[id]');
  if (!panels.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.remove('active'));
        const link = document.querySelector(`.studio-nav a[href="#${entry.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.25 });
  panels.forEach(p => observer.observe(p));
}

/* ──────────────────────────────────────────────────────────────────
   INIT ALL (called once after login)
────────────────────────────────────────────────────────────────── */

function initAllForms() {
  SECTIONS.forEach(initSectionForm);
  initHeroForm();
  initAboutForm();
  initContactSectionForm();
  initSettingsForm();
  initEnquiryControls();
  initBackup();
  initListControls();
  initModalClose();
  initStudioNav();
}

/* ──────────────────────────────────────────────────────────────────
   BOOT
────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'admin') return;
  if (typeof firebase === 'undefined') {
    console.error('[admin.js] Firebase SDK not loaded. Check script order in admin.html.');
    return;
  }
  initUploadBoxes();
  initAuth();
});