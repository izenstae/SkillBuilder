/* ============================================================
   LANGUAGE ENGINE: shared by Swedish, Hebrew and Spanish
   The unit of learning is the word (or phrase), each on its own
   spaced-repetition schedule. The form of the question hardens
   as the word climbs the boxes, which is the "desirable
   difficulty" that makes retrieval build memory:
     box 0-1  recognition      see it, pick the meaning
     box 2    reverse          see the meaning, pick the word
     box 3    production       see the meaning, type the word
     box 4    cloze            type it into a sentence
     box 5+   ear and mouth    hear it and type it; say it
   Also: paradigm drills driven by tables (noun forms, verb
   forms), the conversation grader, and the CEFR level model.
   Pure functions; the screen supplies speech and a keyboard.
   ============================================================ */

var LG_NIQQUD = /[֑-ׇ]/g;                 /* U+0591–U+05C7: points, accents, and the maqaf, which lgStrip turns into a space first */
var LG_MAQAF = /־/g;                       /* U+05BE: the Hebrew hyphen joins words, so it becomes a space, not nothing */
var LG_FINALS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };   /* ך ם ן ף ץ -> כ מ נ פ צ */
var LG_LETTER = /[\p{L}\p{M}]/u;           /* a letter or a combining mark, in any script: \b fails for Hebrew and accented letters */

