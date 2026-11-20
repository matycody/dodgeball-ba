// Caritas de dibujo animado para los jugadores demo (SVG generado, sin servicios externos ni fotos de personas reales).
// carita(seed, sex) devuelve siempre la misma cara para la misma semilla.
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let a = hash(seed) || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; };
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const SKIN = ['#f5d5b8', '#efc29b', '#e3a97c', '#c98b5e', '#a8693f', '#7b4a2c'];
const HAIR = ['#1b1b1b', '#3a2416', '#5b3a1e', '#8a5a2b', '#c9a45c', '#a33a1f', '#6b6b6b'];
const BG = ['#2f3a5f', '#3d2f5f', '#2f5f4f', '#5f3d2f', '#2f4f5f', '#5f2f45', '#44505f'];
const SHIRT = ['#e5484d', '#3e63dd', '#30a46c', '#f5a623', '#8e4ec6', '#12a594', '#ffffff', '#111111'];

function carita(seed, sex = 'M') {
  const r = rng(seed);
  const skin = pick(r, SKIN), hair = pick(r, HAIR), bg = pick(r, BG), shirt = pick(r, SHIRT);
  const female = sex === 'F';
  const hairStyle = female ? pick(r, ['long', 'long', 'bun', 'bob', 'ponytail']) : pick(r, ['short', 'short', 'crew', 'cap', 'bald', 'curly']);
  const beard = !female && r() < 0.3;
  const glasses = r() < 0.2;
  const eyeY = 112 + Math.floor(r() * 4), eyeGap = 26 + Math.floor(r() * 5);
  const smile = pick(r, [0, 1, 2]);
  const mouth = smile === 0
    ? '<path d="M104 160 Q128 178 152 160" fill="none" stroke="#7a3b2e" stroke-width="5" stroke-linecap="round"/>'
    : smile === 1
      ? '<path d="M106 158 Q128 172 150 158 Q128 186 106 158 Z" fill="#fff" stroke="#7a3b2e" stroke-width="4" stroke-linejoin="round"/>'
      : '<path d="M112 162 Q128 170 144 162" fill="none" stroke="#7a3b2e" stroke-width="5" stroke-linecap="round"/>';

  const back = {
    long: `<path d="M62 120 Q62 40 128 40 Q194 40 194 120 L200 220 L56 220 Z" fill="${hair}"/>`,
    ponytail: `<ellipse cx="128" cy="112" rx="70" ry="76" fill="${hair}"/><path d="M180 90 Q232 100 214 170 Q196 130 180 120 Z" fill="${hair}"/>`,
    bob: `<path d="M60 150 Q54 44 128 42 Q202 44 196 150 Q190 178 176 176 L80 176 Q66 178 60 150 Z" fill="${hair}"/>`,
    bun: `<circle cx="128" cy="36" r="24" fill="${hair}"/>`,
    curly: `<g fill="${hair}"><circle cx="82" cy="84" r="26"/><circle cx="112" cy="62" r="28"/><circle cx="146" cy="62" r="28"/><circle cx="176" cy="84" r="26"/></g>`,
  }[hairStyle] ?? '';
  const front = {
    short: `<path d="M72 100 Q70 48 128 46 Q186 48 184 100 Q160 74 128 78 Q96 74 72 100 Z" fill="${hair}"/>`,
    crew: `<path d="M74 92 Q76 54 128 52 Q180 54 182 92 Q150 70 128 72 Q106 70 74 92 Z" fill="${hair}"/>`,
    cap: `<path d="M68 96 Q68 44 128 44 Q188 44 188 96 Z" fill="#c1121f"/><rect x="60" y="92" width="110" height="12" rx="6" fill="#8d0d17"/>`,
    long: `<path d="M68 104 Q68 46 128 46 Q188 46 188 104 Q158 70 128 78 Q98 70 68 104 Z" fill="${hair}"/>`,
    ponytail: `<path d="M68 104 Q68 46 128 46 Q188 46 188 104 Q158 70 128 78 Q98 70 68 104 Z" fill="${hair}"/>`,
    bob: `<path d="M66 108 Q66 46 128 46 Q190 46 190 108 Q150 78 128 82 Q106 78 66 108 Z" fill="${hair}"/>`,
    bun: `<path d="M68 104 Q68 48 128 48 Q188 48 188 104 Q158 72 128 80 Q98 72 68 104 Z" fill="${hair}"/>`,
    curly: `<path d="M76 98 Q80 66 128 64 Q176 66 180 98 Q150 80 128 82 Q106 80 76 98 Z" fill="${hair}"/>`,
    bald: '',
  }[hairStyle] ?? '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<rect width="256" height="256" fill="${bg}"/>
${back}
<path d="M40 256 Q44 200 96 196 L160 196 Q212 200 216 256 Z" fill="${shirt}"/>
<rect x="110" y="170" width="36" height="34" rx="12" fill="${skin}"/>
<ellipse cx="128" cy="116" rx="58" ry="66" fill="${skin}"/>
<ellipse cx="68" cy="122" rx="9" ry="14" fill="${skin}"/><ellipse cx="188" cy="122" rx="9" ry="14" fill="${skin}"/>
${beard ? `<path d="M72 130 Q74 190 128 190 Q182 190 184 130 Q170 160 128 160 Q86 160 72 130 Z" fill="${hair}" opacity=".92"/>` : ''}
${front}
<g fill="#1b1b1b"><ellipse cx="${128 - eyeGap}" cy="${eyeY}" rx="6" ry="7.5"/><ellipse cx="${128 + eyeGap}" cy="${eyeY}" rx="6" ry="7.5"/></g>
<g fill="#fff"><circle cx="${128 - eyeGap + 2}" cy="${eyeY - 3}" r="2"/><circle cx="${128 + eyeGap + 2}" cy="${eyeY - 3}" r="2"/></g>
<g stroke="${hair}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M${128 - eyeGap - 11} ${eyeY - 17} Q${128 - eyeGap} ${eyeY - 22} ${128 - eyeGap + 11} ${eyeY - 17}"/><path d="M${128 + eyeGap - 11} ${eyeY - 17} Q${128 + eyeGap} ${eyeY - 22} ${128 + eyeGap + 11} ${eyeY - 17}"/></g>
${glasses ? `<g fill="none" stroke="#222" stroke-width="4"><circle cx="${128 - eyeGap}" cy="${eyeY}" r="15"/><circle cx="${128 + eyeGap}" cy="${eyeY}" r="15"/><path d="M${128 - eyeGap + 15} ${eyeY} H${128 + eyeGap - 15}"/></g>` : ''}
<path d="M128 122 Q120 144 128 146 Q136 146 134 140" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="4" stroke-linecap="round"/>
${mouth}
${female ? `<g fill="#e7788a" opacity=".35"><ellipse cx="94" cy="148" rx="11" ry="7"/><ellipse cx="162" cy="148" rx="11" ry="7"/></g>` : ''}
</svg>`;
}

module.exports = { carita };
