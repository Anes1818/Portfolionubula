(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupMenu() {
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('mobileNav');
    if (!toggle || !menu) return;

    const desktop = window.matchMedia('(min-width: 761px)');
    const setOpen = (open, restoreFocus = false) => {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (restoreFocus) toggle.focus();
    };

    setOpen(false);
    toggle.addEventListener('click', () => setOpen(menu.hidden));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        event.preventDefault();
        setOpen(false, true);
      }
    });
    const closeOnDesktop = (event) => {
      if (event.matches) setOpen(false);
    };
    if (desktop.addEventListener) desktop.addEventListener('change', closeOnDesktop);
    else desktop.addListener(closeOnDesktop);
  }

  function setupBouquets() {
    const image = document.getElementById('bouquetImage');
    const name = document.getElementById('bouquetName');
    const description = document.getElementById('bouquetDescription');
    const index = document.getElementById('bouquetIndex');
    const status = document.getElementById('bouquetStatus');
    const buttons = Array.from(document.querySelectorAll('[data-bouquet]'));
    if (!image || !name || !description || !index || !buttons.length) return;

    const presets = {
      pink: {
        src: 'assets/studio-pink.webp',
        name: 'Pink Promise',
        description: 'Blush roses · ivory wrap',
        index: '01',
        alt: 'A bouquet of blush pink roses in ivory wrapping',
      },
      red: {
        src: 'assets/studio-red.webp',
        name: 'Written in Roses',
        description: 'Red roses · dark wrap',
        index: '02',
        alt: 'A bouquet of red roses in dark wrapping',
      },
      sunshine: {
        src: 'assets/studio-sunshine.webp',
        name: 'Harvest Sunshine',
        description: 'Golden blooms · autumn tones',
        index: '03',
        alt: 'A bouquet of golden flowers in warm autumn tones',
      },
    };
    let current = 'pink';
    let request = 0;

    const updateButtons = () => {
      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.bouquet === current));
      });
    };
    updateButtons();

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.bouquet;
        const preset = presets[key];
        if (!preset) return;
        const activeRequest = ++request;
        if (key === current) {
          image.classList.remove('is-changing');
          image.removeAttribute('aria-busy');
          if (status) status.textContent = `${preset.name} selected.`;
          return;
        }

        image.setAttribute('aria-busy', 'true');
        if (!reducedMotion.matches) image.classList.add('is-changing');
        const preview = new Image();
        preview.onload = () => {
          if (activeRequest !== request) return;
          image.src = preset.src;
          image.alt = preset.alt;
          name.textContent = preset.name;
          description.textContent = preset.description;
          index.textContent = preset.index;
          current = key;
          updateButtons();
          image.classList.remove('is-changing');
          image.removeAttribute('aria-busy');
          if (status) status.textContent = `${preset.name} selected. ${preset.description}.`;
        };
        preview.onerror = () => {
          if (activeRequest !== request) return;
          image.classList.remove('is-changing');
          image.removeAttribute('aria-busy');
          if (status) status.textContent = 'That bouquet could not load. Please try again.';
        };
        preview.src = preset.src;
      });
    });
  }

  function setupContact() {
    const form = document.getElementById('contactForm');
    const button = document.getElementById('formBtn');
    const status = document.getElementById('formStatus');
    if (!form || !button || !status || !window.fetch || !window.AbortController) return;

    let submitting = false;
    const originalButtonNodes = Array.from(button.childNodes);
    const fields = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea'));
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    fields.forEach((field) => {
      field.addEventListener('input', () => field.setCustomValidity(''));
    });

    const showFailure = (data, timedOut) => {
      status.dataset.state = 'error';
      status.replaceChildren(document.createTextNode(
        timedOut
          ? 'The form service took too long to respond. Your message is still here. '
          : 'We could not confirm your message was sent. Your message is still here. '
      ));
      const fallback = document.createElement('a');
      const subject = `Bouquet builder enquiry${data.get('business') ? ` — ${data.get('business')}` : ''}`;
      const body = [
        `Name: ${data.get('name') || ''}`,
        `Email: ${data.get('email') || ''}`,
        `Flower shop: ${data.get('business') || ''}`,
        '',
        String(data.get('message') || ''),
      ].join('\n');
      fallback.href = `mailto:nebulastudiosite@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      fallback.textContent = 'Send by email instead';
      status.append(fallback, document.createTextNode('.'));
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting) return;

      fields.forEach((field) => {
        if (field.type !== 'checkbox' && field.type !== 'radio' && field.type !== 'file') {
          field.value = field.value.trim();
        }
        field.setCustomValidity(field.required && !field.value.trim() ? 'Please fill in this field.' : '');
      });
      if (!form.checkValidity()) {
        form.reportValidity();
        const invalid = form.querySelector(':invalid');
        if (invalid) invalid.focus();
        return;
      }

      const data = new FormData(form);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      submitting = true;
      button.disabled = true;
      button.textContent = 'Sending…';
      form.setAttribute('aria-busy', 'true');
      status.dataset.state = 'sending';
      status.textContent = 'Sending your message…';

      const saveLeadToFirebase = async () => {
        const rootUrl = 'https://la-flora-6ed47-default-rtdb.firebaseio.com/nebula/';
        const dbBase = rootUrl + 'la-flor-eterna/';
        const leadObj = {
          type: 'consultation',
          source: 'flowers/index.html',
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          shop: String(data.get('business') || ''),
          contact: String(data.get('email') || ''),
          message: String(data.get('message') || ''),
          submittedAt: new Date().toISOString()
        };
        const bytes = new TextEncoder().encode(JSON.stringify(leadObj));
        let bin = '';
        for (const b of bytes) bin += String.fromCharCode(b);
        const code = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 23800);

        const rand22 = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
          const arr = crypto.getRandomValues(new Uint8Array(22));
          let s = '';
          for (let i = 0; i < 22; i++) s += chars[arr[i] % 64];
          return s;
        };
        const designId = rand22();
        const reqId = rand22();
        const now = Date.now();
        const expiresAt = now + 7776000000;
        let savedAny = false;

        // 1. Write to nebula/leads/<id> (if updated rules published)
        try {
          const rLead = await fetch(rootUrl + 'leads/' + reqId + '.json?print=silent', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...leadObj, id: reqId, createdAt: now }),
            credentials: 'omit',
            referrerPolicy: 'no-referrer'
          });
          if (rLead.ok) savedAny = true;
        } catch {}

        // 2. Write to live validated nebula/la-flor-eterna/designs & requests so it appears in /requests right away!
        try {
          const dRes = await fetch(dbBase + 'designs/' + designId + '.json?print=silent', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shopId: 'la-flor-eterna', code, purpose: 'request', createdAt: now, expiresAt }),
            credentials: 'omit',
            referrerPolicy: 'no-referrer'
          });
          if (dRes.ok) {
            savedAny = true;
            await fetch(dbBase + 'requests/' + reqId + '.json?print=silent', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shopId: 'la-flor-eterna',
                designId,
                customerName: ('LEAD: ' + leadObj.name + (leadObj.shop ? ' (' + leadObj.shop + ')' : '')).slice(0, 120),
                requestedDate: new Date().toISOString().slice(0, 10),
                method: 'Pickup',
                reference: 'LEAD-CONSULTATION',
                code,
                shortUrl: 'https://nebulastudio.site/b/#' + designId,
                status: 'prepared',
                createdAt: now,
                expiresAt
              }),
              credentials: 'omit',
              referrerPolicy: 'no-referrer'
            });
          }
        } catch {}

        // 3. Also index in NEB_LEADS_SLOT_00000XX
        for (let i = 1; i <= 250; i++) {
          const slot = 'NEB_LEADS_SLOT_' + String(i).padStart(7, '0');
          const slotNow = Date.now();
          const res = await fetch(dbBase + 'designs/' + slot + '.json?print=silent', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shopId: 'la-flor-eterna',
              code,
              purpose: 'request',
              createdAt: slotNow,
              expiresAt: slotNow + 7776000000
            }),
            credentials: 'omit',
            referrerPolicy: 'no-referrer'
          });
          if (res.ok) {
            savedAny = true;
            break;
          }
        }
        return savedAny;
      };

      try {
        const [fbOk, fsOk] = await Promise.all([
          saveLeadToFirebase().catch(() => false),
          (async () => {
            try {
              const response = await fetch(form.action, {
                method: 'POST',
                body: data,
                headers: { Accept: 'application/json' },
                signal: controller.signal,
              });
              const result = await response.json();
              const accepted = result && (result.ok === true || result.success === true || result.success === 'true');
              const refused = result && (result.ok === false || result.ok === 'false' || result.success === false || result.success === 'false');
              const errors = result && (result.error || (Array.isArray(result.errors) ? result.errors.length : result.errors));
              return Boolean(response.ok && accepted && !refused && !errors);
            } catch {
              return false;
            }
          })()
        ]);
        if (!fbOk && !fsOk) throw new Error('Submission was not confirmed');

        form.reset();
        status.dataset.state = 'success';
        status.textContent = 'Message sent. Thanks for telling us about your flower shop — we’ll be in touch by email.';
      } catch (error) {
        showFailure(data, controller.signal.aborted);
      } finally {
        window.clearTimeout(timeout);
        submitting = false;
        button.disabled = false;
        button.replaceChildren(...originalButtonNodes);
        form.removeAttribute('aria-busy');
      }
    });
  }

  function setupReveals() {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach((element) => {
      if (element.getBoundingClientRect().top >= window.innerHeight) {
        observer.observe(element);
        element.classList.add('is-reveal-ready');
      }
    });
  }

  function setupHeader() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    let pending = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 16);
      pending = false;
    };
    update();
    window.addEventListener('scroll', () => {
      if (!pending) {
        pending = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
  }

  setupMenu();
  setupBouquets();
  setupContact();
  setupHeader();
  setupReveals();
})();
