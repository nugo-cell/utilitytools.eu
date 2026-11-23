// Homepage "News" section. Add new items at the TOP (newest first).
// Fields: date (YYYY-MM-DD), title, body (plain text), optional link + linkText,
// optional tag (short label such as 'New tools', 'Update', 'Blog').
// The homepage shows the latest HOME_NEWS_LIMIT items; older ones fold into "Older news".
const NEWS = [
  {
    date: '2026-11-23',
    tag: 'New tools',
    title: 'Six new everyday tools',
    body: 'Unit Converter, Date Calculator, File Checksum (SHA-256), CSV Cleaner, Quick Drop for sending text between devices, and Phone-to-Computer Photo Drop. All run in your browser, with no uploads.',
    link: '/photo-drop',
    linkText: 'Try Photo Drop'
  },
  {
    date: '2026-11-23',
    tag: 'Update',
    title: 'Faster search with suggestions',
    body: 'The homepage search now suggests matching tools as you type. Use the arrow keys and Enter to jump straight to a tool.',
    link: '/#all-tools',
    linkText: 'Browse all tools'
  },
  {
    date: '2026-06-02',
    tag: 'New tool',
    title: 'Consent-first Remote Support',
    body: 'Start a temporary support session with a one-time code. The helper can only join after you approve, and you can stop screen sharing or control at any moment.',
    link: '/remote-support',
    linkText: 'Open Remote Support'
  },
  {
    date: '2026-06-01',
    tag: 'New tools',
    title: 'More developer tools',
    body: 'XML to JSON, CSV to XML, SQL formatter and XPath tester join the developer collection.',
    link: '/sql-formatter',
    linkText: 'Try the SQL formatter'
  },
  {
    date: '2026-05-05',
    tag: 'Update',
    title: 'Join private rooms with a QR code',
    body: 'Video calls, voice calls, chats and file transfers can now be joined by scanning a QR code. No more typing links on your phone.',
    link: '/p2p-file',
    linkText: 'Send a file'
  }
];

const HOME_NEWS_LIMIT = 3;

module.exports = { NEWS, HOME_NEWS_LIMIT };