function lgStrip(s) { return String(s || "").replace(LG_MAQAF, " ").replace(LG_NIQQUD, ""); }
function lgNorm(s, lang) {
  s = String(s == null ? "" : s).normalize("NFC").trim().toLowerCase();
  s = s.replace(/\(.*?\)/g, "");                               /* "(to) run" -> "run" */
  s = s.replace(/[‘’]/g, "'");                                /* phone keyboards type curly apostrophes */
  if (lang === "he") { s = lgStrip(s).replace(/[ךםןףץ]/g, function (c) { return LG_FINALS[c]; }); s = s.replace(/[׳״'"]/g, ""); }
  s = s.replace(/[.,!?¿¡;:"“”„«»…–—]/g, " ").replace(/\s+/g, " ").trim();
  /* Swedish writes the time words both ways, i dag and idag, and both are right */
  if (lang === "sv") s = s.replace(/(^| )i (dag|går|morgon|kväll|natt|morse|förrgår)(?= |$)/g, "$1i$2");
  return s;
}
/* word boundaries, Unicode-aware: a boundary is the start or end of the string, or a neighbour that is not a letter */
function lgIsLetter(ch) { return !!ch && LG_LETTER.test(ch); }
/* index of `needle` in `hay` with a boundary on both sides, or -1; `loose` relaxes the right side (a token that STARTS with the needle) */
function lgFindWord(hay, needle, loose) {
  if (!needle) return -1;
  var i = hay.indexOf(needle);
  while (i >= 0) {
    if (!lgIsLetter(hay.charAt(i - 1)) && (loose || !lgIsLetter(hay.charAt(i + needle.length)))) return i;
    i = hay.indexOf(needle, i + 1);
  }
  return -1;
}
/* de-duplicate by a key; the first of each key wins */
function lgDistinct(list, keyOf) { var seen = {}, out = []; list.forEach(function (x) { var k = keyOf(x); if (!seen[k]) { seen[k] = 1; out.push(x); } }); return out; }
/* multiple-choice options: the answer plus up to k distractors, all distinct by their normalised form, shuffled; fewer than k when the pool is small */
function lgOptions(answer, pool, k, rnd, lang) {
  var key = function (x) { return lgNorm(x, lang) || String(x).toLowerCase(); }, ak = key(answer);
  var others = lgDistinct(lgShuffle(pool.filter(function (x) { return x != null && key(x) !== ak; }), rnd), key).slice(0, k);
  return lgShuffle([answer].concat(others), rnd);
}
/* accepted answers: "a / b" or "a; b" in a gloss means either is fine */
function lgSplit(g) { return String(g || "").split(/\s*[\/;]\s*|\s+or\s+/).map(function (x) { return x.trim(); }).filter(Boolean); }
/* leading words a typed answer may drop, applied in order ("to the" -> ""): English glosses, plus each language's own articles */
var LG_ARTICLES = { en: [/^(to|the|a|an) /, /^(the|a|an) /], sv: [/^(to|the|a|an|att|en|ett) /, /^(the|a|an) /], he: [/^(to|the|a|an) /, /^(the|a|an) /], es: [/^(el|la|los|las) /] };
function lgMatch(said, answers, lang) {
  var s = lgNorm(said, lang);
  if (!s) return false;
  var list = Array.isArray(answers) ? answers : [answers];
  var all = [];
  list.forEach(function (a) { all.push(a); lgSplit(a).forEach(function (x) { all.push(x); }); });
  return all.some(function (a) {
    var n = lgNorm(a, lang);
    if (n === s) return true;
    /* a leading article (and the infinitive marker) is optional, per language: in Spanish "en" and "a" are prepositions
       (en casa is not casa) and un/una can carry meaning (un poco is not poco), so only el/la/los/las drop */
    var art = LG_ARTICLES[lang] || LG_ARTICLES.en;
    var loose = function (x) { return art.reduce(function (y, r) { return y.replace(r, ""); }, x); };
    return loose(n) === loose(s);
  });
}
/* near miss: one letter off, for the "almost" feedback */
function lgDistance(a, b) {
  a = lgNorm(a); b = lgNorm(b);
  var m = a.length, n = b.length, d = [];
  for (var i = 0; i <= m; i++) { d[i] = [i]; }
  for (var j = 1; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

/* ---- the word list as skills ---- */
/* an entry: { id, w, g, pos, f (forms), ex, exg, t (transliteration), lesson, lang } */
function lgItem(lang, lesson, i, row) {
  var he = lang === "he";
  return he
    ? { id: lang + ":w:" + lesson + ":" + i, lang: lang, lesson: lesson, w: row[0], t: row[1], g: row[2], pos: row[3] || "", f: row[4] || "", ex: row[5] || "", exg: row[6] || "" }
    : { id: lang + ":w:" + lesson + ":" + i, lang: lang, lesson: lesson, w: row[0], g: row[1], pos: row[2] || "", f: row[3] || "", ex: row[4] || "", exg: row[5] || "" };
}
function lgShuffle(a, rnd) { rnd = rnd || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = (rnd() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function lgPickOthers(item, pool, k, rnd) {
  rnd = rnd || Math.random;
  var same = pool.filter(function (x) { return x !== item && x.pos === item.pos && lgNorm(x.g) !== lgNorm(item.g) && lgNorm(x.w) !== lgNorm(item.w); });
  var any = pool.filter(function (x) { return x !== item && lgNorm(x.g) !== lgNorm(item.g) && lgNorm(x.w) !== lgNorm(item.w); });
  var src = same.length >= k ? same : any;
  var out = [], used = {};
  src = lgShuffle(src.slice(), rnd);
  for (var i = 0; i < src.length && out.length < k; i++) { var key = lgNorm(src[i].g); if (!used[key]) { used[key] = 1; out.push(src[i]); } }
  return out;
}
var LG_LANG = { sv: { name: "Swedish", code: "sv-SE", rtl: false }, he: { name: "Hebrew", code: "he-IL", rtl: true }, es: { name: "Spanish", code: "es-MX", rtl: false } };

/* the word, as the learner should see it: Hebrew with points early, without later */
function lgShow(item, box) { return item.lang === "he" && box >= 4 ? lgStrip(item.w) : item.w; }
/* the example with the word blanked: { text, found } where `found` is the token taken out (the word itself, or an inflected
   form that starts with it, like "går" for gå); null when the word is not in the sentence on a word boundary */
function lgBlank(ex, w, lang) {
  var plain = lang === "he" ? lgStrip(ex) : String(ex || ""), target = (lang === "he" ? lgStrip(w) : String(w || "")).trim();
  var low = plain.toLowerCase(), t = target.toLowerCase();
  if (!t) return null;
  var i = lgFindWord(low, t, false), end;
  if (i >= 0) end = i + t.length;
  else {
    i = lgFindWord(low, t, true);
    if (i < 0) return null;
    end = i + t.length;
    while (end < plain.length && lgIsLetter(plain.charAt(end))) end++;
  }
  return { text: plain.slice(0, i) + "____" + plain.slice(end), found: plain.slice(i, end) };
}

/* One question for a word, shaped by its box. caps: { tts: bool, asr: bool } says what the device can do. */
function lgWordQ(item, box, pool, caps, rnd) {
  rnd = rnd || Math.random; caps = caps || {};
  var L = LG_LANG[item.lang], expl = [];
  var forms = item.f ? [item.f] : [];
  expl.push("<b>" + item.w + "</b>" + (item.t ? " <i>" + item.t + "</i>" : "") + " = " + item.g + (item.pos ? " <small>(" + item.pos + ")</small>" : ""));
  if (item.f) expl.push("Forms: " + item.f);
  if (item.ex) expl.push(item.ex + (item.exg ? " — " + item.exg : ""));
  var base = { item: item, lang: item.lang, speak: caps.tts ? { text: item.w, lang: L.code } : null, explain: expl, rtl: L.rtl };
  var kind = box <= 1 ? "recog" : box === 2 ? "reverse" : box === 3 ? "produce" : box === 4 && item.ex && lgBlank(item.ex, item.w, item.lang) ? "cloze" : caps.tts && rnd() < 0.5 ? "listen" : caps.asr && rnd() < 0.5 ? "speak" : "produce";
  if (kind === "recog") {
    var others = lgPickOthers(item, pool, 3, rnd);
    var opts = lgShuffle([item.g].concat(others.map(function (x) { return x.g; })), rnd);
    return Object.assign(base, { kind: "choice", question: "What does <b class='tw'>" + item.w + "</b>" + (item.t ? " <i class='tr'>" + item.t + "</i>" : "") + " mean?", options: opts, answer: item.g, target: 6, type: "recog" });
  }
  if (kind === "reverse") {
    var o2 = lgPickOthers(item, pool, 3, rnd);
    var opts2 = lgShuffle([item.w].concat(o2.map(function (x) { return x.w; })), rnd);
    return Object.assign(base, { kind: "choice", question: "Which word means <b>" + item.g + "</b>?", options: opts2, answer: item.w, target: 6, type: "reverse", speak: null, speakAfter: caps.tts ? { text: item.w, lang: L.code } : null });
  }
  if (kind === "produce") {
    return Object.assign(base, { kind: "text", question: "Type the " + L.name + " for <b>" + item.g + "</b>" + (item.pos ? " <small>(" + item.pos + ")</small>" : "") + ".", answer: item.w, accept: [item.w].concat(item.alt || []), target: 10, type: "produce", speak: null, speakAfter: caps.tts ? { text: item.w, lang: L.code } : null, keyboard: item.lang });
  }
  if (kind === "cloze") {
    /* the form in the sentence is the answer; the base word (and its alternatives) are accepted too */
    var blank = lgBlank(item.ex, item.w, item.lang);
    return Object.assign(base, { kind: "text", question: "Fill the gap: <span class='tw'>" + blank.text + "</span><br><small>" + item.exg + "</small>", answer: blank.found, accept: [blank.found, item.w].concat(item.alt || []), target: 12, type: "cloze", speak: null, speakAfter: caps.tts ? { text: item.ex, lang: L.code } : null, keyboard: item.lang });
  }
  if (kind === "listen") {
    var useEx = item.ex && rnd() < 0.5;
    return Object.assign(base, { kind: "text", question: "Listen, then type what you heard" + (useEx ? " (the whole sentence)." : "."), answer: useEx ? item.ex : item.w, accept: useEx ? [item.ex] : [item.w].concat(item.alt || []), target: useEx ? 20 : 10, type: "listen", speak: { text: useEx ? item.ex : item.w, lang: L.code }, hideText: true, keyboard: item.lang });
  }
  /* speak: say the word; the device listens, or you grade yourself */
  return Object.assign(base, { kind: "speak", question: "Say the " + L.name + " for <b>" + item.g + "</b> out loud.", answer: item.w, accept: [item.w].concat(item.alt || []), target: 8, type: "speak", listen: { lang: L.code }, speak: null, speakAfter: caps.tts ? { text: item.w, lang: L.code } : null });
}

/* a checkpoint question for a vocabulary lesson: recognition or reverse, so the first pass tests the reading */
function lgLessonQ(items, pool, caps, rnd) {
  rnd = rnd || Math.random;
  var item = items[(rnd() * items.length) | 0];
  return lgWordQ(item, rnd() < 0.5 ? 0 : 2, pool, caps, rnd);
}

/* ---- paradigm drills: a table row and a form to produce ---- */
/* table: { name, cols: ["infinitive","present",...], rows: [[...]], ask: [col indices that can be asked], given: col index shown } */
function lgFormQ(table, lang, rnd, caps) {
  rnd = rnd || Math.random; caps = caps || {};
  var row = table.rows[(rnd() * table.rows.length) | 0];
  var ask = table.ask[(rnd() * table.ask.length) | 0];
  var L = LG_LANG[lang];
  var expl = [row.map(function (c, i) { return "<b>" + table.cols[i] + "</b> " + c; }).join(" &middot; ")];
  if (table.note) expl.push(table.note);
  if (table.rule && table.rule[ask]) expl.push(table.rule[ask]);
  var given = table.given == null ? 0 : table.given;
  var q = { kind: "text", question: table.q ? table.q.replace("{w}", "<b class='tw'>" + row[given] + "</b>").replace("{g}", row[table.gloss == null ? row.length - 1 : table.gloss]).replace("{form}", table.cols[ask]) :
    "<b class='tw'>" + row[given] + "</b> (" + row[row.length - 1] + "): give the <b>" + table.cols[ask] + "</b>.",
    answer: row[ask], accept: lgSplit(row[ask]).concat([row[ask]]), target: table.target || 10, explain: expl, lang: lang, rtl: L.rtl, keyboard: lang, speakAfter: caps.tts ? { text: lgSplit(row[ask])[0], lang: L.code } : null };
  if (table.choice) {
    /* distractors are the distinct other forms in the table; with fewer than two options the question stays typed */
    var opts = lgOptions(row[ask], table.rows.filter(function (r) { return r !== row; }).map(function (r) { return r[ask]; }), 3, rnd, lang);
    if (opts.length >= 2) { q.kind = "choice"; q.options = opts; q.target = 7; }
  }
  return q;
}

/* ---- the conversation grader ---- */
/* a turn: { bot, botg, expect: [patterns], reject: [patterns], model, modelg, hint }. A reply passes when any expect pattern
   matches and no reject pattern does. A pattern without regex metacharacters is literal: normalised like the reply and matched
   on word boundaries ("ja" does not match "jag", "te" does not match "inte"); a multi-word literal matches a run of whole words.
   A pattern with metacharacters is a regex, tested unanchored as written, with Hebrew points stripped and finals folded. */
var LG_META = /[\\^$.*+?()[\]{}|]/;
function lgPatternOk(p, s, lang) {
  p = String(p == null ? "" : p);
  if (LG_META.test(p)) {
    var r = lang === "he" ? lgStrip(p).replace(/[ךםןףץ]/g, function (c) { return LG_FINALS[c]; }) : p.normalize("NFC");
    try { return new RegExp(r, "i").test(s); } catch (e) { return false; }
  }
  var n = lgNorm(p, lang);
  return !!n && lgFindWord(s, n, false) >= 0;
}
/* a reply that does the job must also be in Swedish word order: a mistake comes back as { ok: false, why, fix } */
function lgTurnCheck(turn, reply, lang) {
  var s = lgNorm(reply, lang);
  if (!s) return { ok: false };
  if ((turn.reject || []).some(function (p) { return lgPatternOk(p, s, lang); })) return { ok: false };
  if (!(turn.expect || []).some(function (p) { return lgPatternOk(p, s, lang); })) return { ok: false };
  var e = lang === "sv" ? lgSvOrder(reply) : null;
  return e ? { ok: false, why: e.msg, fix: e.fix } : { ok: true };
}
function lgTurnOk(turn, reply, lang) { return lgTurnCheck(turn, reply, lang).ok; }
function lgDialogueScore(sc, replies, lang) {
  var ok = 0, n = sc.turns.filter(function (t) { return t.expect; }).length;
  sc.turns.forEach(function (t, i) { if (t.expect && lgTurnOk(t, replies[i] || "", lang)) ok++; });
  return { ok: ok, n: n, score: n ? ok / n : 0 };
}

/* ---- sentence answers: a forgiven slip, and where the words went wrong ---- */
/* one word one letter off (two letters or longer) in a sentence of three or more words passes as a typo, unless the slip is itself a word the
   course knows (har for här, en for ett): that is a wrong word, not a typo. known: { word: 1 } in normalised form. */
function lgSlip(said, answers, lang, known) {
  var s = lgNorm(said, lang).split(" "), list = Array.isArray(answers) ? answers : [answers];
  if (s.length < 3) return null;
  for (var k = 0; k < list.length; k++) {
    var a = lgNorm(list[k], lang).split(" "), bad = [];
    if (a.length !== s.length) continue;
    for (var i = 0; i < a.length && bad.length < 2; i++) if (a[i] !== s[i]) bad.push(i);
    if (bad.length !== 1) continue;
    var w = s[bad[0]], r = a[bad[0]];
    if (w.length >= 2 && r.length >= 2 && lgDistance(w, r) === 1 && !(known && known[w])) return { said: w, right: r, answer: list[k] };
  }
  return null;
}
/* the reply's words marked right or wrong against the closest accepted answer, by longest common subsequence:
   { words: [{ w, ok }], missing: [words of the answer you left out], answer } */
function lgWordDiff(said, answers, lang) {
  var s = lgNorm(said, lang).split(" ").filter(Boolean), list = Array.isArray(answers) ? answers : [answers], best = null;
  list.forEach(function (ans) {
    var a = lgNorm(ans, lang).split(" ").filter(Boolean), m = s.length, n = a.length, L = [], i, j;
    for (i = 0; i <= m; i++) { L[i] = []; for (j = 0; j <= n; j++) L[i][j] = 0; }
    for (i = m - 1; i >= 0; i--) for (j = n - 1; j >= 0; j--) L[i][j] = s[i] === a[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = [], miss = [];
    i = 0; j = 0;
    while (i < m && j < n) { if (s[i] === a[j]) { out.push({ w: s[i], ok: true }); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ w: s[i], ok: false }); i++; } else { miss.push(a[j]); j++; } }
    for (; i < m; i++) out.push({ w: s[i], ok: false });
    for (; j < n; j++) miss.push(a[j]);
    if (!best || L[0][0] > best.score) best = { score: L[0][0], words: out, missing: miss, answer: ans };
  });
  return best;
}

/* ---- Swedish word order: the four mistakes English speakers make, found in free text ----
   Returns null, or { rule, msg, fix } for the first mistake: verb second after a fronted word or clause, inte after the
   verb in a main clause, BIFF in a subordinate clause, the verb after a question word, and att after a modal. */
var LG_SV_PRON = /^(jag|du|han|hon|vi|ni|de|dom|det|man)$/;
var LG_SV_FRONT = /^(idag|igår|imorgon|ikväll|inatt|imorse|iförrgår|nu|sedan|sen|därför|dessutom|ändå|tyvärr|ibland|ofta|snart|här|där|hemma|efteråt|plötsligt|först|alltså|annars)$/;
var LG_SV_FRONT2 = /^(på|i|efter|före|varje|förra|nästa|klockan)$/;
var LG_SV_SADV = /^(inte|aldrig|alltid|ofta|sällan)$/;
var LG_SV_SUB = /^(att|om|eftersom|som|när|fast|fastän|medan|innan|tills|ifall|varför)$/;
var LG_SV_LEADSUB = /^(om|när|eftersom|innan|fastän|fast|medan|ifall|tills)$/;
var LG_SV_QW = /^(vad|hur|varför|vem|vart|vilken|vilket|vilka)$/;
var LG_SV_MODAL = /^(kan|ska|måste|bör|kunde|skulle|borde|vill|ville)$/;
var LG_SV_DET = /^(en|ett|min|mitt|mina|din|ditt|dina|hans|hennes|vår|vårt|våra|er|ert|era|deras|den|det|de|alla|någon|något|några|många|mig|dig|honom|henne|oss|dem)$/;
function lgSvTokens(s) {
  var raw = String(s).normalize("NFC").replace(/[‘’]/g, "'").replace(/[.,!?¿¡;:"“”„«»…–—()]/g, " ").split(/\s+/).filter(Boolean), out = [];
  for (var i = 0; i < raw.length; i++) {
    var lo = raw[i].toLowerCase(), nx = (raw[i + 1] || "").toLowerCase();
    if (lo === "i" && /^(dag|går|morgon|kväll|natt|morse|förrgår)$/.test(nx)) { out.push({ raw: raw[i] + " " + raw[i + 1], lo: "i" + nx }); i++; }
    else out.push({ raw: raw[i], lo: lo });
  }
  return out;
}
function lgSvOrder(text) {
  var parts = String(text || "").match(/[^.!?]+[.!?]*/g) || [];
  for (var p = 0; p < parts.length; p++) {
    var sentence = parts[p], end = (sentence.match(/[.!?]+\s*$/) || [""])[0].trim(), t = lgSvTokens(sentence), lo = t.map(function (x) { return x.lo; });
    /* the corrected sentence: token `from` moved to position `to` */
    var fix = function (from, to) { var c = t.map(function (x) { return x.raw; }), w = c.splice(from, 1)[0]; c.splice(to, 0, w); var s = c.join(" "); return s.charAt(0).toUpperCase() + s.slice(1) + (end || "."); };
    if (lo.length < 3) continue;
    /* verb second after a fronted word: Idag jag spelar → Idag spelar jag */
    if (LG_SV_FRONT.test(lo[0]) && LG_SV_PRON.test(lo[1])) {
      return { rule: "v2", msg: "Verb second: after '" + t[0].raw + "' the verb comes next, then the subject.", fix: fix(LG_SV_SADV.test(lo[2]) && lo[3] ? 3 : 2, 1) };
    }
    /* ... and after a fronted phrase: På lördag vi spelar → På lördag spelar vi */
    if (lo.length >= 4 && LG_SV_FRONT2.test(lo[0]) && lo[1] !== "att" && !LG_SV_PRON.test(lo[1]) && LG_SV_PRON.test(lo[2]) && lo[3] !== "och")
      return { rule: "v2", msg: "Verb second: '" + t[0].raw + " " + t[1].raw + "' is the first element, so the verb comes next, then the subject.", fix: fix(3, 2) };
    /* a question word takes the verb straight after it: Vad du gör? → Vad gör du? */
    if (end.indexOf("?") >= 0 && LG_SV_QW.test(lo[0]) && LG_SV_PRON.test(lo[1]))
      return { rule: "q", msg: "In a question the verb comes straight after the question word, then the subject.", fix: fix(2, 1) };
    /* inte after the verb in a main clause: Jag inte vill → Jag vill inte */
    if (LG_SV_PRON.test(lo[0]) && LG_SV_SADV.test(lo[1]))
      return { rule: "inte", msg: "In a main clause '" + t[1].raw + "' goes after the verb.", fix: fix(2, 1) };
    /* a subordinate clause in front is position one, so the main verb follows the comma: Om det regnar, vi stannar → stannar vi */
    if (LG_SV_LEADSUB.test(lo[0]) && sentence.indexOf(",") > 0) {
      var after = lgSvTokens(sentence.slice(sentence.indexOf(",") + 1)), al = after.map(function (x) { return x.lo; });
      if (al.length >= 2 && LG_SV_PRON.test(al[0]) && !LG_SV_SADV.test(al[1])) {
        var head = sentence.slice(0, sentence.indexOf(",")).trim(), tail = after.map(function (x) { return x.raw; }), tmp = tail[0]; tail[0] = tail[1]; tail[1] = tmp;
        return { rule: "v2", msg: "The clause in front counts as position one, so the main verb comes straight after it, then the subject.", fix: head + " " + tail.join(" ") + (end || ".") };
      }
    }
    for (var i = 0; i + 2 < lo.length; i++) {
      /* BIFF: att han kommer inte → att han inte kommer */
      if (LG_SV_SUB.test(lo[i]) && LG_SV_PRON.test(lo[i + 1] || "") && lo[i + 2] && !LG_SV_SADV.test(lo[i + 2]) && LG_SV_SADV.test(lo[i + 3] || ""))
        return { rule: "biff", msg: "In a subordinate clause (after '" + t[i].raw + "') '" + t[i + 3].raw + "' goes before the verb.", fix: fix(i + 3, i + 2) };
      /* no att after a modal: vill att äta → vill äta */
      if (LG_SV_MODAL.test(lo[i]) && lo[i + 1] === "att" && lo[i + 2] && !LG_SV_PRON.test(lo[i + 2]) && !LG_SV_DET.test(lo[i + 2]) && /[aeiouyåäö]$/.test(lo[i + 2]) && t[i + 2].raw === lo[i + 2]) {
        var c2 = t.map(function (x) { return x.raw; }); c2.splice(i + 1, 1); var s2 = c2.join(" ");
        return { rule: "att", msg: "After '" + t[i].raw + "' comes the bare infinitive, without att.", fix: s2.charAt(0).toUpperCase() + s2.slice(1) + (end || ".") };
      }
    }
  }
  return null;
}

/* ---- the level model: CEFR from what you can do ----
   words: known (box >= 3) and automatic (box >= 5); grammar: lessons passed / total;
   use: average scores 0..1 in conversation, reading, listening, writing (null if none);
   hours: logged hours of study and immersion; need: the FSI estimate to professional working proficiency (ILR 3, roughly C1) */
var LG_CEFR = [
  { min: 0,  name: "A0", about: "Starting out. Sounds, the first hundred words." },
  { min: 10, name: "A1", about: "Breakthrough. Simple phrases, introduce yourself, ask and answer basic questions." },
  { min: 25, name: "A2", about: "Waystage. Routine exchanges, simple descriptions of your background and surroundings." },
  { min: 42, name: "B1", about: "Threshold. Handle travel, describe experiences, follow clear speech on familiar topics." },
  { min: 60, name: "B2", about: "Vantage. Fluent, spontaneous conversation with natives; read articles; argue a point." },
  { min: 78, name: "C1", about: "Proficient. Flexible, effective language for social, academic and professional life." },
  { min: 92, name: "C2", about: "Mastery. Near-native: nuance, idiom, register, anything you read or hear." }
];
var LG_NEED = { sv: 700, he: 1100 };    /* FSI hours to professional working proficiency: Swedish category I, Hebrew category III */
var LG_WORDS = 450;                      /* the vocabulary anchor when a course does not say how many words it has (the courses hold 425–1,121) */
/* vocabulary: 25 points for words known, 10 more for words automatic, each on a log curve anchored at the course's word count
   (st.total), so the term never falls when a word is promoted and all words automatic scores the full 35 */
function lgLevelScore(st) {
  var known = st.known || 0, auto = st.auto || 0, total = st.total > 0 ? st.total : LG_WORDS;
  var curve = function (n) { return Math.min(1, Math.log(1 + Math.max(0, n)) / Math.log(1 + total)); };
  var vocab = 25 * curve(known) + 10 * curve(auto);
  var grammar = 25 * (st.grammarTotal ? st.grammarPassed / st.grammarTotal : 0);
  var uses = ["conv", "read", "listen", "write"].map(function (k) { return st[k]; }).filter(function (x) { return x != null; });
  var use = uses.length ? 20 * (uses.reduce(function (a, b) { return a + b; }, 0) / uses.length) * Math.min(1, uses.length / 4 + 0.5) : 0;
  var hours = 20 * Math.min(1, (st.hours || 0) / (st.need || 700));
  return Math.max(0, Math.min(100, vocab + grammar + use + hours));
}
function lgLevel(st) {
  var sc = lgLevelScore(st), L = LG_CEFR[0];
  for (var i = 0; i < LG_CEFR.length; i++) if (sc >= LG_CEFR[i].min) L = LG_CEFR[i];
  var idx = LG_CEFR.indexOf(L), next = LG_CEFR[idx + 1] || null;
  return { score: sc, name: L.name, about: L.about, index: idx, next: next, toNext: next ? (sc - L.min) / (next.min - L.min) : 1 };
}

/* ---- numbers, for the number drills ---- */
function lgNumberWords(lang, n) {
  if (lang === "sv") {
    var ones = ["noll", "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv", "tretton", "fjorton", "femton", "sexton", "sjutton", "arton", "nitton"];
    var tens = ["", "", "tjugo", "trettio", "fyrtio", "femtio", "sextio", "sjuttio", "åttio", "nittio"];
    if (n < 20) return ones[n];
    if (n < 100) return tens[(n / 10) | 0] + (n % 10 ? ones[n % 10] : "");
    if (n < 1000) return (n >= 200 ? ones[(n / 100) | 0] : "") + "hundra" + (n % 100 ? lgNumberWords("sv", n % 100) : "");
    return (n >= 2000 ? ones[(n / 1000) | 0] + "tusen" : "ettusen") + (n % 1000 ? " " + lgNumberWords("sv", n % 1000) : "");   /* ett + tusen loses a t: ettusen */
  }
  /* Hebrew: the feminine forms, used for counting */
  var hOnes = ["אפס", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר"];
  var hTeens = ["", "אחת עשרה", "שתים עשרה", "שלוש עשרה", "ארבע עשרה", "חמש עשרה", "שש עשרה", "שבע עשרה", "שמונה עשרה", "תשע עשרה"];
  var hTens = ["", "", "עשרים", "שלושים", "ארבעים", "חמישים", "שישים", "שבעים", "שמונים", "תשעים"];
  if (n <= 10) return hOnes[n];
  if (n < 20) return hTeens[n - 10];
  if (n < 100) return hTens[(n / 10) | 0] + (n % 10 ? " ו" + hOnes[n % 10] : "");
  if (n === 100) return "מאה";
  /* ו joins only the last part: 125 is מאה עשרים וחמש, but 120 is מאה ועשרים and 115 מאה וחמש עשרה */
  var rest = function (r) { return r ? (r > 20 && r % 10 ? " " : " ו") + lgNumberWords("he", r) : ""; };
  if (n < 200) return "מאה" + rest(n % 100);
  if (n < 300) return "מאתיים" + rest(n % 100);
  if (n < 1000) return hOnes[(n / 100) | 0] + " מאות" + rest(n % 100);
  return "אלף" + (n % 1000 ? " ו" + lgNumberWords("he", n % 1000) : "");
}

/* ---- the alef-bet ---- */
var HE_LETTERS = [
  ["א", "alef", "silent (carries a vowel)", "a", ""], ["ב", "bet / vet", "b with a dot, v without", "b/v", ""], ["ג", "gimel", "g as in go", "g", ""],
  ["ד", "dalet", "d", "d", ""], ["ה", "he", "h (silent at the end of a word)", "h", ""], ["ו", "vav", "v; also the vowels o and u", "v/o/u", ""],
  ["ז", "zayin", "z", "z", ""], ["ח", "chet", "a throaty h, like Scottish loch", "ch", ""], ["ט", "tet", "t", "t", ""],
  ["י", "yod", "y; also the vowel i", "y/i", ""], ["כ", "kaf / chaf", "k with a dot, ch without", "k/ch", "ך"], ["ל", "lamed", "l", "l", ""],
  ["מ", "mem", "m", "m", "ם"], ["נ", "nun", "n", "n", "ן"], ["ס", "samech", "s", "s", ""], ["ע", "ayin", "silent in most modern speech (a pharyngeal in Mizrahi and Biblical reading)", "'", ""],
  ["פ", "pe / fe", "p with a dot, f without", "p/f", "ף"], ["צ", "tsadi", "ts as in cats", "ts", "ץ"], ["ק", "qof", "k", "k", ""],
  ["ר", "resh", "r (uvular in Israel)", "r", ""], ["ש", "shin / sin", "sh with the dot on the right, s with it on the left", "sh/s", ""], ["ת", "tav", "t", "t", ""]
];
var HE_VOWELS = [
  ["ַ", "patach", "a as in father", "a"], ["ָ", "kamatz", "a (o in a few words)", "a"], ["ֶ", "segol", "e as in bed", "e"], ["ֵ", "tsere", "e, a little longer", "e"],
  ["ִ", "chirik", "i as in machine", "i"], ["ֹ", "cholam", "o as in more", "o"], ["ֻ", "kubutz", "u as in rule", "u"], ["ְ", "shva", "a very short e, or silent", "e/-"]
];

if (typeof module !== "undefined") module.exports = {
  LG_LANG: LG_LANG, LG_CEFR: LG_CEFR, LG_NEED: LG_NEED, LG_WORDS: LG_WORDS, HE_LETTERS: HE_LETTERS, HE_VOWELS: HE_VOWELS,
  lgStrip: lgStrip, lgNorm: lgNorm, lgIsLetter: lgIsLetter, lgFindWord: lgFindWord, lgDistinct: lgDistinct, lgOptions: lgOptions, lgSplit: lgSplit, lgMatch: lgMatch, lgDistance: lgDistance, lgItem: lgItem, lgShuffle: lgShuffle, lgPickOthers: lgPickOthers,
  lgShow: lgShow, lgBlank: lgBlank, lgWordQ: lgWordQ, lgLessonQ: lgLessonQ, lgFormQ: lgFormQ, lgPatternOk: lgPatternOk, lgTurnCheck: lgTurnCheck, lgTurnOk: lgTurnOk, lgSlip: lgSlip, lgWordDiff: lgWordDiff, lgSvOrder: lgSvOrder, lgDialogueScore: lgDialogueScore,
  lgLevelScore: lgLevelScore, lgLevel: lgLevel, lgNumberWords: lgNumberWords
};
