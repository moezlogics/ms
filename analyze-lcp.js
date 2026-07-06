const fs = require('fs');
function analyze(file, label) {
  const html = fs.readFileSync(file, 'utf8');
  console.log('\n===', label, '===');
  console.log('HTML size:', html.length, 'bytes (', (html.length/1024).toFixed(0), 'KB)');
  const preloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/gi)];
  console.log('preloads:', preloads.length);
  preloads.forEach(p => console.log(' ', p[0].slice(0, 200)));
  const scripts = (html.match(/<script/g) || []).length;
  const styles = (html.match(/<style/g) || []).length;
  const flight = (html.match(/__next_f\.push/g) || []).length;
  console.log('scripts:', scripts, '| inline styles:', styles, '| flight chunks:', flight);
  const imgs = [...html.matchAll(/<img[^>]+>/gi)].slice(0, 8);
  console.log('first img tags:');
  imgs.forEach((m,i) => {
    const src = (m[0].match(/src="([^"]+)"/)||[])[1]||'?';
    const pri = m[0].includes('priority') || m[0].includes('fetchpriority');
    const loading = (m[0].match(/loading="([^"]+)"/)||[])[1]||'default';
    console.log(' ', i+1, loading, pri?'PRIORITY':'', src.slice(0, 100));
  });
  const adsense = html.includes('adsbygoogle') || html.includes('googlesyndication');
  console.log('adsense in HTML:', adsense);
  const adsScripts = [...html.matchAll(/googlesyndication[^"']*/g)].map(m=>m[0]);
  console.log('ads scripts:', adsScripts.length, adsScripts.slice(0,3));
  const lcpCand = html.match(/cdn\.mobilestore\.pk[^"\\ ]*samsung[^"\\ ]*/i) || html.match(/cdn[^"\\ ]*\.webp/i);
  if (lcpCand) console.log('likely LCP asset snippet:', lcpCand[0].slice(0, 120));
}
analyze('ms-pdp.html', 'mobilestore PDP');
analyze('zm-home.html', 'zmobiles home');
