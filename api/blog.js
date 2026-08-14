// Vercel serverless function — proxy na PTF backend pro výpis blogu.
// Volá se z js/ptf-blog.js jako /api/blog.
//
// Web běžel na GitHub Pages, kde se články načítaly přímo z prohlížeče.
// Po přesunu na Vercel se použije tahle proxy: dotaz odchází ze
// serveru, takže nezávisí na tom, jestli veřejné API pouští cizí původ,
// a odpověď se cachuje na hraně. js/ptf-blog.js si proxy najde sám —
// když tu není (GitHub Pages), volá API napřímo.

const BACKEND = process.env.PTF_BACKEND_URL || 'https://ptf-production.up.railway.app';
const WEB = 'odhad';

export default async function handler(req, res) {
  // HEAD taky: js/ptf-blog.js si jím ověřuje, jestli tady proxy vůbec
  // je (na GitHub Pages není a volá se pak PTF napřímo).
  if (req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const upstream = await fetch(`${BACKEND}/api/blog?web=${WEB}&limit=50`, {
      // Tenant natvrdo: blog žije pod ptf-reality bez ohledu na to,
      // co má web nastavené pro ostatní části PTF API.
      headers: { 'X-Tenant-Slug': 'ptf-reality', Accept: 'application/json' },
    });
    if (!upstream.ok) return res.status(502).json({ error: 'Backend nedostupný' });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json(await upstream.json());
  } catch (err) {
    console.error('Blog proxy error:', err?.message);
    return res.status(502).json({ error: 'Backend nedostupný' });
  }
}
