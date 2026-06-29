window.PLAVA_DEFAULTS = {
  brand: {
    name: "Plava",
    logo: "assets/images/plava-logo.jpg",
    instagram: "plava_in",
    whatsapp: "7358963118",
    email: "hello@plava.in",
    address: "Boutique studio, Tamil Nadu, India",
    tagline: "Anti-gravity elegance for modern womenswear.",
    seoDescription: "Plava is a boutique womenswear shop for daywear, occasionwear and curated collections with WhatsApp enquiries and Instagram updates."
  },
  hero: {
    eyebrow: "@plava_in · Madurai boutique",
    title: "Plava",
    text: "Anti-gravity elegance for modern womenswear.",
    image: "assets/images/hero-plava.svg"
  },
  features: [
    "Floating WhatsApp chat for instant product and size questions.",
    "Instagram uploads projected on the website through editable admin tiles.",
    "SEO-ready page structure, metadata, sitemap and responsive images.",
    "Admin panel for products, photos, content and customer enquiries."
  ],
  banners: [
    {
      title: "New Season Edit",
      text: "Soft tailoring, graceful drapes and boutique-ready silhouettes curated for everyday occasion dressing.",
      image: "assets/images/hero-plava.svg"
    }
  ],
  products: [
    { id: "daywear", name: "Daywear Edit", price: "From Rs. 1,499", image: "assets/images/collection-daywear.svg", description: "Breathable pieces for work, brunch and daily movement.", tags: ["Cotton blends", "Pastels", "Ready to style"] },
    { id: "evening", name: "Evening Poise", price: "From Rs. 2,999", image: "assets/images/collection-evening.svg", description: "Elegant silhouettes for celebrations, dinners and festive evenings.", tags: ["Draped", "Statement", "Limited"] },
    { id: "occasion", name: "Occasion Bloom", price: "From Rs. 3,499", image: "assets/images/collection-occasion.svg", description: "Polished boutique looks for events, gifting and special days.", tags: ["Festive", "Custom fit", "Premium"] }
  ],
  gallery: [
    { title: "Studio Rack", image: "assets/images/gallery-detail.svg", category: "Shop" },
    { title: "Daywear Edit", image: "assets/images/collection-daywear.svg", category: "Collection" },
    { title: "Evening Poise", image: "assets/images/collection-evening.svg", category: "Collection" },
    { title: "Occasion Bloom", image: "assets/images/collection-occasion.svg", category: "Collection" }
  ],
  instagramUploads: [],
  testimonials: [
    { name: "Aaradhya", quote: "The collection feels premium without being loud. The WhatsApp ordering flow was quick and personal.", city: "Chennai" },
    { name: "Meera", quote: "Loved the fit suggestions and the way the team helped me pick an occasion look.", city: "Coimbatore" },
    { name: "Nisha", quote: "Plava has a soft, elegant style that works beautifully for office and events.", city: "Bengaluru" }
  ],
  posts: [
    { title: "How to build a capsule occasion wardrobe", date: "2026-06-20", excerpt: "Start with one polished neutral, one soft statement piece and accessories that can move between day and evening." },
    { title: "New arrivals now available on WhatsApp", date: "2026-06-12", excerpt: "Send a screenshot from the gallery and the team will share size, fabric and availability details." }
  ],
  enquiries: []
};

window.PlavaData = {
  merge(saved) {
    const defaults = structuredClone(window.PLAVA_DEFAULTS);
    const parsed = saved || {};
    return {
      ...defaults,
      ...parsed,
      brand: { ...defaults.brand, ...(parsed.brand || {}) },
      hero: { ...defaults.hero, ...(parsed.hero || {}) },
      features: parsed.features || defaults.features,
      products: parsed.products || defaults.products,
      gallery: parsed.gallery || defaults.gallery,
      instagramUploads: parsed.instagramUploads || [],
      testimonials: parsed.testimonials || defaults.testimonials,
      posts: parsed.posts || defaults.posts,
      enquiries: parsed.enquiries || []
    };
  }
};

window.PlavaStore = {
  key: "plava-site-data-v1",
  async load() {
    const saved = localStorage.getItem(this.key);
    if (!saved) return window.PlavaData.merge();
    try {
      return window.PlavaData.merge(JSON.parse(saved));
    } catch {
      return window.PlavaData.merge();
    }
  },
  async save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },
  async reset() {
    localStorage.removeItem(this.key);
  }
};
