(function () {
  const page = document.body.dataset.page || "home";
  let data = window.PlavaData.merge();

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value || "";
    });
  }

  function getLinks() {
    const phone = data.brand.whatsapp.replace(/\D/g, "");
    return {
      phone,
      waBase: `https://wa.me/91${phone}`,
      instagramUrl: `https://www.instagram.com/${data.brand.instagram}/`
    };
  }

  function renderShell() {
    const { waBase, instagramUrl } = getLinks();
    const nav = document.querySelector("[data-nav]");
    if (nav) {
      const links = [
        ["index.html", "Home"],
        ["about.html", "About Us"],
        ["collections.html", "Products"],
        ["gallery.html", "Gallery"],
        ["testimonials.html", "Testimonials"],
        ["blog.html", "Blog"],
        ["contact.html", "Contact"],
        ["privacy-terms.html", "Privacy & Terms"]
      ];
      nav.innerHTML = `
        <a class="brand" href="index.html" aria-label="${data.brand.name} home"><span>${data.brand.name}</span></a>
        <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
        <div class="nav-links">
          ${links.map(([href, label]) => `<a href="${href}" ${location.pathname.endsWith(href) || (href === "index.html" && page === "home") ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
          <a class="admin-link" href="admin.html">Admin</a>
        </div>`;
      const toggle = nav.querySelector(".nav-toggle");
      const linksEl = nav.querySelector(".nav-links");
      toggle.addEventListener("click", () => {
        const open = linksEl.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    const footer = document.querySelector("[data-footer]");
    if (footer) {
      footer.innerHTML = `
        <div>
          <a class="brand footer-brand" href="index.html"><span>${data.brand.name}</span></a>
          <p>${data.brand.tagline}</p>
        </div>
        <div class="footer-grid">
          <a href="${instagramUrl}" target="_blank" rel="noopener">Instagram</a>
          <a href="${waBase}?text=Hi%20Plava%2C%20I%20would%20like%20to%20know%20more%20about%20your%20collections." target="_blank" rel="noopener">WhatsApp</a>
          <a href="contact.html">Enquiry</a>
          <a href="privacy-terms.html">Privacy & Terms</a>
        </div>`;
    }

    const floating = document.querySelector("[data-floating]");
    if (floating) {
      floating.innerHTML = `
        <a class="float-btn wa" href="${waBase}?text=Hi%20Plava%2C%20I%20saw%20your%20website%20and%20want%20to%20enquire." target="_blank" rel="noopener" aria-label="Chat on WhatsApp">WA</a>
        <a class="float-btn ig" href="${instagramUrl}" target="_blank" rel="noopener" aria-label="Open Instagram">IG</a>`;
    }
  }

  function renderHero() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const image = hero.querySelector(".hero-media img");
    if (image) image.src = data.hero.image || data.brand.logo;
    setText("[data-hero-eyebrow]", data.hero.eyebrow);
    setText("[data-hero-title]", data.hero.title);
    setText("[data-hero-text]", data.hero.text);
  }

  function renderProducts(limit) {
    const { waBase } = getLinks();
    document.querySelectorAll("[data-products]").forEach((wrap) => {
      const items = limit ? data.products.slice(0, limit) : data.products;
      wrap.innerHTML = items.map((item) => `
        <article class="product-card">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          <div>
            <p class="eyebrow">${item.price || "Price on request"}</p>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="chips">${(item.tags || []).map((tag) => `<span>${tag}</span>`).join("")}</div>
            <a class="text-link" href="${waBase}?text=${encodeURIComponent(`Hi Plava, I want to enquire about ${item.name}.`)}" target="_blank" rel="noopener">Enquire on WhatsApp</a>
          </div>
        </article>`).join("");
    });
  }

  function renderGallery(limit) {
    document.querySelectorAll("[data-gallery]").forEach((wrap) => {
      const items = limit ? data.gallery.slice(0, limit) : data.gallery;
      wrap.innerHTML = items.map((item) => `
        <figure class="gallery-item">
          <img src="${item.image}" alt="${item.title}" loading="lazy">
          <figcaption><span>${item.category || "Plava"}</span>${item.title}</figcaption>
        </figure>`).join("");
    });
  }

  function renderTestimonials() {
    document.querySelectorAll("[data-testimonials]").forEach((wrap) => {
      wrap.innerHTML = data.testimonials.map((item) => `
        <article class="quote-card">
          <p>"${item.quote}"</p>
          <strong>${item.name}</strong>
          <span>${item.city}</span>
        </article>`).join("");
    });
  }

  function renderPosts(limit) {
    document.querySelectorAll("[data-posts]").forEach((wrap) => {
      const items = limit ? data.posts.slice(0, limit) : data.posts;
      wrap.innerHTML = items.map((post) => `
        <article class="post-card">
          <time datetime="${post.date}">${new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time>
          <h3>${post.title}</h3>
          <p>${post.excerpt}</p>
        </article>`).join("");
    });
  }

  function renderInstagram() {
    const { instagramUrl } = getLinks();
    document.querySelectorAll("[data-instagram-feed]").forEach((wrap) => {
      const items = (data.instagramUploads && data.instagramUploads.length ? data.instagramUploads : data.gallery).slice(0, 8);
      wrap.innerHTML = items.map((item) => `
        <a class="insta-tile" href="${instagramUrl}" target="_blank" rel="noopener">
          <img src="${item.image}" alt="${item.title}" loading="lazy">
          <span>@${data.brand.instagram}</span>
        </a>`).join("");
    });
  }

  function renderFeatures() {
    document.querySelectorAll("[data-features]").forEach((wrap) => {
      wrap.innerHTML = (data.features || []).map((item) => `<li>${item}</li>`).join("");
    });
  }

  function bindContact() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const { waBase } = getLinks();
      const formData = new FormData(form);
      const enquiry = {
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        message: formData.get("message"),
        date: new Date().toISOString()
      };
      data.enquiries = [enquiry, ...(data.enquiries || [])];
      await window.PlavaStore.save(data);
      const text = `Hi Plava, I am ${enquiry.name}. ${enquiry.message} Phone: ${enquiry.phone} Email: ${enquiry.email}`;
      window.open(`${waBase}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      form.reset();
      const status = document.querySelector("[data-form-status]");
      if (status) status.textContent = "Enquiry saved and WhatsApp opened.";
    });
  }

  async function init() {
    data = await window.PlavaStore.load();
    document.title = document.title.replace("Plava", data.brand.name);
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", data.brand.seoDescription);
    renderShell();
    renderHero();
    renderFeatures();
    const { phone } = getLinks();
    setText("[data-brand-name]", data.brand.name);
    setText("[data-brand-tagline]", data.brand.tagline);
    setText("[data-brand-email]", data.brand.email);
    setText("[data-brand-phone]", `+91 ${phone}`);
    setText("[data-brand-address]", data.brand.address);
    renderProducts(page === "home" ? 3 : undefined);
    renderGallery(page === "home" ? 4 : undefined);
    renderTestimonials();
    renderPosts(page === "home" ? 2 : undefined);
    renderInstagram();
    bindContact();
    document.dispatchEvent(new CustomEvent("plava:data-ready", { detail: data }));
  }

  window.PlavaSite = { getData: () => data, renderAll: init };
  init();
})();
