/* ══════════════════════════════════════════════════════════════════
   admin.js  —  Plava Content Studio
   Handles: Firebase auth · Cloudinary uploads · Firestore reads/writes
   for every admin panel section.
   ══════════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
────────────────────────────────────────────────────────────────── */

const FIRESTORE_DOC   = 'sites/plava';          // single-document data model
const ADMIN_EMAIL     = 'kowshikmahi1209@gmail.com';

/** Upload one File to Cloudinary; returns the secure URL string. */
async function uploadToCloudinary(file) {
  if (!window.CLOUDINARY_CLOUD_NAME || !window.CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Check cloudinary-config.js.');
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', window.CLOUDINARY_UPLOAD_PRESET);
  fd.append('folder', 'plava');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: fd }
  );
  if (!res.ok) throw new Error(`Cloudinary error ${res.status}`);
  const data = await res.json();
  return data.secure_url;
}

/** Read the Firestore document (returns plain object or {}). */
async function firestoreGet() {
  const snap = await firebase.firestore().doc(FIRESTORE_DOC).get();
  return snap.exists ? snap.data() : {};
}

/** Merge-write fields into the Firestore document. */
async function firestoreSet(fields) {
  await firebase.firestore().doc(FIRESTORE_DOC).set(fields, { merge: true });
}

/** Show a status message on a `[data-*-status]` element. */
function setStatus(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#e63946' : 'var(--jade)';
}

/** Generate a short random ID. */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Format a JS timestamp as a readable date string. */
function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ──────────────────────────────────────────────────────────────────
   RENDER HELPERS  — build DOM rows for each list
────────────────────────────────────────────────────────────────── */

