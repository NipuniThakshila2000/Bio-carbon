'use strict';
// Directory URLs stay clean over HTTP; direct file previews need index.html.
if (window.location.protocol === 'file:') {
 document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (href.startsWith('#')) return;
  const url = new URL(href, document.baseURI);
  if (url.protocol === 'file:' && url.pathname.endsWith('/')) {
   url.pathname += 'index.html';
   link.href = url.href;
  }
 });
}
// Native document links retain browser history and work without JavaScript.
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#navigation');
if (menu && navigation) {
 const closeMenu = () => { navigation.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); };
 menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  navigation.classList.toggle('open', expanded);
 });
 navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
 document.addEventListener('keydown', event => { if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); menu.focus(); } });
 document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
 window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
 window.addEventListener('pageshow', closeMenu);
}
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
// Keep the shared contact CTA in place while making repeat visits from the
// Contact page feel like an in-page action instead of a full reload.
document.querySelectorAll('a.header-cta[href*="/contact/"]').forEach(link => {
 const target = new URL(link.href, window.location.href);
 if (target.pathname.replace(/\/$/, '') !== window.location.pathname.replace(/\/$/, '')) return;
 link.addEventListener('click', event => {
  const form = document.querySelector('#enquiry-form');
  if (!form) return;
  event.preventDefault();
  history.replaceState(null, '', `${target.pathname}${target.hash}`);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
 });
});
(() => {
 const cards = [...document.querySelectorAll('.impact-card')];
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 if (!cards.length || reducedMotion.matches || !('IntersectionObserver' in window)) return;
 const observer = new IntersectionObserver(entries => {
  entries.filter(entry => entry.isIntersecting)
   .sort((a, b) => cards.indexOf(a.target) - cards.indexOf(b.target))
   .forEach((entry, index) => {
    entry.target.style.setProperty('--impact-delay', `${index * 120}ms`);
    entry.target.classList.add('impact-reveal');
    observer.unobserve(entry.target);
   });
 }, { threshold: 0.15 });
 cards.forEach(card => {
  observer.observe(card);
  card.addEventListener('animationend', event => {
   if (event.target === card && event.animationName === 'impact-fade-in') {
    card.classList.remove('impact-reveal');
    card.style.removeProperty('--impact-delay');
   }
  });
 });
 reducedMotion.addEventListener('change', event => {
  if (event.matches) {
   observer.disconnect();
   cards.forEach(card => { card.classList.remove('impact-reveal'); card.style.removeProperty('--impact-delay'); });
  }
 });
})();
// Rotate the homepage project highlights without changing their supplied artwork.
(() => {
 const section = document.querySelector('#projects.project-banner');
 if (!section) return;
 const slides = [...section.querySelectorAll('.project-banner-slide')];
 const previous = section.querySelector('[data-project-prev]');
 const next = section.querySelector('[data-project-next]');
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 let active = 0;
 let timer;
 let touchStartX = 0;
 const show = index => {
  active = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle('is-active', slideIndex === active));
 };
 const stop = () => { window.clearInterval(timer); timer = undefined; };
 const start = () => {
  stop();
  if (!reducedMotion.matches) timer = window.setInterval(() => show(active + 1), 6000);
 };
 previous?.addEventListener('click', () => { show(active - 1); start(); });
 next?.addEventListener('click', () => { show(active + 1); start(); });
 section.addEventListener('mouseenter', stop);
 section.addEventListener('mouseleave', start);
 section.addEventListener('focusin', stop);
 section.addEventListener('focusout', event => { if (!section.contains(event.relatedTarget)) start(); });
 section.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); show(active - 1); start(); }
  if (event.key === 'ArrowRight') { event.preventDefault(); show(active + 1); start(); }
 });
 section.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
 section.addEventListener('touchend', event => {
  const distance = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(distance) > 40) { show(active + (distance < 0 ? 1 : -1)); start(); }
 }, { passive: true });
 reducedMotion.addEventListener('change', start);
 show(0);
 start();
})();
// Prepare an email; the visitor reviews and sends it in their email application.
const enquiryForm = document.querySelector('#enquiry-form');
if (enquiryForm) {
 const topic = document.querySelector('#topic');
 const requestedTopic = new URLSearchParams(window.location.search).get('topic');
 if ([...topic.options].some(option => option.value === requestedTopic)) topic.value = requestedTopic;
 const status = document.querySelector('#form-status');
 const prepared = document.querySelector('#prepared-enquiry');
 const fallback = document.querySelector('#email-fallback');
 enquiryForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!enquiryForm.reportValidity()) return;
  const data = new FormData(enquiryForm);
  const subject = `BCF LANKA enquiry — ${data.get('topic')}`;
  const body = `Name: ${data.get('name').trim()}\nEmail: ${data.get('email').trim()}\nOrganisation: ${data.get('organisation').trim() || 'Not provided'}\nTopic: ${data.get('topic')}\n\n${data.get('message').trim()}`;
  prepared.value = `To: info@bcfco.net\nSubject: ${subject}\n\n${body}`;
  fallback.hidden = false;
  status.textContent = 'Your email draft is ready. Review and send it in your email application. Nothing has been sent by this website.';
  const mailto = `mailto:info@bcfco.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (mailto.length <= 1800) window.location.href = mailto;
  else status.textContent = 'Your enquiry is ready below. It is too long to open reliably as an email link; copy it into your email application. Nothing has been sent.';
 });
 document.querySelector('#copy-enquiry').addEventListener('click', async () => {
  try {
   if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
   await navigator.clipboard.writeText(prepared.value);
   status.textContent = 'Enquiry copied. Paste it into an email to info@bcfco.net and review it before sending.';
  } catch {
   prepared.focus(); prepared.select();
   status.textContent = 'Select and copy the prepared enquiry below, then paste it into your email application.';
  }
 });
}
// Reveal the homepage product cards as they enter view, with reduced-motion support.
(() => {
 const cards = [...document.querySelectorAll('.products .product-card')];
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
 if (!cards.length || reducedMotion.matches || !('IntersectionObserver' in window)) return;
 cards.forEach(card => card.classList.add('product-reveal'));
 const observer = new IntersectionObserver(entries => {
  entries.filter(entry => entry.isIntersecting).forEach(entry => {
   entry.target.classList.add('is-visible');
   observer.unobserve(entry.target);
  });
 }, { threshold: 0.15 });
 cards.forEach(card => observer.observe(card));
 reducedMotion.addEventListener('change', event => {
  if (event.matches) {
   observer.disconnect();
   cards.forEach(card => card.classList.add('is-visible'));
  }
 });
})();
