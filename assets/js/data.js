window.PLAVA_DEFAULTS = {
  brand: {
    name: "Plava",
    logo: "assets/images/plava-logo.jpg",
    instagram: "plava_in",
    whatsapp: "7358963118",
    email: "hello@plava.in",
    address: "Madurai boutique studio, Tamil Nadu, India",
    tagline: "Boutique sarees, dresses and occasionwear styled with quiet elegance.",
    seoDescription: "Plava is a boutique womenswear studio for sarees, dresses, kurti sets and occasionwear, with WhatsApp enquiries, Instagram updates and curated styling."
  },
  hero: {
    eyebrow: "Madurai boutique | Sarees, dresses and occasionwear",
    title: "Boutique Sarees & Dresses",
    text: "Elegant drapes, soft festive sets and ready-to-style pieces selected for modern celebrations, workdays and slow weekends.",
    image: "assets/images/hero-plava.svg"
  },
  features: [
    "Fresh saree, dress and kurti edits can be published from the admin studio.",
    "Cloudinary keeps uploaded product photos and files fast, shareable and deployment friendly.",
    "Firebase keeps admin login and website content protected behind the Plava owner account.",
    "Instagram and social tiles can be published manually from the content studio."
  ],
  banners: [
    {
      title: "New Season Boutique Edit",
      text: "Soft silks, graceful drapes and feminine occasionwear curated for intimate celebrations and everyday polish.",
      image: "assets/images/hero-plava.svg"
    }
  ],
  products: [
    { id: "saree-edit", name: "Signature Saree Edit", price: "From Rs. 2,499", image: "assets/images/collection-occasion.svg", description: "Flowing sarees with refined borders, subtle sheen and blouse styling support for festive days.", tags: ["Sarees", "Festive", "Drape styling"] },
    { id: "dress-edit", name: "Boutique Dress Edit", price: "From Rs. 1,899", image: "assets/images/collection-evening.svg", description: "Midi dresses and occasion silhouettes chosen for comfort, movement and understated charm.", tags: ["Dresses", "Occasion", "Easy fit"] },
    { id: "kurti-edit", name: "Kurti & Co-ord Sets", price: "From Rs. 1,499", image: "assets/images/collection-daywear.svg", description: "Soft cottons and dressy co-ords for office, brunch, gifting and repeat wear.", tags: ["Kurtis", "Co-ords", "Daily elegance"] }
  ],
  gallery: [
    { title: "Silk drape details", image: "assets/images/collection-occasion.svg", category: "Saree" },
    { title: "Evening dress edit", image: "assets/images/collection-evening.svg", category: "Dress" },
    { title: "Soft daywear rack", image: "assets/images/collection-daywear.svg", category: "Kurti" },
    { title: "Boutique styling corner", image: "assets/images/gallery-detail.svg", category: "Studio" }
  ],
  instagramUploads: [],
  testimonials: [
    { name: "Styling note", quote: "Choose one statement drape, one everyday set and one soft dress to build a wardrobe that moves between work and celebration.", city: "Plava Studio" },
    { name: "Fit note", quote: "Our edits focus on graceful movement, comfortable cuts and pieces that can be styled up or down.", city: "Plava Studio" },
    { name: "Care note", quote: "Delicate fabrics are selected with wearability in mind, so each piece feels special without feeling difficult.", city: "Plava Studio" }
  ],
  posts: [
    { title: "How to choose a saree for intimate celebrations", date: "2026-06-20", excerpt: "Look for graceful fall, a border that frames the drape and a blouse shade that lets the fabric breathe." },
    { title: "The boutique dress edit for warm evenings", date: "2026-06-12", excerpt: "Soft structure, breathable fabric and a single polished accessory can make an evening look feel effortless." }
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