/** Standard list row with optional image, title, meta and edit/delete. */
function makeRow({ id, img, title, meta, section, onDelete, onEdit }) {
  const row = document.createElement('div');
  row.className = `studio-row${img ? '' : ' studio-row-no-img'}`;
  row.dataset.id = id;

  if (img) {
    const image = document.createElement('img');
    image.src = img;
    image.alt = title || '';
    row.appendChild(image);
  }

  const meta_div = document.createElement('div');
  meta_div.className = 'row-meta';
  meta_div.innerHTML = `<strong>${title || '—'}</strong><span>${meta || ''}</span>`;
  row.appendChild(meta_div);

  const actions = document.createElement('div');
  actions.className = 'row-actions';

  if (onEdit) {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.title = 'Edit';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => onEdit(id));
    actions.appendChild(editBtn);
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-icon danger';
  delBtn.title = 'Delete';
  delBtn.textContent = '🗑️';
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Delete "${title}"?`)) return;
    await onDelete(id, section);
  });
  actions.appendChild(delBtn);
  row.appendChild(actions);

  return row;
}

/** Update the item count badge for a section. */
function updateCount(section, count) {
  const el = document.querySelector(`[data-count="${section}"]`);
  if (el) el.textContent = `${count} item${count === 1 ? '' : 's'}`;
}

/* ──────────────────────────────────────────────────────────────────
   DELETE ARRAY ITEM  — shared across Products, Gallery, Instagram, Testimonials
────────────────────────────────────────────────────────────────── */
async function deleteArrayItem(id, section) {
  try {
    const data = await firestoreGet();
    const arr = (data[section] || []).filter(x => x.id !== id);
    await firestoreSet({ [section]: arr });
    renderSection(section, arr);
  } catch (e) {
    alert(`Delete failed: ${e.message}`);
  }
}

/* ──────────────────────────────────────────────────────────────────
   RENDER EACH SECTION LIST
────────────────────────────────────────────────────────────────── */

function renderProducts(items = []) {
  const list = document.querySelector('[data-product-list]');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<p class="empty-state">No products yet. Add one above.</p>'; }
  items.forEach(p => {
    list.appendChild(makeRow({
      id: p.id, img: p.image, title: p.name,
      meta: [p.meta, p.category].filter(Boolean).join(' · '),
      section: 'products',
      onDelete: deleteArrayItem
    }));
  });
  updateCount('products', items.length);
}

function renderGallery(items = []) {
  const list = document.querySelector('[data-gallery-list]');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<p class="empty-state">No gallery items yet.</p>'; }
  items.forEach(g => {
    // Grid thumbnail style
    const cell = document.createElement('div');
    cell.className = 'studio-grid-item';
    cell.innerHTML = `
      <img src="${g.image || ''}" alt="${g.name || ''}">
      <div class="grid-item-overlay">
        <span>${g.name || ''}</span>
        <div class="row-actions">
          <button class="btn-icon danger" title="Delete" data-id="${g.id}">🗑️</button>
        </div>
      </div>`;
    cell.querySelector('.btn-icon.danger').addEventListener('click', async () => {
      if (!confirm(`Delete "${g.name}"?`)) return;
      await deleteArrayItem(g.id, 'gallery');
    });
    list.appendChild(cell);
  });
  updateCount('gallery', items.length);
}

function renderTestimonials(items = []) {
  const list = document.querySelector('[data-testimonial-list]');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<p class="empty-state">No testimonials yet.</p>'; }
  items.forEach(t => {
    list.appendChild(makeRow({
      id: t.id, img: t.photo || null,
      title: `"${(t.quote || '').slice(0, 60)}…"`,
      meta: `${t.author || ''}${t.role ? ' · ' + t.role : ''} ${'★'.repeat(Number(t.rating) || 5)}`,
      section: 'testimonials',
      onDelete: deleteArrayItem
    }));
  });
  updateCount('testimonials', items.length);
}

function renderInstagram(items = []) {
  const list = document.querySelector('[data-instagram-list]');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<p class="empty-state">No Instagram tiles yet.</p>'; }
  items.forEach(p => {
    const cell = document.createElement('div');
    cell.className = 'studio-grid-item';
    cell.innerHTML = `
      <img src="${p.image || ''}" alt="${p.caption || ''}">
      <div class="grid-item-overlay">
        <span>${p.caption || ''}</span>
        <div class="row-actions">
          <button class="btn-icon danger" title="Delete" data-id="${p.id}">🗑️</button>
        </div>
      </div>`;
    cell.querySelector('.btn-icon.danger').addEventListener('click', async () => {
      if (!confirm(`Delete this post?`)) return;
      await deleteArrayItem(p.id, 'instagram');
    });
    list.appendChild(cell);
  });
  updateCount('instagram', items.length);
}

function renderEnquiries(items = []) {
  const list = document.querySelector('[data-enquiry-list]');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = '<p class="empty-state">No enquiries yet. Messages from the contact form will appear here.</p>';
    updateCount('enquiries', 0);
    return;
  }
  // Most recent first
  const sorted = [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  sorted.forEach(e => {
    const row = document.createElement('div');
    row.className = 'enquiry-row';
    const isNew = !e.read;
    row.innerHTML = `
      <div class="enq-head">
        <strong>${e.name || 'Anonymous'}</strong>
        <span class="enq-badge${isNew ? ' new' : ''}">${isNew ? 'New' : 'Read'}</span>
        <span class="enq-date">${fmtDate(e.createdAt)}</span>
      </div>
      <p>${e.email || ''}${e.phone ? ' · ' + e.phone : ''}</p>
      <p>${e.message || ''}</p>`;
    list.appendChild(row);
  });
  updateCount('enquiries', items.length);
}

/** Dispatch to the right render function by section key. */
function renderSection(section, items) {
  switch (section) {
    case 'products':     return renderProducts(items);
    case 'gallery':      return renderGallery(items);
    case 'testimonials': return renderTestimonials(items);
    case 'instagram':    return renderInstagram(items);
    case 'enquiries':    return renderEnquiries(items);
  }
}

/* ──────────────────────────────────────────────────────────────────
   LOAD ALL DATA  — populate forms + lists from Firestore
────────────────────────────────────────────────────────────────── */

async function loadAll() {
  const data = await firestoreGet();

  // — Lists —
  renderProducts(data.products || []);
  renderGallery(data.gallery || []);
  renderTestimonials(data.testimonials || []);
  renderInstagram(data.instagram || []);
  renderEnquiries(data.enquiries || []);

  // — Hero form —
  fillForm('[data-content-form]', {
    heroEyebrow: data.heroEyebrow,
    heroTitle:   data.heroTitle,
    heroText:    data.heroText,
    heroCta:     data.heroCta,
  });

  // — About form —
  fillForm('[data-about-form]', {
    aboutEyebrow: data.aboutEyebrow,
    aboutTitle:   data.aboutTitle,
    aboutText1:   data.aboutText1,
    aboutText2:   data.aboutText2,
    features:     Array.isArray(data.features) ? data.features.join('\n') : (data.features || ''),
  });

  // — Contact section form —
  fillForm('[data-contact-section-form]', {
    contactEyebrow:  data.contactEyebrow,
    contactTitle:    data.contactTitle,
    contactIntro:    data.contactIntro,
    contactEmail:    data.contactEmail || data.email,
    contactPhone:    data.contactPhone || data.whatsapp,
    contactAddress:  data.contactAddress || data.address,
    mapEmbed:        data.mapEmbed,
  });

  // — Settings form —
  fillForm('[data-settings-form]', {
    tagline:   data.tagline,
    email:     data.email,
    address:   data.address,
    whatsapp:  data.whatsapp,
    instagram: data.instagram,
    facebook:  data.facebook,
    pinterest: data.pinterest,
    copyright: data.copyright,
  });
}

/** Populate named inputs/textareas inside a form selector. */
function fillForm(selector, values) {
  const form = document.querySelector(selector);
  if (!form) return;
  Object.entries(values).forEach(([key, val]) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (el && val !== undefined && val !== null) el.value = val;
  });
}

/* ──────────────────────────────────────────────────────────────────
   FORM: HERO
────────────────────────────────────────────────────────────────── */

function initHeroForm() {
  const form   = document.querySelector('[data-content-form]');
  const status = document.querySelector('[data-content-status]');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      const fields = {
        heroEyebrow: f.get('heroEyebrow'),
        heroTitle:   f.get('heroTitle'),
        heroText:    f.get('heroText'),
        heroCta:     f.get('heroCta'),
      };
      const imgFile = form.querySelector('[name="heroImage"]').files[0];
      if (imgFile) fields.heroImage = await uploadToCloudinary(imgFile);
      await firestoreSet(fields);
      setStatus(status, '✓ Hero content saved.');
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });
}

/* ──────────────────────────────────────────────────────────────────
   FORM: PRODUCTS
────────────────────────────────────────────────────────────────── */

function initProductForm() {
  const form   = document.querySelector('[data-product-form]');
  const status = document.querySelector('[data-product-status]');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Publishing…');
    try {
      const f = new FormData(form);
      const item = {
        id:          uid(),
        name:        f.get('name'),
        meta:        f.get('meta'),
        description: f.get('description'),
        category:    f.get('category'),
        image:       '',
      };
      const imgFile = form.querySelector('[name="image"]').files[0];
      if (imgFile) item.image = await uploadToCloudinary(imgFile);

      const data = await firestoreGet();
      const products = [...(data.products || []), item];
      await firestoreSet({ products });
      renderProducts(products);
      form.reset();
      resetPreviews(form);
      setStatus(status, '✓ Product added.');
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });
}

/* ──────────────────────────────────────────────────────────────────
   FORM: GALLERY
────────────────────────────────────────────────────────────────── */

function initGalleryForm() {
  const form   = document.querySelector('[data-gallery-form]');
  const status = document.querySelector('[data-gallery-status]');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Uploading…');
    try {
      const f = new FormData(form);
      const item = {
        id:       uid(),
        name:     f.get('name'),
        category: f.get('category'),
        caption:  f.get('caption'),
        image:    '',
      };
      const imgFile = form.querySelector('[name="image"]').files[0];
      if (imgFile) item.image = await uploadToCloudinary(imgFile);

      const data = await firestoreGet();
      const gallery = [...(data.gallery || []), item];
      await firestoreSet({ gallery });
      renderGallery(gallery);
      form.reset();
      resetPreviews(form);
      setStatus(status, '✓ Gallery item added.');
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });
}

/* ──────────────────────────────────────────────────────────────────
   FORM: TESTIMONIALS
────────────────────────────────────────────────────────────────── */

function initTestimonialForm() {
  const form   = document.querySelector('[data-testimonial-form]');
  const status = document.querySelector('[data-testimonial-status]');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      const item = {
        id:     uid(),
        quote:  f.get('quote'),
        author: f.get('author'),
        role:   f.get('role'),
        rating: f.get('rating'),
        photo:  '',
      };
      const photoFile = form.querySelector('[name="photo"]').files[0];
      if (photoFile) item.photo = await uploadToCloudinary(photoFile);

      const data = await firestoreGet();
      const testimonials = [...(data.testimonials || []), item];
      await firestoreSet({ testimonials });
      renderTestimonials(testimonials);
      form.reset();
      resetPreviews(form);
      setStatus(status, '✓ Testimonial added.');
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });
}

/* ──────────────────────────────────────────────────────────────────
   FORM: INSTAGRAM POSTS
────────────────────────────────────────────────────────────────── */

function initInstagramForm() {
  const form   = document.querySelector('[data-instagram-form]');
  const status = document.querySelector('[data-instagram-status]');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Uploading…');
    try {
      const f = new FormData(form);
      const item = {
        id:      uid(),
        caption: f.get('caption'),
        url:     f.get('url'),
        tags:    f.get('tags'),
        image:   '',
      };
      const imgFile = form.querySelector('[name="image"]').files[0];
      if (imgFile) item.image = await uploadToCloudinary(imgFile);

      const data = await firestoreGet();
      const instagram = [...(data.instagram || []), item];
      await firestoreSet({ instagram });
      renderInstagram(instagram);
      form.reset();
      resetPreviews(form);
      setStatus(status, '✓ Instagram post added.');
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });
}

/* ──────────────────────────────────────────────────────────────────
   FORM: ABOUT
────────────────────────────────────────────────────────────────── */

function initAboutForm() {
  const form   = document.querySelector('[data-about-form]');
  const status = document.querySelector('[data-about-status]');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      const fields = {
        aboutEyebrow: f.get('aboutEyebrow'),
        aboutTitle:   f.get('aboutTitle'),
        aboutText1:   f.get('aboutText1'),
        aboutText2:   f.get('aboutText2'),
        // Store features as array (split on newlines)
        features: f.get('features').split('\n').map(s => s.trim()).filter(Boolean),
      };
      const imgFile = form.querySelector('[name="aboutImage"]').files[0];
      if (imgFile) fields.aboutImage = await uploadToCloudinary(imgFile);
      await firestoreSet(fields);
      setStatus(status, '✓ About content saved.');
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });
}

/* ──────────────────────────────────────────────────────────────────
   FORM: CONTACT SECTION
────────────────────────────────────────────────────────────────── */

function initContactSectionForm() {
  const form   = document.querySelector('[data-contact-section-form]');
  const status = document.querySelector('[data-contact-section-status]');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      const fields = {
        contactEyebrow: f.get('contactEyebrow'),
        contactTitle:   f.get('contactTitle'),
        contactIntro:   f.get('contactIntro'),
        contactEmail:   f.get('contactEmail'),
        contactPhone:   f.get('contactPhone'),
        contactAddress: f.get('contactAddress'),
        mapEmbed:       f.get('mapEmbed'),
      };
      const imgFile = form.querySelector('[name="contactImage"]').files[0];
      if (imgFile) fields.contactImage = await uploadToCloudinary(imgFile);
      await firestoreSet(fields);
      setStatus(status, '✓ Contact section saved.');
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });
}

/* ──────────────────────────────────────────────────────────────────
   FORM: SITE SETTINGS
────────────────────────────────────────────────────────────────── */

function initSettingsForm() {
  const form   = document.querySelector('[data-settings-form]');
  const status = document.querySelector('[data-settings-status]');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus(status, 'Saving…');
    try {
      const f = new FormData(form);
      await firestoreSet({
        tagline:   f.get('tagline'),
        email:     f.get('email'),
        address:   f.get('address'),
        whatsapp:  f.get('whatsapp'),
        instagram: f.get('instagram'),
        facebook:  f.get('facebook'),
        pinterest: f.get('pinterest'),
        copyright: f.get('copyright'),
      });
      setStatus(status, '✓ Settings saved.');
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });
}

/* ──────────────────────────────────────────────────────────────────
   ENQUIRIES  — export CSV
────────────────────────────────────────────────────────────────── */

function initEnquiryExport() {
  const btn = document.querySelector('[data-export-enquiries]');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const data = await firestoreGet();
    const enquiries = data.enquiries || [];
    if (!enquiries.length) { alert('No enquiries to export.'); return; }
    const headers = ['Name', 'Email', 'Phone', 'Message', 'Date'];
    const rows = enquiries.map(e => [
      e.name || '', e.email || '', e.phone || '',
      `"${(e.message || '').replace(/"/g, '""')}"`,
      fmtDate(e.createdAt)
    ]);
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
  // Export JSON
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

  // Restore defaults
  const resetBtn = document.querySelector('[data-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('This will overwrite all content with boutique demo data. Download a backup first. Continue?')) return;
      try {
        // Pull defaults from data.js (SITE_DATA global)
        if (window.SITE_DATA) {
          await firestoreSet(window.SITE_DATA);
          await loadAll();
          alert('Boutique defaults restored.');
        } else {
          alert('SITE_DATA not found. Make sure data.js is loaded.');
        }
      } catch (err) {
        alert(`Restore failed: ${err.message}`);
      }
    });
  }
}

