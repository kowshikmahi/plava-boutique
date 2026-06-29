# Plava Boutique Website

Reusable static website for Plava with:

- Mobile-first responsive multipage UI
- Anti-gravity animated landing hero
- Instagram profile logo and social links
- WhatsApp enquiry integration for `7358963118`
- Products, gallery, testimonials, blog, contact, privacy and terms pages
- Local admin panel for adding products/gallery images, changing settings, viewing enquiries and exporting content JSON
- SEO basics: page metadata, robots file and sitemap

## Run Locally

Open `index.html` directly in a browser, or serve the folder with any static server.

## Admin

Open `admin.html`. Changes are saved in the browser's `localStorage`, so it works without a backend for demos. For deployment, the same data shape in `assets/js/data.js` can be connected to Firebase, Supabase, Strapi, Sanity or a custom API.

## Deployment Notes

Before launch:

1. Replace `https://example.com` in `sitemap.xml` and `robots.txt` with the real domain.
2. Review `privacy-terms.html` with the final business policies.
3. Connect the contact form to email notifications through Formspree, Netlify Forms, EmailJS or a backend endpoint.
4. Add SSL through the hosting provider.
5. Replace placeholder collection illustrations with real shop photos through the admin panel or by editing `assets/js/data.js`.
