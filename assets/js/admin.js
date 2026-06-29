(function () {
  let data = window.PlavaData.merge();

  const loginPanel = document.querySelector("[data-login-panel]");
  const adminArea = document.querySelector("[data-admin-area]");
  const loginForm = document.querySelector("[data-login-form]");
  const loginStatus = document.querySelector("[data-login-status]");
  const settingsForm = document.querySelector("[data-settings-form]");
  const contentForm = document.querySelector("[data-content-form]");
  const adminForm = document.querySelector("[data-admin-form]");
  const storageStatus = document.querySelector("[data-storage-status]");

  function firebaseEnabled() {
    return Boolean(window.PlavaFirebase && window.PlavaFirebase.enabled);
  }

  function cloudinaryEnabled() {
    const cfg = window.PLAVA_CLOUDINARY || {};
    return Boolean(cfg.cloudName && cfg.uploadPreset && !String(cfg.cloudName).startsWith("PASTE_") && !String(cfg.uploadPreset).startsWith("PASTE_"));
  }

  function isAuthed() {
    return firebaseEnabled() && Boolean(window.PlavaFirebase.auth.currentUser);
  }

  function setAuthView() {
    const authed = isAuthed();
    if (loginPanel) loginPanel.hidden = authed;
    if (adminArea) adminArea.hidden = !authed;
    if (storageStatus) {
      const firebaseText = firebaseEnabled() ? "Firebase admin login is configured." : "Firebase is not configured yet. Paste your Firebase web config before admin login will work.";
      const cloudinaryText = cloudinaryEnabled() ? "Cloudinary uploads are configured." : "Cloudinary is not configured yet. Paste your cloud name and unsigned upload preset before uploads will work.";
      storageStatus.textContent = `${firebaseText} ${cloudinaryText}`;
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadToCloudinary(file) {
    const cfg = window.PLAVA_CLOUDINARY || {};
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", cfg.uploadPreset);
    if (cfg.folder) body.append("folder", cfg.folder);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/auto/upload`, {
      method: "POST",
      body
    });
    if (!response.ok) throw new Error(`Cloudinary upload failed: ${response.status}`);
    const uploaded = await response.json();
    return uploaded.secure_url;
  }

  async function uploadFile(file) {
    if (!file || !file.size) return "";
    if (!cloudinaryEnabled()) throw new Error("Cloudinary is not configured. Add cloudName and unsigned uploadPreset in assets/js/cloudinary-config.js.");
    return uploadToCloudinary(file);
  }

  async function saveData(statusNode, message) {
    await window.PlavaStore.save(data);
    if (statusNode) statusNode.textContent = message;
  }

  function renderLists() {
    const productList = document.querySelector("[data-product-list]");
    if (productList) {
      productList.innerHTML = data.products.map((item, index) => `
        <div class="admin-row">
          <img src="${item.image}" alt="">
          <strong>${item.name}</strong>
          <span>${item.price}</span>
          <button class="btn secondary" type="button" data-delete-product="${index}">Delete</button>
        </div>`).join("");
    }
    const instagramList = document.querySelector("[data-instagram-list]");
    if (instagramList) {
      const items = data.instagramUploads || [];
      instagramList.innerHTML = items.length ? items.map((item, index) => `
        <div class="admin-row">
          <img src="${item.image}" alt="">
          <strong>${item.title}</strong>
          <span>${item.fileUrl ? "File upload" : "Instagram upload"}</span>
          <button class="btn secondary" type="button" data-delete-instagram="${index}">Delete</button>
        </div>`).join("") : "<p>No Instagram uploads yet.</p>";
    }
    const enquiryList = document.querySelector("[data-enquiry-list]");
    if (enquiryList) {
      enquiryList.innerHTML = (data.enquiries || []).length ? data.enquiries.map((item) => `
        <div class="admin-row">
          <strong>${item.name}</strong>
          <span>${item.phone} · ${item.email}</span>
          <p>${item.message}</p>
        </div>`).join("") : "<p>No enquiries yet.</p>";
    }
  }

  function fillForms() {
    if (settingsForm) {
      settingsForm.tagline.value = data.brand.tagline;
      settingsForm.email.value = data.brand.email;
      settingsForm.address.value = data.brand.address;
      settingsForm.whatsapp.value = data.brand.whatsapp;
      settingsForm.instagram.value = data.brand.instagram;
    }
    if (contentForm) {
      contentForm.heroEyebrow.value = data.hero.eyebrow;
      contentForm.heroTitle.value = data.hero.title;
      contentForm.heroText.value = data.hero.text;
      contentForm.features.value = (data.features || []).join("\n");
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(loginForm);
      loginStatus.textContent = "Signing in...";
      try {
        if (!firebaseEnabled()) throw new Error("Firebase is not configured. Add your Firebase web config first.");
        const credential = await window.PlavaFirebase.signIn(fd.get("email"), fd.get("password"));
        if (credential.user.email !== window.PlavaFirebase.adminEmail) {
          await window.PlavaFirebase.signOut();
          throw new Error("This Firebase account is not allowed to manage Plava.");
        }
        loginForm.reset();
        loginStatus.textContent = "";
        data = await window.PlavaStore.load();
        fillForms();
        renderLists();
        setAuthView();
      } catch (error) {
        loginStatus.textContent = error.message || "Invalid admin email or password.";
      }
    });
  }

  if (settingsForm) {
    settingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(settingsForm);
      data.brand = { ...data.brand, ...Object.fromEntries(fd.entries()) };
      await saveData(null, "");
      location.reload();
    });
  }

  if (contentForm) {
    contentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fd = new FormData(contentForm);
      const heroFile = fd.get("heroImage");
      const uploadedHero = heroFile && heroFile.size ? await uploadFile(heroFile) : data.hero.image;
      data.hero = {
        ...data.hero,
        eyebrow: fd.get("heroEyebrow"),
        title: fd.get("heroTitle"),
        text: fd.get("heroText"),
        image: uploadedHero
      };
      data.features = String(fd.get("features") || "").split("\n").map((item) => item.trim()).filter(Boolean);
      await saveData(document.querySelector("[data-content-status]"), "Content saved to Firebase.");
    });
  }

  if (adminForm) {
    adminForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = document.querySelector("[data-admin-status]");
      status.textContent = "Uploading...";
      const fd = new FormData(adminForm);
      const type = fd.get("type");
      const file = fd.get("image");
      const uploadedUrl = file && file.size ? await uploadFile(file) : "assets/images/gallery-detail.svg";
      if (type === "products") {
        data.products.unshift({
          id: crypto.randomUUID(),
          name: fd.get("name"),
          price: fd.get("meta") || "Price on request",
          image: uploadedUrl,
          description: fd.get("description") || "New boutique collection item.",
          tags: ["New", "Boutique", "Plava"]
        });
      } else if (type === "instagram") {
        data.instagramUploads.unshift({
          title: fd.get("name") || "Instagram upload",
          image: uploadedUrl,
          fileUrl: uploadedUrl
        });
      } else {
        data.gallery.unshift({
          title: fd.get("name"),
          category: fd.get("meta") || "Gallery",
          image: uploadedUrl
        });
      }
      await saveData(status, "Saved to Firebase. Public pages will load the update automatically.");
      adminForm.reset();
      renderLists();
    });
  }

  document.addEventListener("click", async (event) => {
    const deleteIndex = event.target.dataset.deleteProduct;
    if (deleteIndex !== undefined) {
      data.products.splice(Number(deleteIndex), 1);
      await window.PlavaStore.save(data);
      renderLists();
    }
    const deleteInstagram = event.target.dataset.deleteInstagram;
    if (deleteInstagram !== undefined) {
      data.instagramUploads.splice(Number(deleteInstagram), 1);
      await window.PlavaStore.save(data);
      renderLists();
    }
    if (event.target.matches("[data-logout]")) {
      if (firebaseEnabled()) await window.PlavaFirebase.signOut();
      setAuthView();
    }
    if (event.target.matches("[data-export]")) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plava-content-backup.json";
      a.click();
      URL.revokeObjectURL(url);
    }
    if (event.target.matches("[data-reset]")) {
      await window.PlavaStore.reset();
      location.reload();
    }
  });

  async function init() {
    data = window.PlavaSite ? window.PlavaSite.getData() : await window.PlavaStore.load();
    fillForms();
    renderLists();
    if (firebaseEnabled()) {
      window.PlavaFirebase.onAuthChanged(async () => {
        data = await window.PlavaStore.load();
        fillForms();
        renderLists();
        setAuthView();
      });
    }
    setAuthView();
  }

  document.addEventListener("plava:data-ready", (event) => {
    data = event.detail;
    fillForms();
    renderLists();
    setAuthView();
  });

  init();
})();