/* ──────────────────────────────────────────────────────────────────
   LOGIN / LOGOUT
────────────────────────────────────────────────────────────────── */

function initAuth() {
  const loginPanel  = document.querySelector('[data-login-panel]');
  const adminArea   = document.querySelector('[data-admin-area]');
  const loginForm   = document.querySelector('[data-login-form]');
  const loginStatus = document.querySelector('[data-login-status]');
  const logoutBtn   = document.querySelector('[data-logout]');
  const storageNote = document.querySelector('[data-storage-status]');

  // Show config status
  if (storageNote) {
    const fbOk  = !!(window.firebase && firebase.app);
    const cdnOk = !!(window.CLOUDINARY_CLOUD_NAME);
    storageNote.textContent =
      `Firebase: ${fbOk ? '✓ connected' : '✗ not configured'} · ` +
      `Cloudinary: ${cdnOk ? '✓ connected' : '✗ not configured'}`;
  }

  // Auth state
  firebase.auth().onAuthStateChanged(async user => {
    if (user && user.email === ADMIN_EMAIL) {
      loginPanel.hidden  = true;
      adminArea.hidden   = false;
      await loadAll();
      initAllForms();
    } else {
      loginPanel.hidden  = false;
      adminArea.hidden   = true;
    }
  });

  // Sign in
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      setStatus(loginStatus, 'Signing in…');
      const email    = loginForm.querySelector('[name="email"]').value.trim();
      const password = loginForm.querySelector('[name="password"]').value;
      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        setStatus(loginStatus, '');
      } catch (err) {
        setStatus(loginStatus, err.message, true);
      }
    });
  }

  // Sign out
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await firebase.auth().signOut();
    });
  }
}

/* ──────────────────────────────────────────────────────────────────
   RESET IMAGE PREVIEWS on a form
────────────────────────────────────────────────────────────────── */

function resetPreviews(form) {
  form.querySelectorAll('.img-preview img').forEach(img => {
    img.src = '';
    img.hidden = true;
  });
  form.querySelectorAll('.preview-placeholder').forEach(el => {
    el.hidden = false;
  });
}

/* ──────────────────────────────────────────────────────────────────
   INIT ALL FORMS (called once after login)
────────────────────────────────────────────────────────────────── */

function initAllForms() {
  initHeroForm();
  initProductForm();
  initGalleryForm();
  initTestimonialForm();
  initInstagramForm();
  initAboutForm();
  initContactSectionForm();
  initSettingsForm();
  initEnquiryExport();
  initBackup();
}

/* ──────────────────────────────────────────────────────────────────
   BOOT
────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Guard: only run on admin page
  if (document.body.dataset.page !== 'admin') return;

  // Wait for Firebase to be ready
  if (typeof firebase === 'undefined') {
    console.error('[admin.js] Firebase SDK not loaded. Check script order in admin.html.');
    return;
  }

  initAuth();
});