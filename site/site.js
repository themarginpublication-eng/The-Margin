// The Margin — site interactions: mobile nav + scroll reveal + waitlist API + series picker
(function () {
  // mobile nav toggle
  var toggle = document.querySelector('.nav__toggle');
  var links = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (links.classList.contains('open') && !e.target.closest('.nav')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
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

  // shared helper — posts to the waitlist API (Cloudflare Pages Function)
  // body: { email, source, series? }  series = slug, or 'later'
  function submitWaitlist(email, source, series) {
    var body = { email: email, source: source };
    if (series) body.series = series;
    return fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  // real series list, fetched once and cached — never hand-maintained, so it
  // can't drift out of sync with what's actually in the database
  var seriesPromise = null;
  function fetchSeriesList() {
    if (!seriesPromise) {
      seriesPromise = fetch('/api/series')
        .then(function (res) { return res.ok ? res.json() : { series: [] }; })
        .then(function (data) { return data.series || []; })
        .catch(function () { return []; });
    }
    return seriesPromise;
  }

  // series picker — swapped in after a successful email save.
  // container: element the picker is appended to; done(msg): called with final thank-you text
  function showSeriesPicker(email, source, container, done) {
    var wrap = document.createElement('div');
    wrap.className = 'seriespick';
    wrap.innerHTML = '<p class="seriespick__lead">Loading series&hellip;</p>';
    container.appendChild(wrap);

    fetchSeriesList().then(function (series) {
      if (!series.length) {
        // No series configured yet — just confirm the signup, nothing to pick.
        wrap.remove();
        done('Thank you — you’re on the list. Watch your inbox for the welcome note.');
        return;
      }

      var html =
        '<p class="seriespick__lead">You’re in. <strong>Pick a series</strong> and Day&nbsp;1 lands in your inbox now — or decide later and we’ll send you the full menu.</p>' +
        '<div class="seriespick__list">';
      series.forEach(function (s) {
        html += '<button type="button" class="seriespick__opt" data-series="' + s.slug + '">' +
          '<span class="seriespick__name">' + s.name + '</span>' +
          '<span class="seriespick__sub">' + (s.sub || '') + '</span>' +
          '<span class="seriespick__go">Start Day 1 &rarr;</span></button>';
      });
      html += '</div>' +
        '<button type="button" class="seriespick__later" data-series="later">I’ll decide later — email me the options</button>' +
        '<p class="seriespick__note"></p>';
      wrap.innerHTML = html;

      wrap.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-series]');
        if (!btn) return;
        var slug = btn.getAttribute('data-series');
        var note = wrap.querySelector('.seriespick__note');
        note.textContent = 'Saving…';
        submitWaitlist(email, source, slug).then(function (ok) {
          if (!ok) { note.textContent = 'Something went wrong. Please try again.'; return; }
          wrap.remove();
          var s = null;
          series.forEach(function (x) { if (x.slug === slug) s = x; });
          done(slug === 'later'
            ? 'Thank you — you’re on the list. The welcome note with every series is on its way.'
            : 'Day 1 of “' + (s ? s.name : 'your series') + '” is on its way. Watch your inbox.');
        });
      });
    });
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
        '<p>The Margin is still in development. Write your email down, and we’ll add it to the list to contact you later when The Margin is launched.</p>' +
        '<form class="launchpop__form" data-launch-form><input type="email" required placeholder="you@example.com" aria-label="Email address" /><button type="submit" class="btn">Keep me posted</button></form>' +
        '<div class="launchpop__pick"></div>' +
        '<p class="launchpop__note"></p>' +
      '</div>';
    var css = document.createElement('style');
    css.textContent =
      '.launchpop__overlay{position:fixed;inset:0;z-index:200;background:rgba(26,24,20,0.55);display:flex;align-items:center;justify-content:center;padding:20px}' +
      '.launchpop{position:relative;background:var(--vellum,#FAF6EC);max-width:480px;width:100%;padding:clamp(28px,6vw,44px) clamp(20px,6vw,40px) 32px;max-height:90vh;overflow:auto;border-top:5px solid var(--rust,#A8593C);box-shadow:0 24px 60px rgba(26,24,20,0.35);font-family:var(--font-serif,Georgia,serif)}' +
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
      '.launchpop__close:hover{color:var(--ink,#1A1814)}' +
      // series picker (shared by popup + subscribe forms)
      '.seriespick{margin-top:8px}' +
      '.seriespick__lead{font-size:16.5px;line-height:1.55;color:var(--ink,#1A1814)}' +
      '.seriespick__list{display:flex;flex-direction:column;gap:10px;margin:16px 0}' +
      '.seriespick__opt{display:flex;flex-direction:column;gap:2px;text-align:left;padding:14px 16px;background:var(--parchment,#F3EEE3);border:1px solid var(--margin,#C9BFAE);cursor:pointer;font-family:inherit;min-height:44px;transition:border-color .15s,transform .15s}' +
      '.seriespick__opt:hover{border-color:var(--rust,#A8593C);transform:translateY(-1px)}' +
      '.seriespick__name{font-family:var(--font-display,Georgia,serif);font-weight:700;font-size:17px;color:var(--ink,#1A1814)}' +
      '.seriespick__sub{font-size:14px;color:var(--ash,#6B5F54)}' +
      '.seriespick__go{font-family:var(--font-sans,system-ui,sans-serif);font-weight:600;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--rust,#A8593C);margin-top:6px}' +
      '.seriespick__later{background:none;border:none;padding:10px 0;min-height:44px;font-family:var(--font-sans,system-ui,sans-serif);font-weight:600;font-size:12.5px;letter-spacing:.04em;color:var(--ash,#6B5F54);text-decoration:underline;cursor:pointer}' +
      '.seriespick__later:hover{color:var(--rust,#A8593C)}' +
      '.seriespick__note{min-height:1.2em;font-size:14.5px;color:var(--rust-deep,#8C4730)}';
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
      var email = input.value;
      note.textContent = 'Saving…';
      submitWaitlist(email, 'launch-popup').then(function (ok) {
        if (!ok) { note.textContent = 'Something went wrong. Please try again.'; return; }
        note.textContent = '';
        form.style.display = 'none';
        ov.querySelector('#lp-title').textContent = 'Pick your series';
        ov.querySelector('.launchpop p').style.display = 'none';
        showSeriesPicker(email, 'launch-popup', ov.querySelector('.launchpop__pick'), function (msg) {
          note.textContent = msg;
          setTimeout(dismiss, 2600);
        });
      });
    });
  }

  // subscribe forms — post email, then offer the series picker
  document.querySelectorAll('form[data-subscribe]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var note = form.parentNode.querySelector('.subnote');
      if (!(input && input.value && input.value.indexOf('@') > 0)) {
        if (note) note.textContent = 'Please enter a valid email address.';
        return;
      }
      var email = input.value;
      var source = document.body.dataset.page || 'site';
      if (note) note.textContent = 'Saving…';
      submitWaitlist(email, source).then(function (ok) {
        if (!ok) { if (note) note.textContent = 'Something went wrong. Please try again.'; return; }
        if (note) note.textContent = '';
        form.style.display = 'none';
        showSeriesPicker(email, source, form.parentNode, function (msg) {
          if (note) note.textContent = msg;
        });
      });
    });
  });
})();
