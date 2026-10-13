// Bị ốm birthday — everything the site shows lives here.
// Numbers and accounts are stored scrambled (reversed + base64) so they never sit in the page
// as plain text; app.js unscrambles them only to build a QR code or a payment link.

window.EVENT = {
  title: 'Bị ốm birthday',
  date: '2026-10-12',
  where: 'Studentbacken 25',
};

// faces are crops of media/gallery/1.jpg (Ánh's from another day out)
window.PEOPLE = [
  { id: 'truc', name: 'Trúc', color: '#e0457b', face: 'media/people/truc.jpg', pay: [{ kind: 'swish', n: 'MDU1MzA0MjY3NjQ=' }] },
  { id: 'mi', name: 'Mi', color: '#f08a24', face: 'media/people/mi.jpg', pay: [{ kind: 'swish', n: 'MjA1NDY2NzI3NjQ=' }] },
  { id: 'nam', name: 'Nam', color: '#2f7de1', face: 'media/people/nam.jpg', pay: [
    { kind: 'swish', n: 'MjU4NTQ2NTI3NjQ=' },
    { kind: 'bank', bank: 'VCB', bin: '970436', acct: 'MDg3NTIzNDYwMQ==', holder: 'NGUYEN HAI NAM' },
  ] },
  { id: 'zayn', name: 'Zayn', color: '#7a5af0', face: 'media/people/zayn.jpg', pay: [
    { kind: 'bank', bank: 'Techcombank', bin: '970407', acct: 'MDNOWUFa', holder: 'ZAYN30' },
  ] },
  { id: 'anh', name: 'Ánh', color: '#14a37f', face: 'media/people/anh.jpg', pay: [{ kind: 'swish', n: 'NDY1MDI3NzI3NjQ=' }] },
  { id: 'hung', name: 'Hưng', color: '#c8102e', face: 'media/people/hung.jpg', star: true, pay: [{ kind: 'swish', n: 'MTY1MjcxNDY3NjQ=' }] },
];

// who splits the bills (Hưng is the birthday boy: he doesn't)
window.CREW = ['nam', 'truc', 'zayn', 'anh', 'mi'];

// everyone settles through Nam: those who owe pay him, he pays those who are owed
window.HUB = 'nam';

// for: who shares it (default: the whole crew)
// kr wins over eur: the watch counts as a round 1 000 kr
window.BILLS = [
  { by: 'truc', what: 'KFC', sub: 'Liljeholmen', icon: '🍗', kr: 387.00, date: '2026-10-12', for: ['nam', 'truc', 'zayn', 'mi'] },
  { by: 'truc', what: 'ICA Kvantum', sub: 'Liljeholmen', icon: '🛒', kr: 69.00, date: '2026-10-12', for: ['nam', 'truc', 'zayn', 'mi'] },
  { by: 'truc', what: 'Willys Hemma', sub: 'Liljeholmen', icon: '🎂', kr: 67.70, date: '2026-10-12', for: ['nam', 'truc', 'zayn', 'mi'] },
  { by: 'truc', what: 'ICA Kvantum', sub: 'Liljeholmen', icon: '🛒', kr: 70.33, date: '2026-10-12', for: ['nam', 'truc', 'zayn', 'mi'] },
  { by: 'nam', what: 'Đồng hồ', sub: 'Bloc Large Silver · quà cho Hưng', icon: '⌚', kr: 1000, eur: 88.36, date: '2026-10-12' },
];

// payments already made: { from, to, kr, date, photo }
window.PAYMENTS = [
  { from: 'nam', to: 'truc', kr: 246, date: '2026-10-13', photo: 'media/receipts/nam-truc.jpg' },
  { from: 'mi', to: 'nam', kr: 349, date: '2026-10-13', photo: 'media/receipts/mi-nam.jpg' },
  { from: 'zayn', to: 'nam', kr: 349, date: '2026-10-13', photo: 'media/receipts/zayn-nam.jpg' }, // 901 000 ₫ by VCB
];

// rates on 13 Oct 2026 (frankfurter.dev for EUR, open.er-api.com for VND)
window.FX = { sekPerEur: 11.1698, vndPerSek: 2583 };

window.GALLERY = [
  { src: 'media/gallery/1.jpg', thumb: 'media/gallery/1-t.jpg', alt: 'Cả hội' },
  { src: 'media/gallery/clip.mp4', poster: 'media/gallery/clip.jpg', thumb: 'media/gallery/clip-t.jpg', alt: 'Massage', video: true },
  { src: 'media/gallery/3.jpg', thumb: 'media/gallery/3-t.jpg', alt: 'Bánh' },
  { src: 'media/gallery/4.jpg', thumb: 'media/gallery/4-t.jpg', alt: 'KFC' },
  { src: 'media/gallery/5.jpg', thumb: 'media/gallery/5-t.jpg', alt: 'Minttu' },
];
