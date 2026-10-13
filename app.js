(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Vietnamese without its accents (Bị ốm → Bi om): payment apps only show plain letters
  const plain = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  const unscramble =s => [...atob(s)].reverse().join('');
  const person = id => PEOPLE.find(x => x.id === id);
  const fx = FX.sekPerEur;
  const billKr = b => b.kr != null ? b.kr : b.eur * fx;
  const krTxt = (v, d = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' kr';
  const vnd = kr => Math.round(kr * FX.vndPerSek / 1000) * 1000;
  const vndTxt = v => v.toLocaleString('vi-VN') + ' ₫';
  const face = (id, cls = '') => { const p = person(id); return `<img class="av ${cls}" src="${esc(p.face)}" alt="" style="--pc:${p.color}">`; };
  const QR_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm1-9h2v2H6V6Zm10 0h2v2h-2V6ZM6 16h2v2H6v-2Zm7-3h2v2h-2v-2Zm2 2h2v2h-2v-2Zm2-2h4v2h-2v2h-2v-4Zm-4 4h2v4h-2v-4Zm4 2h4v2h-4v-2Zm2-2h2v2h-2v-2Z"/></svg>';

  // ── who owes whom ──────────────────────────────────────
  // Every bill splits evenly over its `for` (default: the crew). Balances round to whole kronor;
  // with a HUB everyone settles through them, otherwise the biggest debt pays the biggest credit.
  function settle() {
    const bal = Object.fromEntries(CREW.map(id => [id, 0]));
    BILLS.forEach(b => {
      const split = b.for && b.for.length ? b.for : CREW, kr = billKr(b);
      bal[b.by] += kr;
      split.forEach(id => { bal[id] -= kr / split.length; });
    });
    const whole = CREW.map(id => ({ id, v: Math.round(bal[id]) }));
    const rest = whole.reduce((t, x) => t + x.v, 0);
    // a leftover krona from rounding lands on the biggest credit (the hub), so every debt is its plain rounded share
    if (rest) whole.reduce((m, x) => x.v > m.v ? x : m).v -= rest;
    const out = { bal: Object.fromEntries(whole.map(x => [x.id, x.v])), pay: [] };
    if (window.HUB) {
      whole.filter(x => x.id !== HUB && x.v < 0).forEach(x => out.pay.push({ from: x.id, to: HUB, kr: -x.v }));
      whole.filter(x => x.id !== HUB && x.v > 0).forEach(x => out.pay.push({ from: HUB, to: x.id, kr: x.v }));
      return out;
    }
    const side = s => whole.map(x => ({ id: x.id, v: x.v * s })).filter(x => x.v > 0);
    const debt = side(-1), cred = side(1), pay = [];
    while (debt.length && cred.length) {
      debt.sort((a, b) => b.v - a.v); cred.sort((a, b) => b.v - a.v);
      const d = debt[0], c = cred[0], amt = Math.min(d.v, c.v);
      pay.push({ from: d.id, to: c.id, kr: amt });
      d.v -= amt; c.v -= amt;
      if (!d.v) debt.shift();
      if (!c.v) cred.shift();
    }
    out.pay = pay;
    return out;
  }
  const { bal, pay } = settle();
  const hasSwish = id => person(id).pay.some(m => m.kind === 'swish');
  pay.forEach(t => {
    const methods = person(t.to).pay, bank = methods.findIndex(m => m.kind === 'bank');
    t.m = !hasSwish(t.from) && bank >= 0 ? bank : Math.max(0, methods.findIndex(m => m.kind === 'swish'));
  });

  // ── faces: tap anyone to pay them any amount ───────────
  $('#faces').innerHTML = PEOPLE.map(p => `<li><button class="face${p.star ? ' star' : ''}" data-to="${p.id}" style="--pc:${p.color}" aria-label="Chuyển cho ${esc(p.name)}">
    <span class="face-img"><img src="${esc(p.face)}" alt="">${p.star ? '<span class="crown" aria-hidden="true">🎂</span>' : ''}</span>
    <b>${esc(p.name)}</b></button></li>`).join('');
  $('#faces').addEventListener('click', e => { const b = e.target.closest('.face'); if (b) openPay({ to: b.dataset.to }); });

  // ── pay ────────────────────────────────────────────────
  function renderPay() {
    const rows = pay.map((t, i) => {
      const made = PAYMENTS.filter(p => p.from === t.from && p.to === t.to);
      const done = made.reduce((s, p) => s + p.kr, 0) >= t.kr - 0.5, receipt = made.find(p => p.photo);
      const to = person(t.to);
      const m = to.pay[t.m], bank = m.kind === 'bank';
      const via = bank ? m.bank : 'Swish';
      return `<li class="pay-row${done ? ' paid' : ''}" style="--from:${person(t.from).color};--to:${to.color}">
        <button class="pay-btn" data-i="${i}"${receipt ? ` data-receipt="${esc(receipt.photo)}"` : ''}${done && !receipt ? ' disabled' : ''} aria-label="${esc(person(t.from).name)} chuyển ${esc(to.name)} ${t.kr} kr${done ? ', đã trả' : ''}">
          <span class="pair">${face(t.from)}<span class="arr" aria-hidden="true"><svg viewBox="0 0 24 12" width="22" height="11"><path d="M0 6h20M15 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${face(t.to)}</span>
          <span class="who"><b>${esc(person(t.from).name)} <i>→</i> ${esc(to.name)}</b><small>${esc(via)}</small></span>
          <span class="amt"><b>${krTxt(t.kr, 0)}</b>${bank ? `<small>${vndTxt(vnd(t.kr))}</small>` : ''}</span>
          <span class="qr-ic">${done ? `<span class="q">${QR_ICON}</span><span class="t" aria-hidden="true">✓</span>` : QR_ICON}</span>
        </button></li>`;
    }).join('');
    const spent = id => BILLS.reduce((t, b) => { const s = b.for && b.for.length ? b.for : CREW; return t + (s.includes(id) ? billKr(b) / s.length : 0); }, 0);
    const paid = id => BILLS.filter(b => b.by === id).reduce((t, b) => t + billKr(b), 0);
    const dec = v => v.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const signed = v => { const r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toLocaleString('sv-SE'); };
    $('#payList').innerHTML = `<ul class="pays">${rows || '<li class="square">Xong hết rồi ✓</li>'}</ul>
      <table class="tally">
        <thead><tr><th class="unit">kr</th>${CREW.map(id => `<th scope="col" style="--pc:${person(id).color}">${face(id, 'sm')}<span>${esc(person(id).name)}</span></th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Phần</th>${CREW.map(id => `<td>${dec(spent(id))}</td>`).join('')}</tr>
          <tr><th scope="row">Đã trả</th>${CREW.map(id => `<td>${dec(paid(id))}</td>`).join('')}</tr>
          <tr class="total"><th scope="row">Còn</th>${CREW.map(id => { const v = bal[id]; return `<td class="${v > 0.5 ? 'pos' : v < -0.5 ? 'neg' : ''}">${signed(v)}</td>`; }).join('')}</tr>
        </tbody>
      </table>`;
  }
  renderPay();
  $('#payList').addEventListener('click', e => {
    const b = e.target.closest('.pay-btn'); if (!b) return;
    if (b.dataset.receipt) openViewer([{ src: b.dataset.receipt, alt: 'Biên lai' }], 0);
    else if (!b.closest('.paid')) openPay(pay[+b.dataset.i]);
  });
  // the tick: a second after a paid row comes into view; every time the tab opens, it plays again
  const paidRows = () => document.querySelectorAll('#payList .pay-row.paid');
  const paidIO = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    paidIO.unobserve(e.target);
    setTimeout(() => e.target.classList.add('go'), 1000);
  }), { threshold: 0.6 });
  function playTicks() {
    paidRows().forEach(r => { r.classList.remove('go'); paidIO ? paidIO.observe(r) : r.classList.add('go'); });
  }

  // ── bills ──────────────────────────────────────────────
  function renderBills() {
    const groups = [];
    BILLS.forEach(b => {
      const key = (b.for && b.for.length ? b.for : CREW).slice().sort().join(',');
      let g = groups.find(x => x.key === key);
      if (!g) groups.push(g = { key, who: b.for && b.for.length ? b.for : CREW, list: [] });
      g.list.push(b);
    });
    $('#billList').innerHTML = groups.map(g => {
      const total = g.list.reduce((t, b) => t + billKr(b), 0);
      const out = CREW.filter(id => !g.who.includes(id));
      return `<div class="bill-group">
        <div class="bg-head">
          <span class="stack">${g.who.map(id => face(id, 'sm')).join('')}</span>
          <span class="bg-t"><b>${g.who.length === CREW.length ? 'Cả hội' : g.who.length + ' người'}</b>${out.length ? `<small>trừ ${out.map(id => esc(person(id).name)).join(', ')}</small>` : ''}</span>
          <span class="bg-sum"><b>${krTxt(total / g.who.length)}</b><small>mỗi người</small></span>
        </div>
        <ul class="bills">${g.list.map(b => `<li style="--pc:${person(b.by).color}">
          <span class="ic" aria-hidden="true">${b.icon || '🧾'}</span>
          <span class="what"><b>${esc(b.what)}</b><small>${esc(b.sub || '')}</small></span>
          <span class="by">${face(b.by, 'xs')}${esc(person(b.by).name)}</span>
          <span class="bamt"><b>${krTxt(billKr(b))}</b>${b.eur != null ? `<small>€${b.eur.toFixed(2).replace('.', ',')}</small>` : ''}</span>
        </li>`).join('')}</ul>
        <p class="bg-total">Tổng ${krTxt(total)} ÷ ${g.who.length}</p>
      </div>`;
    }).join('');
  }
  renderBills();
  $('#fine').textContent = `1 kr ≈ ${FX.vndPerSek.toLocaleString('vi-VN')} ₫ · tỷ giá 13.10.2026`;

  // ── payment links ──────────────────────────────────────
  // Swish: its own payment link with number, amount and message locked; the QR holds the link.
  function swishLink(n, kr, msg) {
    const q = new URLSearchParams({ sw: n, amt: kr ? kr.toFixed(2) : '', msg: msg.replace(/[^\w åäöÅÄÖ.,!?:-]/g, '').slice(0, 50) });
    if (!kr) q.delete('amt');
    return 'https://app.swish.nu/1/p/sw/?' + q.toString().replace(/\+/g, '%20');
  }
  // VietQR (NAPAS 247): the EMVCo payload every Vietnamese bank app scans.
  const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
  function crc16(s) {
    let c = 0xFFFF;
    for (let i = 0; i < s.length; i++) {
      c ^= s.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1;
      c &= 0xFFFF;
    }
    return c.toString(16).toUpperCase().padStart(4, '0');
  }
  const ascii = s => plain(s).replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 25);
  function vietQr(bin, acct, amount, memo) {
    let s = tlv('00', '01') + tlv('01', amount ? '12' : '11')
      + tlv('38', tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', acct)) + tlv('02', 'QRIBFTTA'))
      + tlv('53', '704') + (amount ? tlv('54', String(amount)) : '') + tlv('58', 'VN')
      + (memo ? tlv('62', tlv('08', ascii(memo))) : '') + '6304';
    return s + crc16(s);
  }
  // Open the payer's own bank app with the transfer filled in (VietQR's deeplink service).
  const APPS = [['vcb', 'Vietcombank'], ['tcb', 'Techcombank'], ['mb', 'MB'], ['bidv', 'BIDV'], ['icb', 'VietinBank'], ['acb', 'ACB'], ['tpb', 'TPBank'], ['vpb', 'VPBank']];
  const BANK_CODE = { '970436': 'vcb', '970407': 'tcb' };
  const appLink = (app, m, acct, amount, memo) => 'https://dl.vietqr.io/pay?' + new URLSearchParams({ app, ba: `${acct}@${BANK_CODE[m.bin]}`, am: amount || '', tn: ascii(memo) });

  // ── the pay popup ──────────────────────────────────────
  const box = $('#qrBox');
  const touch = matchMedia('(pointer: coarse)').matches;
  let cur = null;
  function openPay(t) {
    const to = person(t.to);
    cur = { ...t, m: t.m || 0 };
    $('#qrTitle').innerHTML = t.from
      ? `${face(t.from, 'sm')}<span>${esc(person(t.from).name)}</span><i>→</i>${face(t.to, 'sm')}<span>${esc(to.name)}</span>`
      : `<span>Chuyển cho</span>${face(t.to, 'sm')}<span>${esc(to.name)}</span>`;
    $('#qrSeg').innerHTML = to.pay.length > 1 ? to.pay.map((m, i) => `<button role="tab" data-m="${i}">${m.kind === 'swish' ? 'Swish' : esc(m.bank)}</button>`).join('') : '';
    $('#qrSeg').hidden = to.pay.length < 2;
    $('#qrAmtIn').value = '';
    box.style.setProperty('--pc', to.color);
    draw();
    box.showModal();
    if (!t.kr && !touch) $('#qrAmtIn').focus();
  }
  function draw() {
    const to = person(cur.to), m = to.pay[cur.m], bank = m.kind === 'bank';
    const memo = plain(`${EVENT.title} - ${cur.from ? person(cur.from).name : ''}`.replace(/ - $/, ''));
    $('#qrSeg').querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-selected', i === cur.m));
    // fixed amount from a payment; otherwise what's typed (kr for Swish, ₫ for a bank)
    const fixed = cur.kr != null;
    $('#qrAmtWrap').hidden = fixed; $('#qrAmt').hidden = !fixed;
    $('#qrUnit').textContent = bank ? '₫' : 'kr';
    const typed = parseFloat($('#qrAmtIn').value.replace(/\s/g, '').replace(',', '.')) || 0;
    let amount, link, payload;
    if (bank) {
      amount = fixed ? vnd(cur.kr) : Math.round(typed);
      const acct = unscramble(m.acct);
      payload = vietQr(m.bin, acct, amount, memo);
      $('#qrAmt').textContent = krTxt(cur.kr || 0, 0);
      $('#qrSub').textContent = fixed ? vndTxt(amount) : '';
      $('#qrAcct').innerHTML = `<span><b>${esc(m.bank)}</b> · ${esc(acct)}${m.holder !== acct ? ' · ' + esc(m.holder) : ''}</span><button class="copy" data-copy="${esc(acct)}">Copy</button>`;
      $('#qrOpen').hidden = true;
      $('#qrApps').hidden = !touch;
      $('#qrApps').innerHTML = `<p>Mở app ngân hàng</p><div>${APPS.map(([id, name]) => `<a href="${esc(appLink(id, m, acct, amount, memo))}" target="_blank" rel="noopener">${name}</a>`).join('')}</div>`;
    } else {
      amount = fixed ? cur.kr : typed;
      link = payload = swishLink(unscramble(m.n), amount, memo);
      $('#qrAmt').textContent = krTxt(amount, 0);
      $('#qrSub').textContent = '';
      $('#qrAcct').innerHTML = '';
      $('#qrOpen').href = link; $('#qrOpen').hidden = !touch;
      $('#qrApps').hidden = true;
    }
    $('#qrSub').hidden = !$('#qrSub').textContent;
    const qr = qrcode(0, 'M'); qr.addData(payload); qr.make();
    $('#qrCode').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }
  $('#qrSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { cur.m = +b.dataset.m; draw(); } });
  $('#qrAmtIn').addEventListener('input', draw);
  $('#qrAcct').addEventListener('click', e => {
    const b = e.target.closest('.copy'); if (!b) return;
    navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = '✓'; setTimeout(() => { b.textContent = 'Copy'; }, 1400); });
  });
  $('#qrClose').onclick = () => box.close();
  box.addEventListener('click', e => { if (e.target === box) box.close(); });

  // ── photos ─────────────────────────────────────────────
  // A swipeable strip; tap one for the full-screen viewer (swipe, arrows, ←/→).
  $('#picList').innerHTML = `<div class="strip"><div class="track" id="track">${GALLERY.map((g, i) => `<button class="tile${g.video ? ' vid' : ''}" data-i="${i}" aria-label="${esc(g.alt)}"><img src="${esc(g.video ? g.poster : g.src)}" alt="" loading="lazy" draggable="false">${g.video ? '<span class="play" aria-hidden="true">▶</span>' : ''}</button>`).join('')}</div>
    <button class="nav prev" aria-label="Trước">‹</button><button class="nav next" aria-label="Sau">›</button></div>`;
  const track = $('#track');
  const step = dir => track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
  $('#picList .prev').onclick = () => step(-1); $('#picList .next').onclick = () => step(1);
  const navState = () => {
    $('#picList .prev').disabled = track.scrollLeft < 4;
    $('#picList .next').disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
  };
  track.addEventListener('scroll', navState, { passive: true }); addEventListener('resize', navState); navState();
  // mouse drag to swipe; a drag isn't a click
  let drag = null;
  track.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') drag = { x: e.clientX, s: track.scrollLeft, moved: false }; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) { drag.moved = true; track.classList.add('dragging'); }
    if (drag.moved) track.scrollLeft = drag.s - dx;
  });
  addEventListener('pointerup', () => { if (!drag) return; const moved = drag.moved; track.classList.remove('dragging'); setTimeout(() => { drag = null; }, 0); if (moved) track.dataset.justDragged = '1'; setTimeout(() => delete track.dataset.justDragged, 50); });
  track.addEventListener('click', e => { if (track.dataset.justDragged) return; const t = e.target.closest('.tile'); if (t) openViewer(GALLERY, +t.dataset.i); });

  const viewer = $('#viewer'), vTrack = $('#vTrack');
  let vItems = [];
  const vIndex = () => Math.round(vTrack.scrollLeft / vTrack.clientWidth);
  const vGo = (i, smooth = true) => vTrack.scrollTo({ left: Math.max(0, Math.min(vItems.length - 1, i)) * vTrack.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  function vSync() {
    const i = vIndex();
    $('#vDots').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', i === j));
    $('#vPrev').disabled = i === 0; $('#vNext').disabled = i === vItems.length - 1;
    vTrack.querySelectorAll('video').forEach(v => { if (v.closest('.v-item') !== vTrack.children[i]) v.pause(); });
  }
  function openViewer(items, i) {
    if (items !== vItems) {
      vItems = items;
      vTrack.innerHTML = items.map(g => `<div class="v-item">${g.video
        ? `<video src="${esc(g.src)}" poster="${esc(g.poster)}" controls playsinline preload="metadata"></video>`
        : `<img src="${esc(g.src)}" alt="${esc(g.alt)}">`}</div>`).join('');
      $('#vDots').innerHTML = items.length > 1 ? items.map((_, j) => `<button data-i="${j}" aria-label="${j + 1}"></button>`).join('') : '';
    }
    viewer.showModal();
    requestAnimationFrame(() => { vGo(i, false); vSync(); const v = vTrack.children[i].querySelector('video'); if (v) v.play().catch(() => {}); });
  }
  vTrack.addEventListener('scroll', () => requestAnimationFrame(vSync), { passive: true });
  $('#vPrev').onclick = () => vGo(vIndex() - 1); $('#vNext').onclick = () => vGo(vIndex() + 1);
  $('#vDots').addEventListener('click', e => { const b = e.target.closest('button'); if (b) vGo(+b.dataset.i); });
  $('#vClose').onclick = () => viewer.close();
  viewer.addEventListener('close', () => vTrack.querySelectorAll('video').forEach(v => v.pause()));
  viewer.addEventListener('click', e => { if (e.target === viewer || e.target.classList.contains('v-item')) viewer.close(); });
  addEventListener('keydown', e => {
    if (!viewer.open) return;
    if (e.key === 'ArrowLeft') vGo(vIndex() - 1);
    if (e.key === 'ArrowRight') vGo(vIndex() + 1);
  });

  // ── tabs (phones; on a wide screen everything shows) ───
  const tabs = document.querySelectorAll('.tabs [role=tab]');
  function showTab(name) {
    document.body.dataset.tab = name;
    tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
    if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  }
  tabs.forEach(b => b.addEventListener('click', () => { showTab(b.dataset.tab); requestAnimationFrame(navState); if (b.dataset.tab === 'pay') playTicks(); }));
  showTab(['pay', 'bills', 'pics'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'pay');
  playTicks();
})();
