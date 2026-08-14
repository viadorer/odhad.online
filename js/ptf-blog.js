/**
 * Články z PTF (administrace ptf.cz).
 *
 * Web běží na GitHub Pages, kde není server, který by dotaz přeposlal —
 * čte se tedy přímo z prohlížeče. Veřejné blogové API to povoluje
 * (publikovaný obsah bez přihlášení). Odpověď se převádí PŘESNĚ na tvar
 * původního posts.json, takže vykreslování výpisu i detailu zůstalo
 * beze změny a vzhled je 1:1.
 *
 * Úprava článku v administraci se tu projeví hned po načtení stránky.
 */
window.PTF_BLOG = (function () {
  var API = 'https://ptf-production.up.railway.app';
  var TENANT = 'ptf-reality';
  var WEB = 'odhad';

  // Klíče kategorií pro barevné štítky ve výpisu. Sdílené články
  // (křížené z ostatních webů) mají kategorie mimo tenhle seznam a
  // dostanou 'default' — šedý štítek místo barevného.
  var KATEGORIE = {
    'průvodce': 'guide',
    'tipy & triky': 'tips',
    'tipy a triky': 'tips',
    'právní rady': 'legal',
    'trh & finance': 'market',
    'trh a finance': 'market',
  };

  function hlavicky() {
    return { 'X-Tenant-Slug': TENANT, 'Accept': 'application/json' };
  }

  function naStary(p) {
    var datum = (p.publishedAt || p.createdAt || '').slice(0, 10);
    var nazev = (p.category && p.category.name) || '';
    return {
      id: p.slug,
      title: p.title,
      excerpt: p.excerpt || '',
      category: KATEGORIE[nazev.toLowerCase()] || 'default',
      categoryName: nazev,
      image: p.featuredImageUrl || '/images/blog/blog-og-image.jpg',
      imageAlt: p.featuredImageAlt || p.title,
      date: datum,
      dateFormatted: datum
        ? new Date(datum).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
        : '',
      readTime: p.readingTimeMinutes || null,
    };
  }

  return {
    /** Výpis — pole ve tvaru původního posts.json. */
    seznam: function () {
      return fetch(API + '/api/blog?web=' + WEB + '&limit=50', { headers: hlavicky() })
        .then(function (r) { if (!r.ok) throw new Error('API ' + r.status); return r.json(); })
        .then(function (d) { return (d.data || []).map(naStary); });
    },
    /** Detail — metadata ve starém tvaru + hotové HTML obsahu. */
    detail: function (slug) {
      return fetch(API + '/api/blog/' + encodeURIComponent(slug) + '?web=' + WEB, { headers: hlavicky() })
        .then(function (r) { if (!r.ok) throw new Error('API ' + r.status); return r.json(); })
        .then(function (d) {
          var m = naStary(d);
          m.content = d.content || '';
          m.canonicalUrl = d.canonicalUrl || null;
          m.metaTitle = d.metaTitle || d.title;
          m.metaDescription = d.metaDescription || d.excerpt || '';
          return m;
        });
    },
  };
})();
