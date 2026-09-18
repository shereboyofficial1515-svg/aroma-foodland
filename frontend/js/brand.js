// Aroma FoodLand — centralized brand configuration.
//
// This is the ONE place the logo is configured for the entire frontend.
// To replace the logo across the whole site (header, footer, admin
// dashboard, favicon), you have two options:
//
//   1. Simplest: replace the file at frontend/assets/logo.svg with your
//      real artwork, keeping the same filename. Nothing else needs to change.
//   2. Or: point AROMA_BRAND.logoUrl below at a different file/URL.
//
// If the image ever fails to load for any reason, every usage falls back
// to a small styled "AF" monogram automatically (see renderBrandMark), so
// the site never shows a broken image icon.

const AROMA_BRAND = {
    name: 'Aroma FoodLand',
    logoUrl: 'assets/logo.svg',
    faviconUrl: 'assets/logo.svg',
    markInitials: 'AF',
};

// Renders the logo mark as an <img>, wired with an onerror fallback to the
// text-based monogram so a missing/broken logo file never shows a broken
// image icon to a visitor.
function renderBrandMark({ size = 40 } = {}) {
    return `<img src="${AROMA_BRAND.logoUrl}" alt="${AROMA_BRAND.name} logo" class="brand-mark" width="${size}" height="${size}"
    onerror="this.outerHTML='<span class=&quot;brand-mark&quot;>${AROMA_BRAND.markInitials}</span>'" />`;
}

window.AROMA_BRAND = AROMA_BRAND;
window.renderBrandMark = renderBrandMark;