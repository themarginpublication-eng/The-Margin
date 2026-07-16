// The Margin — site interactions: mobile nav + scroll reveal + subscribe stub
(function () {
  // mobile nav toggle
  var toggle = document.querySelector('.nav__toggle');
  var links = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  // scroll reveal
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && els.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // launch popup — shown once per visitor until launch
  var SEEN_KEY = 'tm-launch-popup-seen';
  var seen = null;
  try { seen = localStorage.getItem(SEEN_KEY); } catch (e) {}
  if (!seen) {
    var ov = document.createElement('div');
    ov.className = 'launchpop__overlay';
    ov.innerHTML =
      '<div class="launchpop" role="dialog" aria-modal="true" aria-labelledby="lp-title">' +
        '<button class="launchpop__close" aria-label="Close">&times;</button>' +
        '<div class="launchpop__mark"><span class="launchpop__bar"></span><span class="launchpop__type">the margin</span></div>' +
        '<h2 id="lp-title">Still in development</h2>' +
        '<p>The Margin is still in development. Write your email down, and we\u2019ll add it to the list to contact you later when The Margin is launched.</p>' +
        '<form class="launchpop__form" data-launch-form><input type="email" required placeholder="you@example.com" aria-label="Email address" /><button type="submit" class="btn">Keep me posted</button></form>' +
        '<p class="launchpop__note"></p>' +
      '</div>';
    var css = document.createElement('style');
    css.textContent =
      '.launchpop__overlay{position:fixed;inset:0;z-index:200;background:rgba(26,24,20,0.55);display:flex;align-items:center;justify-content:center;padding:20px}' +
      '.launchpop{position:relative;background:var(--vellum,#FAF6EC);max-width:480px;width:100%;padding:44px 40px 36px;border-top:5px solid var(--rust,#A8593C);box-shadow:0 24px 60px rgba(26,24,20,0.35);font-family:var(--font-serif,Georgia,serif)}' +
      '.launchpop__mark{display:flex;align-items:center;gap:10px;margin-bottom:18px}' +
      '.launchpop__bar{width:4px;height:26px;background:var(--rust,#A8593C)}' +
      '.launchpop__type{font-family:var(--font-display,Georgia,serif);font-weight:700;font-size:19px;color:var(--ink,#1A1814);letter-spacing:0.01em}' +
      '.launchpop h2{font-family:var(--font-display,Georgia,serif);font-size:28px;margin:0 0 10px;color:var(--ink,#1A1814)}' +
      '.launchpop p{font-size:16.5px;line-height:1.55;color:var(--ash,#6B5F54);margin:0 0 20px}' +
      '.launchpop__form{display:flex;gap:10px;flex-wrap:wrap}' +
      '.launchpop__form input{flex:1 1 200px;padding:13px 15px;font-size:16px;font-family:inherit;border:1px solid var(--margin,#C9BFAE);background:#fff;color:var(--ink,#1A1814)}' +
      '.launchpop__form input:focus{outline:2px solid var(--rust,#A8593C);outline-offset:-1px}' +
      '.launchpop__note{min-height:1.2em;font-size:14.5px;color:var(--rust-deep,#8C4730);margin-top:12px}' +
      '.launchpop__close{position:absolute;top:10px;right:14px;background:none;border:none;font-size:28px;line-height:1;color:var(--ash,#6B5F54);cursor:pointer;padding:6px}' +
      '.launchpop__close:hover{color:var(--ink,#1A1814)}';
    document.head.appendChild(css);
    document.body.appendChild(ov);
    var dismiss = function () { ov.remove(); try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} };
    ov.querySelector('.launchpop__close').addEventListener('click', dismiss);
    ov.addEventListener('click', function (e) { if (e.target === ov) dismiss(); });
    ov.querySelector('[data-launch-form]').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var form = ev.target;
      var input = form.querySelector('input');
      var note = ov.querySelector('.launchpop__note');
      if (!(input.value && input.value.indexOf('@') > 0)) {
        note.textContent = 'Please enter a valid email address.';
        return;
      }
      note.textContent = 'Saving\u2026';
      submitWaitlist(input.value, 'launch-popup').then(function (ok) {
        if (ok) {
          note.textContent = 'Thank you \u2014 you\u2019re on the list.';
          form.style.display = 'none';
          setTimeout(dismiss, 1800);
        } else {
          note.textContent = 'Something went wrong. Please try again.';
        }
      });
    });
  }

  // subscribe forms — post to the waitlist API, then thank the reader
  document.querySelectorAll('form[data-subscribe]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var note = form.parentNode.querySelector('.subnote');
      if (!(input && input.value && input.value.indexOf('@') > 0)) {
        if (note) note.textContent = 'Please enter a valid email address.';
        return;
      }
      if (note) note.textContent = 'Saving\u2026';
      submitWaitlist(input.value, document.body.dataset.page || 'site').then(function (ok) {
        if (ok) {
          if (note) note.textContent = 'Thank you \u2014 you\u2019re on the list. Watch your inbox for the welcome note.';
          form.reset();
        } else if (note) {
          note.textContent = 'Something went wrong. Please try again.';
        }
      });
    });
  });

  // shared helper \u2014 posts an email to the waitlist API (Cloudflare Pages Function)
  function submitWaitlist(email, source) {
    return fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, source: source }),
    })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }
})();
