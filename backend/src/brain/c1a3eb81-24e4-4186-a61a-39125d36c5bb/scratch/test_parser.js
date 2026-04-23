
const fs = require('fs');

function _extractSection(markdown, headerPattern) {
  const match = markdown.match(
    new RegExp(`${headerPattern.source}([\\s\\S]*?)(?=\\n(?:---\\s*)?\\n?## |\\n# |$)`, 'i'),
  );
  return match?.[1]?.trim() ?? '';
}

function _parseMarkdownTable(block) {
  const lines = block.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2 || !lines[0]) return [];

  const headers = lines[0]
    .split('|')
    .map((h) => h.trim().toLowerCase().replace(/[\s_*]+/g, '_').replace(/[()]/g, ''))
    .filter(Boolean);

  console.log('Headers:', headers);

  return lines
    .slice(2)
    .map((line) => {
      const cols = line.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
      const row = {};
      headers.forEach((h, i) => { if (h) row[h] = cols[i] ?? ''; });
      return row;
    })
    .filter((r) => Object.values(r).some((v) => v.length > 0));
}

const markdown = fs.readFileSync('j_output.txt', 'utf8');
const estructuraBlock = _extractSection(markdown, /## 3\. ESTRUCTURA TEM[ÁA]TICA/);
console.log('Block:', estructuraBlock);
const res = _parseMarkdownTable(estructuraBlock);
console.log('Result:', res);
