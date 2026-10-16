/* Chess drills and the Play model: every generator yields a sound, engine-verified question; curated mates are real; play and grading work end to end. */
var vm = require("vm"), fs = require("fs"), path = require("path");
var ctx = { console: console, Math: Math, Date: Date, String: String, Object: Object, Array: Array, RegExp: RegExp, JSON: JSON, Number: Number, parseFloat: parseFloat, parseInt: parseInt, isFinite: isFinite, Error: Error, Int8Array: Int8Array, Infinity: Infinity };
vm.createContext(ctx);
["chess.js", "lang.js", "core.js", "chess_drills.js", "chess_course.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../sb", f), "utf8").replace(/\nif \(typeof module[\s\S]*$/, ""), ctx, { filename: f });
});
var n = 0, fails = 0;
function ok(c, m) { n++; if (!c) { fails++; console.log("  FAIL " + m); } }
/* mulberry32: a seeded generator with a full 2^32 period (the old LCG overflowed 2^53 and cycled every 10,466 draws) */
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var rnd = mulberry32(777);
var t0 = Date.now();

/* curated mates are mates */
ctx.CH_MATE1.forEach(function (c) {
  var s = ctx.chFromFen(c[0]), mm = ctx.chMatingMoves(s).map(function (m) { return ctx.chSan(s, m); });
  ok(mm.indexOf(c[1]) >= 0, "mate in 1 " + c[0] + " has " + c[1] + " (found " + mm.join(",") + ")");
});
ok(ctx.CH_MATE2.length >= 12, "at least twelve curated mates in two");
ctx.CH_MATE2.forEach(function (c) {
  var s = ctx.chFromFen(c[0]), firsts = ctx.chdMate2Firsts(s), m = ctx.chMateIn(s, 2);
  ok(!ctx.chInCheck(s, -s.side), "mate in 2 " + c[0] + " is a legal position");
  ok(firsts.indexOf(c[1]) >= 0, "mate in 2 " + c[0] + " accepts " + c[1] + " (accepted: " + firsts.join(",") + ")");
  ok(m && firsts.indexOf(ctx.chSan(s, m)) >= 0, "mate in 2 " + c[0] + ": the search's move " + (m ? ctx.chSan(s, m) : "none") + " is accepted");
  ok(!ctx.chMateIn(s, 1) && !ctx.chMatingMoves(s).length, "mate in 2 " + c[0] + " is not mate in 1");
  /* every accepted first move really forces mate: after it the search sees the opponent mated in one */
  firsts.forEach(function (san) { var mv = ctx.chParseSan(s, san); ctx.chMake(s, mv); var r = ctx.chSearch(s, 2, 300000); ok(r.score <= -ctx.CH_MATE + 3 && ctx.chLegal(s).length > 0, "mate in 2 " + c[0] + " " + san + " forces mate (" + r.score + ")"); ctx.chUnmake(s); });
});
/* every diagram in the course is a legal position */
ctx.COURSES.chess.lessonList.forEach(function (L) {
  (L.blocks || []).forEach(function (b) { if (b.t !== "board") return; var s = ctx.chFromFen(b.fen); ok(!ctx.chInCheck(s, -s.side), "diagram legal in " + L.id + ": " + b.fen); });
});
/* the course describes the draw rules the engine applies: fifty moves and threefold repetition end the game automatically */
var drawNote = ctx.COURSES.chess.lessonById.ch_check.blocks.filter(function (b) { return b.t === "rule"; })[0].note;
ok(/fifty/.test(drawNote) && /automatically/.test(drawNote) && /seventy-five/.test(drawNote), "ch_check says the fifty-move rule is automatic here and a claim over the board");
ok(ctx.chStatus(ctx.chFromFen("4k3/8/8/8/8/8/8/R3K3 w - - 100 80")) === "fifty", "the engine draws at fifty moves, as the course says");
/* the diagrams say what the engine says */
var dFork = ctx.chFromFen("r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1"), rFork = ctx.chSearch(dFork, 3);
ok(ctx.chSan(dFork, rFork.move) === "Nc7+" && rFork.score > 150, "ch_fork diagram: Nc7+ is the move and wins material (" + rFork.score + ")");
var dKq = ctx.chFromFen("7k/8/4Q1K1/8/8/8/8/8 w - - 0 1"), kqMates = ctx.chMatingMoves(dKq).map(function (m) { return ctx.chSan(dKq, m); }).sort();
ok(kqMates.join(",") === "Qc8#,Qe8#", "ch_kq diagram mates: " + kqMates.join(","));
ok(ctx.chdSquareRule(ctx.chIdx("e4"), ctx.chIdx("a3"), 1, false) === false && ctx.chdSquareRule(ctx.chIdx("e4"), ctx.chIdx("a3"), 1, true) === true, "ch_square diagram: queens with White to move, caught with Black to move");
var evalL = ctx.COURSES.chess.lessonById.ch_eval, tbl = evalL.blocks.filter(function (b) { return b.t === "tbl"; })[0];
tbl.rows.forEach(function (r) { var cp = Math.round(parseFloat(r[0]) * 100), want = Math.round(ctx.chWinProb(cp)); ok(r[1] === want + "%", "ch_eval table " + r[0] + " says " + r[1] + ", curve says " + want + "%"); });
ctx.COURSES.chess.formulas.filter(function (f) { return f.id === "ch_wpf"; })[0].anchors.forEach(function (a) { ok(a[1] === Math.round(ctx.chWinProb(parseInt(a[0], 10))) + "%", "ch_wpf anchor " + a[0] + " → " + a[1]); });
/* openings parse */
ctx.CH_OPENINGS.forEach(function (o) {
  var s = ctx.chStart(), okAll = true;
  o[0].split(/\s+/).forEach(function (tok) { var san = tok.replace(/^\d+\./, ""); if (!san) return; var m = ctx.chParseSan(s, san); if (!m) okAll = false; else ctx.chMake(s, m); });
  ok(okAll, "opening parses: " + o[0]);
});
/* the square rule agrees with the engine on small cases */
[["8/8/8/8/4P3/8/8/k3K3 b - - 0 1".replace("k3K3", "k6K"), null]].forEach(function () {});
function engineCatches(fen) {
  var s = ctx.chFromFen(fen), r = ctx.chSearch(s, 7, 900000);
  /* white to move wins if score is big (queening) from white's view */
  var whiteScore = s.side > 0 ? r.score : -r.score;
  return whiteScore < 400;
}
var cases = [["8/8/8/8/2k1P3/8/8/7K b - - 0 1", true], ["8/8/8/8/k3P3/8/8/7K b - - 0 1", true], ["8/8/8/8/k3P3/8/8/7K w - - 0 1", true], ["8/8/8/4P3/8/k7/8/7K w - - 0 1", false], ["8/8/8/4P3/8/2k5/8/7K b - - 0 1", false], ["8/8/8/k3P3/8/8/8/7K w - - 0 1", false], ["8/8/8/k3P3/8/8/8/7K b - - 0 1", true]];
cases.forEach(function (c) {
  var s = ctx.chFromFen(c[0]), pawn = ctx.chPieces(s).filter(function (p) { return p.kind === 1; })[0].sq, bk = ctx.chKingSq(s, -1);
  var rule = ctx.chdSquareRule(pawn, bk, 1, s.side < 0);
  ok(rule === c[1], "square rule " + c[0] + " expected " + c[1] + " got " + rule);
  ok(engineCatches(c[0]) === c[1], "engine agrees on " + c[0]);
});
/* every drill: many questions, right answer grades right */
var c = ctx.COURSES.chess;
ok(c.stages.length === 8, "chess has 8 stages");
Object.keys(c.drills).forEach(function (m) {
  var N = m === "chmate2" ? 3 : m === "chbest" ? 4 : 25;
  for (var k = 0; k < N; k++) {
    var q = ctx.skQuestion("chess:" + m, { rnd: rnd, caps: {} });
    ok(q && q.answer != null && q.question, "drill " + m + " q" + k);
    if (q.kind === "choice") ok(q.options.indexOf(q.answer) >= 0, "drill " + m + " answer among options");
    if (q.kind === "move" || q.kind === "square") {
      ok(q.board && q.board.fen, "drill " + m + " has a board");
      if (q.kind === "move") { var s = ctx.chFromFen(q.board.fen); (q.accept || [q.answer]).forEach(function (san) { ok(ctx.chParseSan(s, san), "drill " + m + " answer " + san + " is a legal move in " + q.board.fen); }); }
    }
    ok(ctx.gradeAnswer(q, q.answer).ok, "drill " + m + " right answer ok");
  }
});
/* mate-in-one generator answers really mate */
for (var k = 0; k < 6; k++) {
  var q1 = ctx.skQuestion("chess:chmate1", { rnd: rnd, caps: {} }), s1 = ctx.chFromFen(q1.board.fen);
  q1.accept.forEach(function (san) { var m = ctx.chParseSan(s1, san); ctx.chMake(s1, m); ok(ctx.chStatus(s1) === "checkmate", "generated mate in 1 is mate: " + san); ctx.chUnmake(s1); });
}
/* forks really attack two pieces, and the search agrees they are the move: within 60 cp of the best at depth 3 */
var forkT = 0, forkFallback = 0;
for (k = 0; k < 20; k++) {
  var ft = Date.now(), q2 = ctx.skQuestion("chess:chfork", { rnd: rnd, caps: {} }); forkT = Math.max(forkT, Date.now() - ft);
  var s2 = ctx.chFromFen(q2.board.fen), m2 = ctx.chParseSan(s2, q2.answer);
  if (q2.board.fen.indexOf("r3k3/8/8/3N4") === 0) forkFallback++;
  ctx.chMake(s2, m2); var hits = ctx.chAttacksFrom(s2, m2.to).filter(function (t) { var p = s2.b[t]; return p && p !== 7 && (p > 0) !== (s2.b[m2.to] > 0) && (Math.abs(p) === 6 || ctx.CH_VAL[Math.abs(p)] > ctx.CH_VAL[2]); });
  var afterFork = -ctx.chSearch(s2, 2, 60000).score; ctx.chUnmake(s2);
  ok(hits.length >= 2, "fork hits two: " + q2.answer);
  var bestF = ctx.chSearch(s2, 3, 60000).score;
  ok(bestF - afterFork <= 60, "fork " + q2.answer + " in " + q2.board.fen + " is within 60 cp of the best (" + bestF + " vs " + afterFork + ")");
  ok(afterFork - ctx.chEval(s2) >= 100, "fork " + q2.answer + " wins material against the best defence");
}
ok(forkFallback <= 4, "fork generation rarely falls back to the curated position (" + forkFallback + " of 20)");
ok(forkT < 1500, "a fork puzzle generates in under 1.5 s (worst " + forkT + " ms)");
var m2T = 0;
for (k = 0; k < 3; k++) { var mt = Date.now(), q3 = ctx.skQuestion("chess:chmate2", { rnd: rnd, caps: {} }); m2T = Math.max(m2T, Date.now() - mt); var s3 = ctx.chFromFen(q3.board.fen), f3 = ctx.chdMate2Firsts(s3); ok(q3.accept.join(",") === f3.join(","), "mate in 2 accepts every forcing first move: " + q3.accept.join(",")); }
ok(m2T < 1500, "a mate-in-two puzzle generates in under 1.5 s (worst " + m2T + " ms)");
/* every lesson that teaches a chess concept is drilled on the board: no rule-recall cards, no stage mix standing in for a drill */
c.lessonList.forEach(function (L) {
  if (!ctx.passable(L)) return;
  ok(L.mode !== "mixed", L.id + " has its own drill, not the stage mix");
  ok(L.mode !== "quiz" || L.id === "ch_bk_peak", L.id + " is drilled on the board (only Peak, a book about practice, keeps a quiz)");
  ok(L.mode === "quiz" || c.drills[L.mode], L.id + " names a real drill: " + L.mode);
  ctx.lessonSkillIds(c, L).forEach(function (id) { ok(id.indexOf("rule:") !== 0, L.id + " schedules no recall card: " + id); });
  ok(!ctx.skInfo("rule:chess:" + L.id), "old recall card rule:chess:" + L.id + " leaves the schedule");
});
ok(!ctx.skInfo("chess:q:ch_kq"), "a lesson that moved from a quiz to a drill drops its quiz skill");
/* pins: the pinned pieces are exactly the ones that cannot leave their line */
var sp = ctx.chFromFen("4k3/8/3p4/4n3/8/8/5P2/4R1K1 b - - 0 1");
ok(ctx.chdPinned(sp, -1).map(function (p) { return ctx.chName(p.sq); }).join() === "e5", "the lesson's pinned knight on e5");
ok(ctx.chLegal(sp).every(function (m) { return ctx.chName(m.from) !== "e5"; }), "and it has no legal move");
for (k = 0; k < 30; k++) {
  var qp = ctx.skQuestion("chess:chline", { rnd: rnd, caps: {} }), sq0 = ctx.chFromFen(qp.board.fen);
  if (qp.kind === "square") {
    var side = /White/.test(qp.question) ? 1 : -1;
    qp.accept.forEach(function (nm) {
      /* lift the piece: its own king must then be attacked along a line */
      var at = ctx.chIdx(nm), pc = sq0.b[at]; ok(pc && (pc > 0) === (side > 0), "pinned answer " + nm + " is a " + (side > 0 ? "white" : "black") + " piece");
      sq0.b[at] = 0; ok(ctx.chInCheck(sq0, side), "removing " + nm + " exposes its king in " + qp.board.fen); sq0.b[at] = pc;
    });
  } else {
    var mvp = ctx.chParseSan(sq0, qp.answer), before = ctx.chEval(sq0);
    ctx.chMake(sq0, mvp); var gain = -ctx.chSearch(sq0, 3, 200000).score - before; ctx.chUnmake(sq0);
    ok(gain >= 120, "line tactic " + qp.answer + " in " + qp.board.fen + " wins material (" + gain + ")");
  }
}
/* back-rank and basic mates: every accepted move mates (in one) or forces mate (in two) */
["chess:chbackrank", "chess:chbasicmate"].forEach(function (id) {
  for (var k = 0; k < 20; k++) {
    var q = ctx.skQuestion(id, { rnd: rnd, caps: {} }), s = ctx.chFromFen(q.board.fen);
    if (q.kind === "move" && /mate in one/i.test(q.question)) q.accept.forEach(function (san) { var m = ctx.chParseSan(s, san); ctx.chMake(s, m); ok(ctx.chStatus(s) === "checkmate", id + " " + san + " mates"); ctx.chUnmake(s); });
    else if (q.kind === "move" && /mate in two/i.test(q.question)) ok(q.accept.join() === ctx.chdMate2Firsts(s).join() && q.accept.length, id + " mate in two accepts every forcing first move");
    else if (/stalemate/.test(q.question) && /throws/.test(q.question)) q.options.forEach(function (o) { var m = ctx.chParseSan(s, o); ctx.chMake(s, m); ok((ctx.chStatus(s) === "stalemate") === (o === q.answer), id + " " + o + (o === q.answer ? " stalemates" : " does not stalemate")); ctx.chUnmake(s); });
    else if (/Checkmate, stalemate/.test(q.question)) { var st = ctx.chStatus(s); ok({ checkmate: "Checkmate", stalemate: "Stalemate", check: "Check, but not mate", "": "Neither: play goes on" }[st] === q.answer, id + " names the status of " + q.board.fen); }
  }
});
/* rook endings: legal positions, every accepted move legal; the curated set covers both results and both techniques */
ok(ctx.CH_ROOKEND.length >= 40, "at least forty Stockfish-checked rook endings");
["drop", "block"].forEach(function (k) { ok(ctx.CH_ROOKEND.filter(function (e) { return e.kind === k; }).length >= 10, "ten or more " + k + " positions"); });
["Win", "Draw"].forEach(function (a) { ok(ctx.CH_ROOKEND.filter(function (e) { return e.answer === a; }).length >= 8, "eight or more " + a + " results"); });
ctx.CH_ROOKEND.forEach(function (e) {
  var s = ctx.chFromFen(e.fen); ok(!ctx.chInCheck(s, -s.side) && ctx.chFromFen(e.fen) && ctx.chToFen(s).split(" ")[0] === e.fen.split(" ")[0], "rook ending legal: " + e.fen);
  var mat = ctx.chPieces(s).map(function (p) { return p.kind; }).sort().join(); ok(mat === "1,4,4,6,6", "rook and pawn against rook: " + e.fen);
  (e.accept || []).forEach(function (san) { ok(ctx.chParseSan(s, san), "rook ending move " + san + " legal in " + e.fen); });
});
/* pawn structure and pieces: the definitions on a known position */
var ps = ctx.chFromFen("4k3/pp4pp/8/3p4/8/4P3/PPP3PP/4K3 w - - 0 1");
ok(ctx.chdIsolated(ps, 1).map(ctx.chName).join() === "e3", "isolated: e3");
ok(ctx.chdIslands(ps, 1) === 3 && ctx.chdIslands(ps, -1) === 3, "islands: three each");
ok(ctx.chdPassed(ctx.chFromFen("4k3/8/8/8/2p5/8/P6P/4K3 w - - 0 1"), -1).map(ctx.chName).join() === "c4", "passed: Black's c4");
ok(ctx.chdDoubled(ctx.chFromFen("4k3/8/8/8/8/2P5/2P5/4K3 w - - 0 1"), 1).length === 2, "doubled c-pawns");
ok(ctx.chdOpenFiles(ps).map(function (f) { return "abcdefgh"[f]; }).join() === "f", "open file: f");
ok(ctx.chdChainBases(ctx.chFromFen("4k3/8/8/3P4/2P5/1P6/8/4K3 w - - 0 1"), 1).map(ctx.chName).join() === "b3", "chain d5-c4-b3: base b3");
ok(ctx.chdOutposts(ctx.chFromFen("4k3/pp5p/8/3p4/3P4/8/PP5P/4K3 w - - 0 1"), 1).map(ctx.chName).join() === "e5", "outpost e5: c5 can be hit from b7, e5 cannot");
ok(ctx.chdOutposts(ctx.chFromFen("4k3/p6p/8/2Pp4/3P4/8/P6P/4K3 w - - 0 1"), 1).map(ctx.chName).sort().join() === "d6,e5", "outposts d6 and e5; b6 is hit from a7");
/* the principled opening moves and the blunder check agree with the engine they quote */
for (k = 0; k < 8; k++) {
  var qd = ctx.skQuestion("chess:chdevelop", { rnd: rnd, caps: {} }), sd = ctx.chFromFen(qd.board.fen);
  qd.accept.forEach(function (san) { var m = ctx.chParseSan(sd, san); ok(m && ctx.chdPrincipled(sd, m), "opening move " + san + " is principled"); });
  var qb = ctx.skQuestion("chess:chblunder", { rnd: rnd, caps: {} });
  if (qb.kind === "choice") { var sb = ctx.chFromFen(qb.board.fen), san = qb.question.match(/play <b>([^<]+)<\/b>/)[1], mb = ctx.chParseSan(sb, san), best = ctx.chSearch(sb, 3, 40000).score;
    ctx.chMake(sb, mb); var v = ctx.chLegal(sb).length ? -ctx.chSearch(sb, 2, 15000).score : 0; ctx.chUnmake(sb);
    ok(qb.answer === "Blunder" ? Math.max(best, v) - v >= 250 : Math.max(best, v) - v <= 30, "blunder check on " + san + " is " + qb.answer); }
}
/* checkpoints for every lesson */
c.lessonList.forEach(function (L) {
  if (!ctx.passable(L)) return;
  for (var k = 0; k < 4; k++) { var q = ctx.cpQuestion(c, L, { rnd: rnd, caps: {} }); ok(q && q.answer != null, "checkpoint " + L.id); ok(ctx.gradeAnswer(q, q.answer).ok, "checkpoint right answer ok " + L.id); }
  ctx.lessonSkillIds(c, L).forEach(function (id) { ok(ctx.skInfo(id), "skill " + id); });
});
/* play: a short game against level 1, grading every hero move */
var g = ctx.chPlayNew(1, 1, rnd), moves = 0;
while (!g.over && moves < 30) {
  if (g.s.side === g.color) { var legal = ctx.chLegal(g.s); var best = ctx.chSearch(g.s, 2, 50000).move || legal[0]; var j = ctx.chHeroMove(g, best, 3); ok(j && j.grade, "hero move graded " + j.grade); }
  else ctx.chEngineMove(g);
  moves++;
}
ok(g.n > 5, "hero played moves: " + g.n);
var acc = ctx.chAccuracy(g); ok(acc && acc.accuracy > 50, "accuracy computed " + (acc && acc.accuracy.toFixed(0)));
var meanDrop = g.moves.filter(function (m) { return m.who === "hero"; }).reduce(function (a, m) { return a + m.drop; }, 0) / g.n;
ok(acc.accuracy <= 100 && (meanDrop === 0 ? acc.accuracy === 100 : acc.accuracy < 100), "accuracy is the mean of the per-move curve (" + acc.accuracy.toFixed(1) + ", mean drop " + (100 * meanDrop).toFixed(1) + ")");
var L = ctx.chlNew(); ctx.chlAddGame(L, g, Date.now());
var S = ctx.chlSummary(L); ok(S.n === g.n && S.games === 1, "level summary records the game");
ok(L.d.every(function (x) { return typeof x.d === "number"; }), "every recorded move stores its win% drop");
ok(Math.abs(S.accuracy - acc.accuracy) < 1e-9 && S.acpl != null, "the level summary carries the same accuracy and keeps ACPL");
/* accuracy anchors and a game of only best moves */
ok(Math.abs(ctx.chAccuracyOf([0.01, 0.01]) - 95.6) < 0.1 && Math.abs(ctx.chAccuracyOf([0.02]) - 91.4) < 0.1 && Math.abs(ctx.chAccuracyOf([0.05]) - 79.8) < 0.1, "mean drop 1% ≈ 95.6, 2% ≈ 91.4, 5% ≈ 79.8");
var gb = ctx.chPlayNew(2, 1, rnd);
for (var bi = 0; bi < 6 && !gb.over; bi++) { if (gb.s.side === gb.color) ctx.chHeroMove(gb, ctx.chSearch(gb.s, 3, 300000).move, 3); else ctx.chEngineMove(gb); }
var accB = ctx.chAccuracy(gb); ok(gb.n >= 3 && accB.accuracy === 100 && gb.grades.Best === gb.n, "a game of only best moves scores 100 (" + (accB && accB.accuracy) + ", " + gb.grades.Best + "/" + gb.n + " Best)");
var p0 = L.puzzle; ctx.chlPuzzle(L, 1200, true); ok(L.puzzle > p0, "puzzle rating rises on a solve"); ctx.chlPuzzle(L, 800, false); ok(L.puzzle < p0 + 60, "and falls on a miss");
/* every engine level answers */
for (var lv = 1; lv <= 6; lv++) { var g2 = ctx.chPlayNew(lv, -1, rnd); var tt = Date.now(); var mv = ctx.chEngineMove(g2); var dt = Date.now() - tt; ok(mv, "engine level " + lv + " moves in " + dt + "ms"); ok(dt < 8000, "engine level " + lv + " answers within 8 s (" + dt + " ms)"); }
console.log("chess drills: " + (n - fails) + "/" + n + " passed in " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
if (fails) process.exit(1);
