'use strict';
const output = document.querySelector('#results');
const button = document.querySelector('#run');
const routes = ['/', '/about', '/technology', '/products', '/projects', '/partnerships', '/contact', '/privacy'];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function assert(condition, message) { if (!condition) throw new Error(message); }
function navigate(frame, url) {
 return new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`Timeout loading ${url}`)), 10000);
  frame.onload = () => {
   clearTimeout(timeout);
   // Hidden test frames cannot participate in full-viewport transitions.
   // Disable that browser feature here, while retaining the site's real CSS.
   const style = frame.contentDocument.createElement('style');
   style.textContent = '@view-transition{navigation:none}';
   frame.contentDocument.head.append(style);
   resolve(frame.contentDocument);
  };
  frame.src = url;
 });
}
button.addEventListener('click', async () => {
 button.disabled = true;
 output.textContent = '';
 const frame = document.createElement('iframe');
 frame.className = 'test-frame'; frame.title = 'Website under test';
 document.querySelector('#frame-container').append(frame);
 const log = line => { output.textContent += `${line}\n`; };
 try {
  // Compile without running, so syntax errors cannot hide behind a static page.
  new Function(await (await fetch('/script.js')).text());
  log('PASS JavaScript syntax');
  for (const width of [390, 834, 1440]) {
   frame.style.width = `${width}px`;
   for (const route of routes) {
    const doc = await navigate(frame, route);
    await wait(450);
    assert(doc.querySelectorAll('h1').length === 1, `${route}: h1`);
    assert(doc.documentElement.scrollWidth <= frame.contentWindow.innerWidth + 1, `${route} at ${width}px: horizontal overflow (${doc.documentElement.scrollWidth}px)`);
    assert(doc.querySelector('title').textContent.includes('BCF Lanka'), `${route}: page title`);
    const active = doc.querySelector('#navigation [aria-current="page"]');
    const activePath = active ? new URL(active.href).pathname.replace(/\/$/, '') || '/' : '';
    assert(route === '/privacy' || activePath === route, `${route}: active navigation`);
    const sheets = [...doc.styleSheets].filter(sheet => /\/(styles|inner)\.css$/.test(sheet.href || ''));
    assert(sheets.length === 2 && sheets.every(sheet => sheet.cssRules.length > 0), `${route}: both stylesheets loaded and parsed`);
    assert(frame.contentWindow.getComputedStyle(doc.body).fontFamily.includes('Arial'), `${route}: approved body font`);
    assert(frame.contentWindow.getComputedStyle(doc.querySelector('.header')).display === 'flex', `${route}: header layout`);
    for (const img of doc.images) {
     if (img.complete) assert(img.naturalWidth > 0, `${route}: broken image ${img.src}`);
     assert(img.alt.trim(), `${route}: missing image description`);
    }
    if (width === 390) {
     const menu = doc.querySelector('.menu');
     menu.click();
     assert(menu.getAttribute('aria-expanded') === 'true', `${route}: mobile menu open`);
     assert(frame.contentWindow.getComputedStyle(doc.querySelector('#navigation')).display !== 'none', `${route}: mobile navigation visible`);
     doc.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
     assert(menu.getAttribute('aria-expanded') === 'false', `${route}: mobile menu Escape`);
    }
    log(`PASS ${width}px ${route}`);
   }
  }
  const contact = await navigate(frame, '/contact?topic=Pyrolysis%20oil');
  assert(contact.querySelector('#topic').value === 'Pyrolysis oil', 'Contact: CTA topic selection');
  const form = contact.querySelector('#enquiry-form');
  assert(!form.checkValidity(), 'Contact: empty form must be invalid');
  contact.querySelector('#name').value = 'Browser QA';
  contact.querySelector('#email').value = 'not-an-email';
  contact.querySelector('#message').value = 'Browser QA message. '.repeat(100);
  form.elements.consent.checked = true;
  assert(!form.checkValidity(), 'Contact: malformed email must be invalid');
  contact.querySelector('#email').value = 'qa@example.com';
  assert(form.checkValidity(), 'Contact: valid enquiry');
  // A long draft exercises the copy fallback without opening a mailto handler.
  form.requestSubmit();
  assert(!contact.querySelector('#email-fallback').hidden, 'Contact: visible copy fallback');
  const draft = contact.querySelector('#prepared-enquiry').value;
  assert(draft.includes('Browser QA') && draft.includes('qa@example.com') && draft.includes('Pyrolysis oil'), 'Contact: prepared draft fields');
  assert(contact.querySelector('#form-status').textContent.includes('Nothing has been sent'), 'Contact: no false delivery status');
  log('PASS contact topic, required fields, email validation and draft fallback');
  await navigate(frame, '/about');
  await new Promise((resolve, reject) => {
   const timeout = setTimeout(() => reject(new Error('Navigation timeout')), 10000);
   frame.onload = () => { clearTimeout(timeout); resolve(); };
   [...frame.contentDocument.querySelectorAll('#navigation a')].find(link => new URL(link.href).pathname.replace(/\/$/, '') === '/products').click();
  });
  assert(frame.contentWindow.location.pathname.replace(/\/$/, '') === '/products', 'Native page navigation');
  async function historyStep(direction, expected) {
   await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`History ${direction} timeout`)), 10000);
    frame.onload = () => { clearTimeout(timeout); resolve(); };
    frame.contentWindow.history[direction]();
   });
   assert(frame.contentWindow.location.pathname.replace(/\/$/, '') === expected, `History ${direction}`);
  }
  await historyStep('back', '/about');
  await historyStep('forward', '/products');
  log('PASS native page navigation, Back and Forward');
  assert((await fetch('/not-a-real-bcf-page')).status === 404, 'Unknown route must return 404');
  log('PASS unknown route 404\nAll browser checks passed.');
 } catch (error) { log(`FAIL ${error.message}`); }
 finally { frame.remove(); button.disabled = false; }
});
if (new URLSearchParams(location.search).has('autorun')) button.click();
