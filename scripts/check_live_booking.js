(async () => {
  const r = await fetch('https://fxzioyr.id.vn/booking');
  const html = await r.text();
  console.log('Status:', r.status);
  console.log('Has pitch-type-selector:', html.includes('pitch-type-selector'));
  const m = html.match(/<script[^>]+booking\.js[^>]+>/i);
  console.log('Booking script tag:', m ? m[0] : 'not found');
})();
