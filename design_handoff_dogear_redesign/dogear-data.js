// dogear-data.js — mock content for the redesign (real-feeling, from the brief)
window.DG_DATA = {
  club: {
    name: 'Thursday Chapter',
    code: 'TC-4417',
    role: 'Member',
    members: 7,
  },
  clubs: [
    { name: 'Thursday Chapter', role: 'Member', unread: false },
    { name: 'Office Slow Readers', role: 'Admin', unread: true },
  ],
  book: {
    title: 'North Woods',
    author: 'Daniel Mason',
    pages: 384,
    cover: 'https://covers.openlibrary.org/b/isbn/9780593597033-L.jpg',
  },
  // sorted by progress desc; "you" = June
  progress: [
    { name: 'Linnea', status: 'done', pct: 100, page: 384, chapter: 18, updated: '2d ago' },
    { name: 'Sam', status: 'reading', pct: 81, page: 312, chapter: 15, updated: '5h ago' },
    { name: 'Owen', status: 'reading', pct: 65, page: 251, chapter: 12, updated: '1d ago' },
    { name: 'June', status: 'reading', pct: 61, page: 234, chapter: 11, updated: 'just now', you: true },
    { name: 'Priya', status: 'reading', pct: 41, page: 158, chapter: 8, updated: '3d ago' },
    { name: 'Marcus', status: 'reading', pct: 25, page: 96, chapter: 5, updated: '6d ago' },
    { name: 'Tova', status: 'waiting', pct: 0, page: 0, chapter: 0, updated: '—' },
  ],
  median: 61,
  shelf: [
    { title: 'North Woods', author: 'Daniel Mason', cover: 'https://covers.openlibrary.org/b/isbn/9780593597033-M.jpg', current: true },
    { title: 'Sea of Tranquility', author: 'Emily St. John Mandel', cover: 'https://covers.openlibrary.org/b/isbn/9780593321447-M.jpg', finished: 'Mar 2026' },
    { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', cover: 'https://covers.openlibrary.org/b/isbn/9780593321201-M.jpg', finished: 'Jan 2026' },
    { title: 'The Bee Sting', author: 'Paul Murray', cover: null, finished: 'Nov 2025' },
  ],
  vote: {
    round: 14,
    phase: 'Voting open',
    picksUsed: 0,
    picksMax: 3,
    voted: 4,
    of: 7,
  },
  meeting: {
    dow: 'THU', day: '18', mon: 'JUN',
    time: '7:00 PM', place: "Linnea's place",
    going: 5, maybe: 2,
    attendees: ['Linnea', 'Sam', 'Owen', 'June', 'Priya', 'Tova', 'Marcus'],
    confirmed: true,
  },
  threads: [
    { ch: 9, text: 'The panther chapter broke me. Has anyone else noticed how the seasons keep…', author: 'Priya', when: '2h', replies: 12 },
    { ch: 6, text: 'Mason keeps burying little jokes in the apple-tree letters — collecting them here.', author: 'Owen', when: '1d', replies: 5 },
    { ch: 12, text: 'I need to talk about the beetle. Tagging this carefully for the folks behind us.', author: 'Sam', when: '1d', replies: 8 },
  ],
  nominations: [
    { title: 'The Covenant of Water', author: 'Abraham Verghese', isbn: '9780802162175', pitch: 'Quiet, slow, and devastating in its third act.', by: 'Sam', when: '2d' },
    { title: 'Trust', author: 'Hernan Diaz', isbn: '9780593420317', pitch: 'Four accounts of one marriage. We will fight about it, lovingly.', by: 'Owen', when: '3d' },
    { title: 'Piranesi', author: 'Susanna Clarke', isbn: '9781635575637', pitch: '245 pages. A palate cleanser with an ocean inside it.', by: 'Tova', when: '3d' },
    { title: 'The Heaven & Earth Grocery Store', author: 'James McBride', isbn: '9780593422946', pitch: 'The warmest thing I\u2019ve read all year.', by: 'Linnea', when: '4d' },
    { title: 'Martyr!', author: 'Kaveh Akbar', isbn: '9780593537619', pitch: 'A poet\u2019s first novel. Funny, then it guts you.', by: 'Priya', when: '5d' },
  ],
  allThreads: [
    { id: 1, ch: 1, pinned: true, title: 'Ground rules: tag your chapter, no peeking', text: 'Welcome to North Woods! Tag every note with the chapter it spoils. The filter does the rest \u2014 nobody needs to be brave here.', author: 'Linnea', when: '2w', replies: 4 },
    { id: 2, ch: 9, title: 'The panther chapter broke me', text: 'Has anyone else noticed how the seasons keep doing the emotional work? Mason lets the cold arrive instead of the grief.', author: 'Priya', when: '2h', replies: 12,
      comments: [
        { author: 'Owen', when: '2h', text: 'The page where winter "shut the house like a fist" \u2014 I had to put it down.' },
        { author: 'June', when: '1h', text: 'And the panther never feels like a symbol. It\u2019s just\u2026 there. Which is worse.', reply: true },
        { author: 'Linnea', when: '45m', text: 'Wait until you see what he does with this thread later. Saying nothing else.' },
      ] },
    { id: 3, ch: 6, title: 'Collecting the apple-tree jokes', text: 'Mason keeps burying little jokes in the apple-tree letters. Post the ones you catch \u2014 I\u2019m keeping a list.', author: 'Owen', when: '1d', replies: 5 },
    { id: 4, ch: 3, title: 'The catalogue of apples', text: 'An entire page of apple varieties and I read every word twice. What is this book doing to me.', author: 'Marcus', when: '4d', replies: 3 },
    { id: 5, ch: 11, title: 'The ballad section \u2014 read it aloud', text: 'If you skimmed the verse chapter, go back and read it out loud. It changes everything about the rhythm.', author: 'June', when: '6h', replies: 2 },
    { id: 6, ch: 12, title: 'The beetle. We need to talk', text: 'I need to talk about the beetle. Tagging this carefully for the folks behind us.', author: 'Sam', when: '1d', replies: 8 },
    { id: 7, ch: 14, title: 'That s\u00e9ance scene', text: 'The medium chapter is the funniest and saddest thing in the book so far.', author: 'Linnea', when: '2d', replies: 6 },
    { id: 8, ch: 18, title: 'Final pages \u2014 full spoilers', text: 'For finishers only: the last image of the house. I haven\u2019t stopped thinking about it.', author: 'Linnea', when: '2d', replies: 3 },
  ],
  meetings: [
    { id: 1, kind: 'proposed', title: 'July planning \u2014 pick our night', desc: 'Three options for the North Woods halfway check-in. Snacks at mine either way.', slots: [
        { label: 'Thu Jul 9 · 7:00 PM', tally: { yes: 5, maybe: 1, no: 1 } },
        { label: 'Sat Jul 11 · 4:00 PM', tally: { yes: 3, maybe: 2, no: 2 } },
        { label: 'Sun Jul 12 · 7:00 PM', tally: { yes: 4, maybe: 2, no: 1 } },
      ], responded: 5, of: 7, waiting: ['Owen', 'Linnea'] },
    { id: 2, kind: 'confirmed', title: 'June meet-up', dow: 'THU', day: '18', mon: 'JUN', time: '7:00 PM', place: "Linnea\u2019s place", going: 5, maybe: 2, attendees: ['Linnea', 'Sam', 'Owen', 'June', 'Priya', 'Tova', 'Marcus'] },
    { id: 3, kind: 'past', title: 'Sea of Tranquility wrap-up', dow: 'SAT', day: '18', mon: 'APR', time: '4:00 PM', place: 'Riverside park', going: 6, maybe: 0, attendees: ['Linnea', 'Sam', 'Owen', 'June', 'Priya', 'Marcus'] },
  ],
  heatmap: {
    members: ['Sam', 'June', 'Priya', 'Tova', 'Marcus', 'Owen', 'Linnea'],
    // 0 = no answer, 1 = can't, 2 = maybe, 3 = available — per slot
    rows: [
      [3, 2, 3], [3, 3, 2], [3, 1, 3], [2, 3, 3], [3, 2, 1], [0, 0, 0], [0, 0, 0],
    ],
  },
};
