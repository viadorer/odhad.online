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

  /**
   * Kudy se ptát.
   *
   * Na Vercelu existuje /api/blog — dotaz jde přes server, nezávisle na
   * tom, jestli veřejné API pouští cizí původ, a odpověď se cachuje na
   * hraně. Na GitHub Pages, kde žádný server není, se volá PTF napřímo.
   * Zjistí se to jedním dotazem při prvním použití, takže přesun webu
   * mezi hostiteli nevyžaduje zásah do kódu.
   */
  var _proxy = null;
  function maProxy() {
    if (_proxy !== null) return Promise.resolve(_proxy);
    return fetch('/api/blog', { method: 'HEAD' })
      .then(function (r) {
        // GitHub Pages na neznámou cestu vrátí 404 (nebo HTML stránku).
        _proxy = r.ok;
        return _proxy;
      })
      .catch(function () { _proxy = false; return false; });
  }

  function nacti(cesta, primo) {
    return maProxy().then(function (jePorxy) {
      return jePorxy
        ? fetch(cesta)
        : fetch(API + primo, { headers: hlavicky() });
    }).then(function (r) {
      if (!r.ok) throw new Error('API ' + r.status);
      return r.json();
    });
  }

  /**
   * Záloha pro výpis: poslední známý blog/posts.json z repa.
   *
   * Výpis nemá jinou statickou verzi (karty se vykreslují až z dat), a
   * prázdný blog při výpadku API je horší než chvilku stará nabídka
   * článků. Detail zálohu nemá — tam je poctivější chybová hláška než
   * text, který už neplatí.
   */
  function zalohaSeznamu() {
    return fetch('/blog/posts.json')
      .then(function (r) { if (!r.ok) throw new Error('záloha ' + r.status); return r.json(); })
      .then(function (d) { return d.posts || []; });
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
      return nacti('/api/blog', '/api/blog?web=' + WEB + '&limit=50')
        .then(function (d) { return (d.data || []).map(naStary); })
        .catch(function (e) {
          console.warn('Články z PTF se nenačetly, beru zálohu:', e);
          return zalohaSeznamu();
        });
    },
    /** Detail — metadata ve starém tvaru + hotové HTML obsahu. */
    detail: function (slug) {
      return nacti(
        '/api/blog-post?slug=' + encodeURIComponent(slug),
        '/api/blog/' + encodeURIComponent(slug) + '?web=' + WEB)
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
