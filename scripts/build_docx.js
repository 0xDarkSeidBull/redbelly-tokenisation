// Builds the script document as Word (.docx) from content/script.json and the voiceover timeline.
// Writes out/docs/tokenisation-explainer-script.docx. Run: node scripts/build_docx.js
const fs = require('fs'), path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  HeadingLevel, Footer, PageNumber } = require('docx');

const ROOT = path.resolve(__dirname, '..');
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/script.json'), 'utf8'));
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'out/voice/timeline.json'), 'utf8'));
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'evidence/manifest.json'), 'utf8')).pages;
const INK = '343740', MUTED = '5E6270', LINE = 'BDC1CB', MINT = 'D8FEE5', FULL = 9638;
const m = S.meta;
const mmss = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const [vy, vm, vd] = m.last_verified.split('-').map(Number);
const verified = vd + ' ' + months[vm - 1] + ' ' + vy;

const para = (text, o = {}) => new Paragraph({ spacing: { after: o.after == null ? 60 : o.after },
  children: [new TextRun({ text, bold: !!o.bold, color: o.color || INK, size: o.size || 19 })] });
const lines = (text, o) => String(text).split('\n').map(l => para(l, Object.assign({ after: 20 }, o)));
const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(content, width, o = {}) {
  const children = Array.isArray(content) ? content : lines(content, o);
  return new TableCell({ width: { size: width, type: WidthType.DXA }, borders, children,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: o.head ? { fill: MINT, type: ShadingType.CLEAR, color: 'auto' } : undefined });
}
function table(widths, rows, head) {
  return new Table({ width: { size: FULL, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({ tableHeader: head && i === 0,
      children: r.map((c, j) => cell(c, widths[j], { head: head && i === 0, bold: head && i === 0, size: 18 })) })) });
}
const h = text => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 },
  children: [new TextRun({ text, bold: true, color: INK, size: 26 })] });

const body = [
  new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 80 }, children: [new TextRun({ text: m.title, bold: true, color: INK, size: 48 })] }),
  para(m.subtitle + '.', { color: MUTED, size: 23, after: 200 }),
  table([2200, FULL - 2200], [
    ['Task', m.task + ', Tokenisation Explainer Animation'], ['Asset', m.asset],
    ['Length', mmss(TL.total_seconds) + ' (' + TL.total_seconds.toFixed(1) + ' seconds)'],
    ['Video', S.video.width + ' x ' + S.video.height + ', ' + S.video.fps + ' fps, H.264 MP4, subtitles burned in, plus SRT and WebVTT files'],
    ['Voice', 'Synthetic voice, ' + S.voice.engine + ', voice ' + S.voice.voice],
    ['Script version', m.version], ['Last verified', verified + ', every quote checked against a snapshot of its source page']], false),
  h('How to read this document'),
  para('Section 1 is the script as it plays: the voiceover word for word and the text shown on screen. Section 2 lists every factual claim, the source page it comes from and the exact words on that page. Section 3 lists the source pages with the time each snapshot was taken and its SHA-256.'),
  h('1. Script'),
  table([1700, 4300, FULL - 6000], [['Time', 'Voiceover', 'On screen']].concat(S.scenes.map((sc, i) => [
    mmss(TL.scenes[i].start) + ' to ' + mmss(TL.scenes[i].end) + '\n' + sc.name, sc.vo.join(' '), sc.on_screen.join('\n')])), true),
  para('Stage tracker, shown in scenes ' + S.globals.tracker.shown_in.map(x => x.slice(1).replace(/^0/, '')).join(', ') + ': ' +
    S.globals.tracker.labels.map((l, i) => (i + 1) + ' ' + l).join(', ') + '. The current stage is highlighted.', { color: MUTED, size: 17 }),
  h('2. Fact check'),
];
const fc = [['#', 'Script says', 'Source', 'Exact words on the source page']]; let k = 0;
S.scenes.forEach(sc => sc.claims.forEach(c => { k++; const src = S.sources[c.source];
  fc.push([String(k), c.covers, src.title + '\n' + src.url, '"' + c.quote + '"']); }));
body.push(table([500, 2400, 2900, FULL - 5800], fc, true));
body.push(h('3. Sources'));
body.push(table([4300, FULL - 4300], [['Source', 'Snapshot']].concat(Object.values(S.sources).map(src => {
  const r = MAN[src.evidence]; return [src.title + '\n' + src.url, 'Captured ' + r.captured_utc + '\n' + r.file + '\nSHA-256 ' + r.sha256]; })), true));
body.push(h('4. Assets and licences'));
body.push(table([2400, FULL - 2400], [
  ['Voice', 'Kokoro-82M, voice af_heart. Apache License 2.0, commercial use allowed.'],
  ['Font', 'Montserrat. SIL Open Font License 1.1.'],
  ['Music', 'Made for this video from code. No third party audio.'],
  ['Icons and animation', 'Drawn for this video. No stock footage or stock icons.'],
  ['Logos', 'Tokeniser logo from tokeniser.com. Redbelly logo from the Redbelly brand kit.']], false));

const doc = new Document({
  creator: 'TASK-26', lastModifiedBy: 'TASK-26', title: m.title + ': script', description: m.subtitle,
  styles: { default: { document: { run: { font: 'Arial', size: 19, color: INK } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ children: [
      new TextRun({ text: m.title + ', script version ' + m.version + '. Last verified ' + verified + '.    Page ', color: MUTED, size: 16 }),
      new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 })] })] }) },
    children: body }]
});
fs.mkdirSync(path.join(ROOT, 'out/docs'), { recursive: true });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(path.join(ROOT, 'out/docs/tokenisation-explainer-script.docx'), b); console.log('docx written'); });
