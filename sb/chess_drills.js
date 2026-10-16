/* ============================================================
   CHESS DRILLS and the Play model
   Generators that build positions and verify the answer with the
   engine before asking, so every question is sound: which squares
   a piece reaches, notation, material, forks, mates in one and two,
   the best move, the square rule, the opposition, openings, Elo
   and win probability. Also the Play game loop (engine levels,
   per-move grading) and the chess level: the quality of your
   recent moves, and a tactics rating that moves like Elo.
   ============================================================ */

var CH_UNI = { 1: "♙", 2: "♘", 3: "♗", 4: "♖", 5: "♕", 6: "♔", "-1": "♟", "-2": "♞", "-3": "♝", "-4": "♜", "-5": "♛", "-6": "♚" };
function chdRnd(ctx) { return (ctx && ctx.rnd) || Math.random; }
function chdPick(a, rnd) { return a[(rnd() * a.length) | 0]; }
function chdSide(s) { return s.side > 0 ? "White" : "Black"; }
function chdPos(s, opts) { return Object.assign({ fen: chToFen(s), flip: s.side < 0 }, opts || {}); }

/* a playable middlegame-ish position, not over, with the side to move not in a silly spot */
function chdPosition(ctx, minPlies, maxPlies, test) {
  var rnd = chdRnd(ctx);
  for (var tries = 0; tries < 60; tries++) {
    var plies = minPlies + ((rnd() * (maxPlies - minPlies + 1)) | 0);
    var s = chRandomPosition(plies, rnd);
    if (chStatus(s) === "checkmate" || chStatus(s) === "stalemate") continue;
    if (!test || test(s)) return s;
  }
  return null;
}

/* ---- curated tactical positions, verified by the tests ---- */
var CH_MATE1 = [
  ["6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", "Ra8#", "Back-rank mate: the pawns box the king in."],
  ["r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", "Qxf7#", "Scholar's mate: queen and bishop on f7."],
  ["rn1q1bnr/ppp1kB1p/3p2p1/4N3/4P3/2N5/PPPP1PPP/R1BbK2R w KQ - 0 1", "Nd5#", "Légal's mate: White gave up the queen for this."],
  ["6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1", "Rc8#", "The classic back rank."],
  ["r1b2k1r/ppp2ppp/8/8/8/8/PPP2PPP/R2Q1RK1 w - - 0 1", "Qd8#", "The queen lands on the open d-file; the bishop on c8 blocks the rook's defence."],
  ["7k/5Q2/5K2/8/8/8/8/8 w - - 0 1", "Qg7#", "King and queen: the queen mates next to the king, protected."],
  ["1k6/R7/1K6/8/8/8/8/7R w - - 0 1", "Rh8#", "The ladder: one rook holds the seventh, the other mates on the eighth."],
  ["3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", "Rxd8#", "Trade the rooks: the recapture is impossible and the capture is mate."],
  ["2k5/8/2K5/8/8/8/8/7R w - - 0 1", "Rh8#", "King and rook: opposition, then the check on the edge."]
];

/* [fen, the model first move, note]; every first move that forces mate in two is accepted (chdMate2Firsts), and the tests verify each position */
var CH_MATE2 = [
  ["5r1k/6pp/8/4N3/8/1Q6/B7/7K w - - 0 1", "Qg8+", "Philidor's legacy, shortened: Qg8+ Rxg8, Nf7#."],
  ["5k2/8/4K3/8/8/8/8/7R w - - 0 1", "Rg1", "The rook takes the g-file, the king is forced to e8 in front of White's king, and the check on the eighth is mate: a quiet move wins."],
  ["2k5/8/3K4/8/8/8/8/R7 w - - 0 1", "Rb1", "The mirror image: Rb1 takes the b-file, Kd8 is forced, and Rb8 is mate."],
  ["k7/8/8/8/8/8/6R1/5R1K w - - 0 1", "Rf7", "Two rooks: one takes the seventh rank, the king must step to b8, and the other rook mates on the eighth."],
  ["7k/8/5K2/8/8/8/8/3Q4 w - - 0 1", "Qd7", "King and queen: a quiet move leaves the king one square, Kg8, and Qg7 is mate next to the king."],
  ["1k6/8/1K6/8/8/8/8/2Q5 w - - 0 1", "Qc7+", "Qc7+ drives the king into the corner and Qa7 mates; several quiet queen moves also force mate in two."],
  ["k7/8/2K5/8/8/8/8/7Q w - - 0 1", "Qb1", "The queen takes the b-file from a distance; the king has only a7, and Qb7 is mate."],
  ["r5k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1", "Qe8+", "Back-rank deflection: Qe8+ Rxe8, Rxe8#. The queen is given up to drag the defender off the rank."],
  ["4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w - - 0 1", "Qb8+", "Morphy's Opera game: Qb8+ Nxb8, Rd8#. The bishop on g5 guards d8."],
  ["r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 1", "Nf6+", "Légal's theme: Nf6+ gxf6, Bxf7#. The queen was given up for this."],
  ["r2q1r1k/pb2Nppp/8/7Q/8/R7/5PPP/6K1 w - - 0 1", "Qxh7+", "Anastasia's mate: Qxh7+ Kxh7, Rh3#. The knight on e7 takes g8 and g6 from the king."],
  ["5bk1/8/8/2q2b2/8/2N5/PP1N1PPP/2KR4 b - - 0 1", "Qxc3+", "Boden's mate: Qxc3+ bxc3, Ba3#. Two bishops on crossing diagonals against the castled king."]
];

var CH_OPENINGS = [
  ["1.e4 e5 2.Nf3 Nc6 3.Bb5", "Ruy Lopez (Spanish)", "Bb5 pressures the knight that defends e5."],
  ["1.e4 e5 2.Nf3 Nc6 3.Bc4", "Italian Game", "Bc4 eyes f7, the weakest square in Black's camp."],
  ["1.e4 c5", "Sicilian Defence", "Black fights for d4 with a wing pawn and keeps the game unbalanced."],
  ["1.e4 e6", "French Defence", "Black prepares d5; the c8 bishop is the long-term problem."],
  ["1.e4 c6", "Caro-Kann Defence", "Like the French, but the bishop gets out before e6."],
  ["1.d4 d5 2.c4", "Queen's Gambit", "A pawn offered for the centre; taking it is not winning it."],
  ["1.d4 Nf6 2.c4 g6 3.Nc3 Bg7", "King's Indian Defence", "Black lets White build a centre and attacks it later."],
  ["1.d4 Nf6 2.c4 e6 3.Nc3 Bb4", "Nimzo-Indian Defence", "The pin on c3 fights for e4 without a pawn."],
  ["1.d4 d5 2.Bf4", "London System", "A quiet setup White can play against anything."],
  ["1.e4 e5 2.Nf3 Nf6", "Petrov's Defence", "Black counterattacks e4 instead of defending e5."],
  ["1.c4", "English Opening", "A flank opening that often transposes to d4 systems."],
  ["1.e4 e5 2.f4", "King's Gambit", "A pawn for an open f-file and a fast attack."],
  ["1.d4 d5 2.c4 c6", "Slav Defence", "Black defends d5 with the c-pawn, keeping the bishop free."],
  ["1.e4 d6 2.d4 Nf6 3.Nc3 g6", "Pirc Defence", "A kingside fianchetto against White's full centre."],
  ["1.Nf3 d5 2.g3", "Réti / King's Indian Attack", "White fianchettos and strikes the centre from the side."],
  ["1.e4 e5 2.Nf3 Nc6 3.d4", "Scotch Game", "White opens the centre at once."]
];

/* rook and pawn against rook. Each position was generated from a Lucena or Philidor setup (shifted along the board,
   mirrored and colour-swapped) and every legal move scored by Stockfish 10 at depth 18 (the opening Philidor check at 26):
   accept = the moves that keep the result, and a position was kept only if every other move clearly changes it.
   drop: the pawn has reached the sixth, the defender holds by dropping the rook back to check from behind.
   block: Lucena, the attacking king has stepped out and is checked; the rook blocks on the fourth rank (the bridge).
   result: a win (Lucena: defending king cut off) or a draw (Philidor: defending king in front of the pawn). */
var CH_ROOKEND = [
  { kind: "drop", fen: "4k3/8/r3P3/5K2/8/8/8/7R b - - 0 1", accept: ["Ra4","Ra3","Ra2"] },
  { kind: "drop", fen: "7r/8/8/8/5k2/R3p3/8/4K3 w - - 0 1", accept: ["Ra6","Ra7","Ra5"] },
  { kind: "drop", fen: "3k4/8/3P3r/2K5/8/8/8/R7 b - - 0 1", accept: ["Rh4","Rh3","Rh2"] },
  { kind: "drop", fen: "r7/8/8/8/2k5/3p3R/8/3K4 w - - 0 1", accept: ["Rh6","Rh7","Rh5"] },
  { kind: "drop", fen: "4k3/8/r3P3/5K2/8/8/8/1R6 b - - 0 1", accept: ["Ra4","Ra3","Ra2"] },
  { kind: "drop", fen: "1r6/8/8/8/5k2/R3p3/8/4K3 w - - 0 1", accept: ["Ra5","Ra6","Ra7"] },
  { kind: "drop", fen: "5k2/8/1r3P2/6K1/8/8/8/2R5 b - - 0 1", accept: ["Rb4","Rb3","Rb2"] },
  { kind: "drop", fen: "2r5/8/8/8/6k1/1R3p2/8/5K2 w - - 0 1", accept: ["Rb5","Rb6","Rb7"] },
  { kind: "drop", fen: "2k5/8/2P3r1/1K6/8/8/8/5R2 b - - 0 1", accept: ["Rg4","Rg3","Rg2"] },
  { kind: "drop", fen: "5r2/8/8/8/1k6/2p3R1/8/2K5 w - - 0 1", accept: ["Rg5","Rg6","Rg7"] },
  { kind: "drop", fen: "3k4/8/3P3r/2K5/8/8/8/6R1 b - - 0 1", accept: ["Rh4","Rh3","Rh2"] },
  { kind: "drop", fen: "6r1/8/8/8/2k5/3p3R/8/3K4 w - - 0 1", accept: ["Rh5","Rh6","Rh7"] },
  { kind: "drop", fen: "4k3/8/4P2r/3K4/8/8/8/R7 b - - 0 1", accept: ["Rh4","Rh3","Rh2"] },
  { kind: "drop", fen: "r7/8/8/8/3k4/4p2R/8/4K3 w - - 0 1", accept: ["Rh5","Rh6","Rh7"] },
  { kind: "drop", fen: "3k4/8/r2P4/4K3/8/8/8/7R b - - 0 1", accept: ["Ra4","Ra3","Ra2"] },
  { kind: "drop", fen: "7r/8/8/8/4k3/R2p4/8/3K4 w - - 0 1", accept: ["Ra5","Ra6","Ra7"] },
  { kind: "block", fen: "8/1P2k3/8/1K6/3R4/8/8/1r6 w - - 0 1", accept: ["Rb4","Ka6","Kc6"] },
  { kind: "block", fen: "1R6/8/8/3r4/1k6/8/1p2K3/8 b - - 0 1", accept: ["Rb5","Ka3","Kc3"] },
  { kind: "block", fen: "8/2P2k2/8/2K5/4R3/8/8/2r5 w - - 0 1", accept: ["Rc4","Kb6","Kd6"] },
  { kind: "block", fen: "2R5/8/8/4r3/2k5/8/2p2K2/8 b - - 0 1", accept: ["Rc5","Kb3","Kd3"] },
  { kind: "block", fen: "8/3P2k1/8/3K4/5R2/8/8/3r4 w - - 0 1", accept: ["Rd4","Kc6","Ke6"] },
  { kind: "block", fen: "3R4/8/8/5r2/3k4/8/3p2K1/8 b - - 0 1", accept: ["Rd5","Kc3","Ke3"] },
  { kind: "block", fen: "8/4P2k/8/4K3/6R1/8/8/4r3 w - - 0 1", accept: ["Re4","Kf6","Kd6"] },
  { kind: "block", fen: "4R3/8/8/6r1/4k3/8/4p2K/8 b - - 0 1", accept: ["Re5","Kf3","Kd3"] },
  { kind: "block", fen: "8/k2P4/8/3K4/1R6/8/8/3r4 w - - 0 1", accept: ["Rd4","Kc6","Ke6"] },
  { kind: "block", fen: "3R4/8/8/1r6/3k4/8/K2p4/8 b - - 0 1", accept: ["Rd5","Kc3","Ke3"] },
  { kind: "block", fen: "8/1k2P3/8/4K3/2R5/8/8/4r3 w - - 0 1", accept: ["Re4","Kf6","Kd6"] },
  { kind: "block", fen: "4R3/8/8/2r5/4k3/8/1K2p3/8 b - - 0 1", accept: ["Re5","Kd3","Kf3"] },
  { kind: "block", fen: "8/2k2P2/8/5K2/3R4/8/8/5r2 w - - 0 1", accept: ["Rf4","Ke6","Kg6"] },
  { kind: "block", fen: "5R2/8/8/3r4/5k2/8/2K2p2/8 b - - 0 1", accept: ["Rf5","Ke3","Kg3"] },
  { kind: "block", fen: "8/3k2P1/8/6K1/4R3/8/8/6r1 w - - 0 1", accept: ["Rg4","Kf6","Kh6"] },
  { kind: "block", fen: "6R1/8/8/4r3/6k1/8/3K2p1/8 b - - 0 1", accept: ["Rg5","Kf3","Kh3"] },
  { kind: "result", fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "3K1k2/3P4/8/8/8/8/2r5/4R3 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "5K1k/5P2/8/8/8/8/4r3/6R1 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "1k1K4/3P4/8/8/8/8/4r3/2R5 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "3k1K2/5P2/8/8/8/8/6r1/4R3 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "3K4/3P1k2/8/8/8/8/2r5/4R3 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "5K2/5P1k/8/8/8/8/4r3/6R1 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "3K4/1k1P4/8/8/8/8/4r3/2R5 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "5K2/3k1P2/8/8/8/8/6r1/4R3 w - - 0 1", answer: "Win" },
  { kind: "result", fen: "4k3/8/r7/4PK2/8/8/8/1R6 w - - 0 1", answer: "Draw" },
  { kind: "result", fen: "1r6/8/8/8/4pk2/R7/8/4K3 b - - 0 1", answer: "Draw" },
  { kind: "result", fen: "5k2/8/1r6/5PK1/8/8/8/2R5 w - - 0 1", answer: "Draw" },
  { kind: "result", fen: "2r5/8/8/8/5pk1/1R6/8/5K2 b - - 0 1", answer: "Draw" },
  { kind: "result", fen: "6k1/8/2r5/6PK/8/8/8/3R4 w - - 0 1", answer: "Draw" },
  { kind: "result", fen: "3r4/8/8/8/6pk/2R5/8/6K1 b - - 0 1", answer: "Draw" },
  { kind: "result", fen: "1k6/8/5r2/KP6/8/8/8/4R3 w - - 0 1", answer: "Draw" },
  { kind: "result", fen: "4r3/8/8/8/kp6/5R2/8/1K6 b - - 0 1", answer: "Draw" },
  { kind: "result", fen: "2k5/8/6r1/1KP5/8/8/8/5R2 w - - 0 1", answer: "Draw" },
  { kind: "result", fen: "5r2/8/8/8/1kp5/6R1/8/2K5 b - - 0 1", answer: "Draw" },
  { kind: "result", fen: "3k4/8/7r/2KP4/8/8/8/6R1 w - - 0 1", answer: "Draw" },
  { kind: "result", fen: "6r1/8/8/8/2kp4/7R/8/3K4 b - - 0 1", answer: "Draw" },
  { kind: "result", fen: "4k3/8/8/4P3/4K3/8/r7/7R w - - 0 1", answer: "Draw" },
  { kind: "result", fen: "7r/R7/8/4k3/4p3/8/8/4K3 b - - 0 1", answer: "Draw" },
  { kind: "result", fen: "3k4/8/8/3P4/3K4/8/7r/R7 w - - 0 1", answer: "Draw" },
  { kind: "result", fen: "r7/7R/8/3k4/3p4/8/8/3K4 b - - 0 1", answer: "Draw" }
];

/* ---- generators ---- */
var CH_DRILLS = {};

CH_DRILLS.chmove = { name: "How the pieces move", target: 8, gen: function (ctx) {
  var rnd = chdRnd(ctx);
  var s = chdPosition(ctx, 0, 24) || chStart();
  var pieces = chPieces(s).filter(function (p) { return p.side === s.side && p.kind !== CH_K; });
  var legal = chLegal(s), choices = pieces.filter(function (p) { return legal.some(function (m) { return m.from === p.sq; }); });
  if (!choices.length) { s = chStart(); legal = chLegal(s); choices = chPieces(s).filter(function (p) { return p.side === 1 && legal.some(function (m) { return m.from === p.sq; }); }); }
  var p = chdPick(choices, rnd), targets = legal.filter(function (m) { return m.from === p.sq; }).map(function (m) { return chName(m.to); });
  var uniq = targets.filter(function (t, i) { return targets.indexOf(t) === i; });
  return { kind: "square", question: "Click a square the <b>" + CH_NAMES[p.kind] + "</b> on <b>" + chName(p.sq) + "</b> can move to.", answer: uniq[0], accept: uniq, target: 8,
    board: chdPos(s, { mark: [chName(p.sq)] }), explain: ["The " + CH_NAMES[p.kind] + " on " + chName(p.sq) + " can go to: " + uniq.join(", ") + ".", p.kind === CH_P ? "Pawns move forward one square (two from the start) and capture diagonally." : p.kind === CH_N ? "The knight jumps in an L: two squares one way, one square sideways, over anything." : p.kind === CH_B ? "The bishop slides diagonally until something is in the way." : p.kind === CH_R ? "The rook slides along ranks and files." : "The queen combines rook and bishop."] };
} };

CH_DRILLS.chnot = { name: "Notation", target: 5, gen: function (ctx) {
  var rnd = chdRnd(ctx), file = (rnd() * 8) | 0, rank = (rnd() * 8) | 0, name = chName(chSq(file, rank));
  if (rnd() < 0.5) return { kind: "square", question: "Click <b>" + name + "</b>.", answer: name, target: 5, board: { fen: "8/8/8/8/8/8/8/8 w - - 0 1", flip: rnd() < 0.3, coords: false }, explain: ["Files a to h run left to right from White's side; ranks 1 to 8 run up from White's side. " + name + " is file " + name[0] + ", rank " + name[1] + "."] };
  var others = []; while (others.length < 3) { var o = chName(chSq((rnd() * 8) | 0, (rnd() * 8) | 0)); if (o !== name && others.indexOf(o) < 0) others.push(o); }
  return { kind: "choice", question: "Which square is marked?", options: lgShuffle([name].concat(others), rnd), answer: name, target: 5, board: { fen: "8/8/8/8/8/8/8/8 w - - 0 1", mark: [name], coords: false }, explain: ["The marked square is " + name + "."] };
} };

CH_DRILLS.chcheck = { name: "Check", target: 7, gen: function (ctx) {
  var rnd = chdRnd(ctx);
  var s = chdPosition(ctx, 8, 40, function (x) { return rnd() < 0.5 ? chInCheck(x) : !chInCheck(x); }) || chStart();
  var inCheck = chInCheck(s), side = chdSide(s);
  if (inCheck && rnd() < 0.6) {
    var k = chKingSq(s, s.side), attackers = chPieces(s).filter(function (p) { return p.side === -s.side && chAttacksFrom(s, p.sq).indexOf(k) >= 0; });
    var a = attackers[0];
    var opts = lgShuffle([chName(a.sq)].concat(chPieces(s).filter(function (p) { return p.side === -s.side && p.sq !== a.sq; }).slice(0, 3).map(function (p) { return chName(p.sq); })), rnd);
    return { kind: "square", question: side + " is in check. Click the piece giving check.", answer: chName(a.sq), accept: attackers.map(function (p) { return chName(p.sq); }), target: 7, board: chdPos(s), explain: ["The " + CH_NAMES[a.kind] + " on " + chName(a.sq) + " attacks the king on " + chName(k) + ".", attackers.length > 1 ? "It is a double check: " + attackers.map(function (p) { return CH_NAMES[p.kind] + " on " + chName(p.sq); }).join(" and ") + ". Only a king move answers a double check." : "A check must be answered by moving the king, capturing the checker, or blocking the line."] };
  }
  return { kind: "choice", question: "Is <b>" + side + "</b> (to move) in check?", options: ["Yes", "No"], answer: inCheck ? "Yes" : "No", target: 7, board: chdPos(s), explain: [inCheck ? "Yes: an enemy piece attacks the king on " + chName(chKingSq(s, s.side)) + "." : "No: nothing attacks the king on " + chName(chKingSq(s, s.side)) + ". Look along every line to the king: diagonals, files, ranks, and the eight knight squares."] };
} };

CH_DRILLS.chmat = { name: "Counting material", target: 10, gen: function (ctx) {
  var s = chdPosition(ctx, 10, 60, function (x) { var m = chMaterial(x); return m.white !== m.black || chdRnd(ctx)() < 0.2; }) || chStart();
  var m = chMaterial(s), diff = m.white - m.black;
  return { kind: "num", question: "Count the material. <b>White minus Black</b>, on the 1/3/3/5/9 scale (negative if Black is ahead).", answer: diff, tol: 0, target: 10, board: chdPos(s, { flip: false }),
    explain: ["White: " + m.white + " · Black: " + m.black + " · difference " + (diff > 0 ? "+" : "") + diff + ".", "Pawn 1, knight 3, bishop 3, rook 5, queen 9. Count by piece type, not by scanning squares: queens first, then rooks, minors, pawns."] };
} };

CH_DRILLS.chvalue = { name: "Trades", target: 6, gen: function (ctx) {
  var rnd = chdRnd(ctx), kinds = [CH_P, CH_N, CH_B, CH_R, CH_Q];
  var give = [chdPick(kinds, rnd)], get = [chdPick(kinds, rnd)];
  if (rnd() < 0.4) give.push(chdPick(kinds, rnd)); if (rnd() < 0.3) get.push(chdPick(kinds, rnd));
  var vg = give.reduce(function (a, k) { return a + CH_POINTS[k]; }, 0), vt = get.reduce(function (a, k) { return a + CH_POINTS[k]; }, 0);
  var ans = vt > vg ? "Good for you" : vt < vg ? "Bad for you" : "Even";
  var names = function (ks) { return ks.map(function (k) { return CH_NAMES[k]; }).join(" and "); };
  return { kind: "choice", question: "You give up your <b>" + names(give) + "</b> and win their <b>" + names(get) + "</b>. Is the trade good, bad or even?", options: ["Good for you", "Bad for you", "Even"], answer: ans, target: 6,
    explain: ["You give " + vg + " points, you get " + vt + ": " + ans.toLowerCase() + ".", "The point scale is a guide. Two minor pieces usually beat a rook, a rook and pawn roughly equals two minors, and the bishop pair is worth about half a pawn extra."] };
} };

/* a knight fork on two pieces worth more than a knight (or king + anything), where the knight is safe */
function chdFindForks(s) {
  var out = [];
  chLegal(s).forEach(function (m) {
    if (Math.abs(m.piece) !== CH_N) return;
    chMake(s, m);
    var hit = chAttacksFrom(s, m.to).map(function (t) { return s.b[t]; }).filter(function (p) { return p && p !== CH_OFF && (p > 0) !== (s.b[m.to] > 0) && (Math.abs(p) === CH_K || CH_VAL[Math.abs(p)] > CH_VAL[CH_N]); });
    var safe = !chAttacked(s, m.to, s.side) || chAttacked(s, m.to, -s.side);
    chUnmake(s);
    if (hit.length >= 2 && safe) out.push({ m: m, hit: hit });
  });
  return out;
}
/* the forks that survive a short search: within CH_FORK_SLACK of the engine's best move at depth 3 and winning material against the best defence */
var CH_FORK_DEPTH = 3, CH_FORK_LIMIT = 60000, CH_FORK_SLACK = 50, CH_FORK_GAIN = 150;
function chdForkScore(s, m) { chMake(s, m); var r = chSearch(s, CH_FORK_DEPTH - 1, CH_FORK_LIMIT); chUnmake(s); return -r.score; }
function chdSoundForks(s, forks) {
  var best = chSearch(s, CH_FORK_DEPTH, CH_FORK_LIMIT).score, before = chEval(s), out = [];
  forks.forEach(function (f) { var v = chdForkScore(s, f.m); if (best - v <= CH_FORK_SLACK && v - before >= CH_FORK_GAIN) out.push(f); });
  return out;
}
/* a built fork: the enemy king and a rook or queen a knight's move from one square, our knight a knight's move away, kings and a few extra men placed legally */
function chdBuildFork(rnd) {
  var side = rnd() < 0.5 ? 1 : -1;
  for (var t = 0; t < 40; t++) {
    var s = chNew(); s.side = side;
    var to = chSq((rnd() * 8) | 0, (rnd() * 8) | 0);
    var A = lgShuffle(CH_KNIGHT.map(function (d) { return to + d; }).filter(chOnBoard), rnd);
    if (A.length < 3) continue;
    s.b[A[0]] = -CH_K * side; s.b[A[1]] = -side * chdPick([CH_R, CH_R, CH_Q], rnd); s.b[A[2]] = CH_N * side;
    var placed = false;
    for (var k = 0; k < 20 && !placed; k++) {
      var wk = chSq((rnd() * 8) | 0, (rnd() * 8) | 0);
      if (s.b[wk] || wk === to || Math.max(Math.abs(chFile(wk) - chFile(A[0])), Math.abs(chRank(wk) - chRank(A[0]))) <= 1) continue;
      s.b[wk] = CH_K * side; if (chAttacked(s, wk, -side)) { s.b[wk] = 0; continue; } placed = true;
    }
    if (!placed || chInCheck(s, -side)) continue;
    var extra = 2 + ((rnd() * 5) | 0);
    for (k = 0; k < extra; k++) {
      var sq = chSq((rnd() * 8) | 0, 1 + ((rnd() * 6) | 0));
      if (s.b[sq] || sq === to) continue;
      s.b[sq] = chdPick([CH_P, CH_P, CH_P, CH_P, CH_N, CH_B], rnd) * (rnd() < 0.5 ? 1 : -1);
      if (chInCheck(s, side) || chInCheck(s, -side)) s.b[sq] = 0;
    }
    var forks = chdFindForks(s).filter(function (f) { return f.m.to === to; });
    if (forks.length) return { s: s, forks: forks };
  }
  return null;
}
CH_DRILLS.chfork = { name: "Forks", target: 12, gen: function (ctx) {
  var rnd = chdRnd(ctx), best = null, t0 = Date.now();
  /* first a fork that arose in a random game, then a built one; each is kept only if the search agrees it is the move */
  for (var t = 0; t < 40 && !best && Date.now() - t0 < 250; t++) {
    var s = chRandomPosition(10 + ((rnd() * 30) | 0), rnd);
    if (chStatus(s) === "checkmate" || chStatus(s) === "stalemate" || chInCheck(s)) continue;
    var f = chdFindForks(s);
    if (f.length) { f = chdSoundForks(s, f); if (f.length) best = { s: s, forks: f }; }
  }
  for (t = 0; t < 6 && !best && Date.now() - t0 < 800; t++) {
    var built = chdBuildFork(rnd);
    if (built) { var fb = chdSoundForks(built.s, built.forks); if (fb.length) best = { s: built.s, forks: fb }; }
  }
  if (!best) { var s2 = chFromFen("r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1"); best = { s: s2, forks: chdSoundForks(s2, chdFindForks(s2)) }; }
  if (!best.forks.length) return CH_DRILLS.chbest.gen(ctx);
  var S = best.s, F = best.forks, sans = F.map(function (f) { return chSan(S, f.m); });
  var f0 = F[0];
  return { kind: "move", question: chdSide(S) + " to move. Find the <b>knight fork</b>: one move that attacks two valuable pieces at once.", answer: sans[0], accept: sans, target: 12, board: chdPos(S), elo: 1100,
    explain: ["<b>" + sans[0] + "</b> attacks " + f0.hit.map(function (p) { return "the " + CH_NAMES[Math.abs(p)]; }).join(" and ") + " at once" + (sans.length > 1 ? " (also: " + sans.slice(1).join(", ") + ")" : "") + ".", "A fork works because one piece can only move once: whatever is saved, the other is lost. Knights fork best because their attack cannot be blocked and they attack squares of the colour they do not stand on."] };
} };

CH_DRILLS.chmate1 = { name: "Mate in one", target: 15, gen: function (ctx) {
  var rnd = chdRnd(ctx), found = null;
  for (var t = 0; t < 120 && !found; t++) {
    var s = chRandomPosition(20 + ((rnd() * 50) | 0), rnd);
    var st = chStatus(s); if (st === "checkmate" || st === "stalemate") continue;
    var mm = chMatingMoves(s);
    if (mm.length && chCount(s) >= 6) found = { s: s, mm: mm };
  }
  var curated = false;
  if (!found) { var c = chdPick(CH_MATE1, rnd), sc = chFromFen(c[0]); found = { s: sc, mm: chMatingMoves(sc), note: c[2] }; curated = true; }
  var S = found.s, sans = found.mm.map(function (m) { return chSan(S, m); });
  return { kind: "move", question: chdSide(S) + " to move. <b>Mate in one.</b>", answer: sans[0], accept: sans, target: 15, board: chdPos(S), elo: curated ? 1000 : 1100,
    explain: ["<b>" + sans[0] + "</b>" + (sans.length > 1 ? " (also " + sans.slice(1).join(", ") + ")" : "") + "." + (found.note ? " " + found.note : ""), "Mate in one: look at every check first. A checking move that leaves the king no square, no block and no capture is the answer."] };
} };

/* does the side to move have a mate in one? (chMatingMoves with an early exit) */
function chdHasMate1(s) { var ms = chLegal(s); for (var i = 0; i < ms.length; i++) { chMake(s, ms[i]); var mate = chInCheck(s) && !chLegal(s).length; chUnmake(s); if (mate) return true; } return false; }
/* every first move that forces mate in two (the opponent has a reply, and each reply allows mate in one), as SAN */
function chdMate2Firsts(s) {
  var out = [];
  chLegal(s).forEach(function (m) {
    chMake(s, m);
    var replies = chLegal(s), ok = replies.length > 0;
    for (var i = 0; i < replies.length && ok; i++) { chMake(s, replies[i]); ok = chdHasMate1(s); chUnmake(s); }
    chUnmake(s);
    if (ok) out.push(chSan(s, m));
  });
  return out;
}
CH_DRILLS.chmate2 = { name: "Mate in two", target: 40, gen: function (ctx) {
  var rnd = chdRnd(ctx), found = null, t0 = Date.now();
  for (var t = 0; t < 12 && !found && Date.now() - t0 < 400; t++) {
    var s = chRandomPosition(20 + ((rnd() * 50) | 0), rnd);
    var st = chStatus(s); if (st === "checkmate" || st === "stalemate" || chCount(s) < 6) continue;
    if (chdHasMate1(s)) continue;
    if (chdMate2Firsts(s).length) found = { s: s, note: "" };
  }
  if (!found) { var c = chdPick(CH_MATE2, rnd); found = { s: chFromFen(c[0]), note: c[2] }; }
  var S = found.s, sans = chdMate2Firsts(S);
  if (!sans.length) { var m0 = chMateIn(S, 2); sans = [m0 ? chSan(S, m0) : chSan(S, chLegal(S)[0])]; }
  return { kind: "move", question: chdSide(S) + " to move. <b>Mate in two.</b> Play the first move.", answer: sans[0], accept: sans, target: 40, board: chdPos(S), elo: 1400,
    explain: ["<b>" + sans[0] + "</b>" + (sans.length > 1 ? " (also " + sans.slice(1).join(", ") + ")" : "") + "." + (found.note ? " " + found.note : " Every reply allows mate next move."), "Mate in two: find a forcing first move (check, capture or threat) after which every reply allows mate in one. Calculate the opponent's every option, not just the obvious one."] };
} };

/* the depth-3 verdict re-checked deeper: every accepted move searched to CH_BEST_DEEP plies, and every other move proven at least CH_BEST_MARGIN worse with a null-window search; a budget overrun counts as a failure */
var CH_BEST_DEEP = 5, CH_BEST_MARGIN = 150, CH_BEST_LIMIT = 120000;
function chdBestHolds(s, sc, accept) {
  var v = Infinity, i, r, cx, w;
  for (i = 0; i < sc.length; i++) {
    if (accept.indexOf(sc[i].san) < 0) continue;
    chMake(s, sc[i].move); r = chLegal(s).length ? chSearch(s, CH_BEST_DEEP - 1, CH_BEST_LIMIT) : null; chUnmake(s);
    if (!r || r.depth < CH_BEST_DEEP - 1) return false;
    v = Math.min(v, -r.score);
  }
  var bound = v - CH_BEST_MARGIN;
  for (i = 0; i < sc.length; i++) {
    if (accept.indexOf(sc[i].san) >= 0) continue;
    chMake(s, sc[i].move);
    cx = { nodes: 0, limit: CH_BEST_LIMIT, aborted: false, best: null, pvFirst: null };
    w = chLegal(s).length ? -chAlphaBeta(s, CH_BEST_DEEP - 1, -bound - 1, -bound, cx, 1) : (chInCheck(s) ? CH_MATE : 0);
    chUnmake(s);
    if (cx.aborted || w > bound) return false;
  }
  return true;
}
CH_DRILLS.chbest = { name: "Best move", target: 30, gen: function (ctx) {
  var rnd = chdRnd(ctx), found = null;
  var acceptOf = function (sc) { return sc.filter(function (x) { return sc[0].score - x.score <= 30; }).map(function (x) { return x.san; }); };
  for (var t = 0; t < 40 && !found; t++) {
    var s = chRandomPosition(16 + ((rnd() * 40) | 0), rnd);
    var st = chStatus(s); if (st === "checkmate" || st === "stalemate") continue;
    var sc = chScoreMoves(s, 3, 60000);
    if (sc.length >= 4 && sc[0].score - sc[1].score >= 250 && sc[0].score < CH_MATE - 50 && Math.abs(sc[0].score) < 1500 && chdBestHolds(s, sc, acceptOf(sc))) found = { s: s, sc: sc };
  }
  if (!found) { var s2 = chFromFen("4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1"); found = { s: s2, sc: chScoreMoves(s2, 3, 60000) }; }
  var S = found.s, top = found.sc[0], second = found.sc[1];
  var accept = acceptOf(found.sc);
  return { kind: "move", question: chdSide(S) + " to move. <b>Find the best move.</b> There is one clearly best; the engine graded every option.", answer: top.san, accept: accept, target: 30, board: chdPos(S), elo: 1300,
    explain: ["<b>" + top.san + "</b>, worth about " + (top.score / 100).toFixed(1) + " pawns; the next best, " + second.san + ", is worth " + (second.score / 100).toFixed(1) + ".", "Method: list the checks, captures and threats for both sides first (CCT). The best move is usually among them, and the ones you did not consider are the ones that lose games."] };
} };

/* the square rule: can the defending king catch a passed pawn with no other pieces on the board? */
function chdSquareRule(pawnSq, kingSq, pawnSide, kingToMove) {
  var pf = chFile(pawnSq), pr = chRank(pawnSq), promoRank = pawnSide > 0 ? 7 : 0;
  var dist = Math.abs(promoRank - pr); if ((pawnSide > 0 && pr === 1) || (pawnSide < 0 && pr === 6)) dist -= 1;   /* the double step */
  var kd = Math.max(Math.abs(chFile(kingSq) - pf), Math.abs(chRank(kingSq) - promoRank));
  return kd <= dist + (kingToMove ? 1 : 0);
}
CH_DRILLS.chsquare = { name: "The square rule", target: 12, gen: function (ctx) {
  var rnd = chdRnd(ctx);
  for (var t = 0; t < 200; t++) {
    var pf = (rnd() * 8) | 0, pr = 1 + ((rnd() * 5) | 0), pawn = chSq(pf, pr);
    var kf = (rnd() * 8) | 0, kr = 3 + ((rnd() * 5) | 0), king = chSq(kf, kr);
    var wk = chSq((rnd() * 8) | 0, 0);
    if (king === pawn || wk === pawn || Math.abs(kf - pf) <= 1 && kr - pr <= 1 && kr >= pr || Math.max(Math.abs(chFile(wk) - kf), Math.abs(chRank(wk) - kr)) <= 1) continue;
    if (Math.abs(chFile(wk) - pf) <= 1 && chRank(wk) < pr) {} /* fine: white king behind is irrelevant to the rule */
    var s = chNew(); s.b[pawn] = CH_P; s.b[king] = -CH_K; s.b[wk] = CH_K;
    var blackToMove = rnd() < 0.5; s.side = blackToMove ? -1 : 1;
    if (chInCheck(s, -1) || chAttacked(s, wk, -1)) continue;
    if (Math.abs(chFile(wk) - pf) <= 1 && chRank(wk) > pr) continue;   /* the white king must not be able to help; keep it behind */
    var catches = chdSquareRule(pawn, king, 1, blackToMove);
    return { kind: "choice", question: "Only kings and this pawn. <b>" + (blackToMove ? "Black" : "White") + " to move.</b> Can the black king catch the pawn before it queens?", options: ["Yes, it catches it", "No, the pawn queens"], answer: catches ? "Yes, it catches it" : "No, the pawn queens", target: 12, board: { fen: chToFen(s), flip: false },
      explain: ["The pawn on " + chName(pawn) + " needs " + (Math.abs(7 - pr) - (pr === 1 ? 1 : 0)) + " moves to queen on " + chName(chSq(pf, 7)) + "; the king on " + chName(king) + " is " + Math.max(Math.abs(kf - pf), Math.abs(kr - 7)) + " king-moves from that square.", "Draw the square whose side runs from the pawn to its queening square. With the pawn to move, the king must already be inside it; with the king to move, stepping inside is enough. In numbers: king-moves to the queening square ≤ pawn-moves to queen, plus one if the king moves first. A pawn on its starting square counts as one rank further on because of the double step."] };
  }
  return CH_DRILLS.chvalue.gen(ctx);
} };

/* the opposition: kings on the same file or rank with one square between, and the other side to move */
CH_DRILLS.chopp = { name: "The opposition", target: 12, gen: function (ctx) {
  var rnd = chdRnd(ctx);
  for (var t = 0; t < 200; t++) {
    var wk = chSq(1 + ((rnd() * 6) | 0), 1 + ((rnd() * 4) | 0)), bk = chSq(chFile(wk) + (rnd() < 0.5 ? 0 : (rnd() < 0.5 ? -1 : 1)) , chRank(wk) + 3);
    if (!chOnBoard(bk)) continue;
    var s = chNew(); s.b[wk] = CH_K; s.b[bk] = -CH_K; s.side = 1;
    var moves = chLegal(s), opp = moves.filter(function (m) { return (chFile(m.to) === chFile(bk) && Math.abs(chRank(m.to) - chRank(bk)) === 2) || (chRank(m.to) === chRank(bk) && Math.abs(chFile(m.to) - chFile(bk)) === 2); });
    if (opp.length !== 1) continue;
    var all = moves.map(function (m) { return chName(m.to); });
    return { kind: "square", question: "Kings only, <b>White to move</b>. Click the square that takes the <b>opposition</b> (kings facing, one square between).", answer: chName(opp[0].to), accept: [chName(opp[0].to)], target: 12, board: { fen: chToFen(s), flip: false },
      explain: ["<b>" + chName(opp[0].to) + "</b>: the kings face each other with one square between and Black must move, so Black must give way.", "Opposition = same file or rank, one square apart, the other side to move. In king-and-pawn endings it decides whether the king gets through. Legal king moves here: " + all.join(", ") + "."] };
  }
  return CH_DRILLS.chsquare.gen(ctx);
} };

CH_DRILLS.chelo = { name: "Elo", target: 20, gen: function (ctx) {
  var rnd = chdRnd(ctx), ra = 800 + 50 * ((rnd() * 30) | 0), rb = ra + 25 * (((rnd() * 25) | 0) - 12);
  var E = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  if (rnd() < 0.5) return { kind: "num", question: "You are rated <b>" + ra + "</b>, your opponent <b>" + rb + "</b>. What is your expected score (0 to 1)? Within 0.02.", answer: Math.round(E * 100) / 100, tol: 0.02, target: 20, unit: "", explain: ["E = 1 / (1 + 10^((" + rb + " − " + ra + ") / 400)) = " + E.toFixed(3) + ".", "A 100-point gap is about 64/36; 200 points about 76/24; 400 points about 91/9."] };
  var K = 20, S = chdPick([1, 0.5, 0], rnd), d = K * (S - E);
  return { kind: "num", question: "You are rated <b>" + ra + "</b>, your opponent <b>" + rb + "</b>, K = 20. You " + (S === 1 ? "win" : S === 0.5 ? "draw" : "lose") + ". How many rating points do you gain (negative if you lose points)? Within 1.", answer: Math.round(d * 10) / 10, tol: 1, target: 20, explain: ["Expected score E = " + E.toFixed(3) + ". Change = K × (S − E) = 20 × (" + S + " − " + E.toFixed(3) + ") = " + d.toFixed(1) + ".", "You gain more for beating a stronger player and lose less for losing to one. That is the whole system."] };
} };

CH_DRILLS.chwp = { name: "Evals to odds", target: 15, gen: function (ctx) {
  var rnd = chdRnd(ctx), cp = 50 * (((rnd() * 24) | 0) - 12), wp = chWinProb(cp);
  return { kind: "num", question: "The engine says <b>" + (cp >= 0 ? "+" : "") + (cp / 100).toFixed(1) + "</b> for White. Roughly what are White's winning chances, in percent? Within 8.", answer: Math.round(wp), tol: 8, target: 15, unit: "%",
    explain: ["About " + Math.round(wp) + "%. The curve used by lichess and this app: 50 + 50 × (2 / (1 + e^(−0.00368 × cp)) − 1).", "+1.0 is about 59%, +2.0 about 68%, +3.0 about 75%, +5.0 about 86%. The curve flattens: going from +3 to +5 adds little, which is why a winning position does not need more material, it needs the win converted."] };
} };

CH_DRILLS.chopen = { name: "Openings", target: 10, gen: function (ctx) {
  var rnd = chdRnd(ctx), o = chdPick(CH_OPENINGS, rnd), others = lgShuffle(CH_OPENINGS.filter(function (x) { return x !== o; }).slice(), rnd).slice(0, 3);
  var s = chStart(); o[0].split(/\s+/).forEach(function (tok) { var san = tok.replace(/^\d+\./, ""); if (!san) return; var m = chParseSan(s, san); if (m) chMake(s, m); });
  return { kind: "choice", question: "<b>" + o[0] + "</b>. Which opening is this?", options: lgShuffle([o[1]].concat(others.map(function (x) { return x[1]; })), rnd), answer: o[1], target: 10, board: { fen: chToFen(s), flip: false }, explain: ["<b>" + o[1] + "</b>: " + o[2]] };
} };

/* ============================================================
   CONCEPT DRILLS: one per lesson, on the board
   Every answer is either an exact property of the position (a pin,
   an isolated pawn, an outpost, a stalemate) or the engine's verdict
   (a tactic that wins material, a move that is safe or a blunder).
   ============================================================ */

/* build a position piece by piece: list = [[square name, piece code]]; null if illegal (side not to move in check, pawns on the end ranks) */
function chdPlace(list, side) {
  var s = chNew(); s.side = side;
  for (var i = 0; i < list.length; i++) {
    var sq = chIdx(list[i][0]), p = list[i][1];
    if (s.b[sq]) return null;
    if (Math.abs(p) === CH_P && (chRank(sq) === 0 || chRank(sq) === 7)) return null;
    s.b[sq] = p;
  }
  if (chKingSq(s, 1) < 0 || chKingSq(s, -1) < 0 || chInCheck(s, -side)) return null;
  return s;
}
function chdRandSq(rnd) { return chSq((rnd() * 8) | 0, (rnd() * 8) | 0); }
function chdKingDist(a, b) { return Math.max(Math.abs(chFile(a) - chFile(b)), Math.abs(chRank(a) - chRank(b))); }
/* a few loose pawns for scenery, never giving check, never on the given squares */
function chdScatter(s, rnd, n, avoid) {
  for (var k = 0; k < n; k++) {
    var sq = chSq((rnd() * 8) | 0, 1 + ((rnd() * 6) | 0));
    if (s.b[sq] || (avoid || []).indexOf(sq) >= 0) continue;
    s.b[sq] = rnd() < 0.5 ? CH_P : -CH_P;
    if (chInCheck(s, 1) || chInCheck(s, -1)) s.b[sq] = 0;
  }
  return s;
}
/* the engine's verdict on a built tactic: every move within CH_FORK_SLACK of the best at depth 3 (as for the forks), provided the best wins at least CH_FORK_GAIN over the static count and a theme move is among them */
function chdTacticAccept(s, isTheme) {
  if (chInCheck(s) || chStatus(s) !== "") return null;
  var before = chEval(s), themes = chLegal(s).filter(isTheme);
  /* cheap first: does a theme move win material at all? */
  if (!themes.some(function (m) { chMake(s, m); var r = chSearch(s, 2, 8000); chUnmake(s); return -r.score - before >= CH_FORK_GAIN; })) return null;
  var sc = chScoreMoves(s, 3, 20000);
  if (!sc.length || sc[0].score >= CH_MATE - 50 || sc[0].score - before < CH_FORK_GAIN) return null;
  var acc = sc.filter(function (x) { return sc[0].score - x.score <= CH_FORK_SLACK; });
  if (!acc.some(function (x) { return isTheme(x.move); })) return null;
  return { accept: acc.map(function (x) { return x.san; }), best: sc[0], theme: acc.filter(function (x) { return isTheme(x.move); })[0] };
}

/* ---- pins: which pieces of a side are pinned to their own king ---- */
function chdPinned(s, side) {
  var k = chKingSq(s, side), out = [];
  if (k < 0) return out;
  CH_ROOK.concat(CH_BISHOP).forEach(function (d) {
    var t = k + d, mine = -1;
    while (s.b[t] === 0) t += d;
    if (s.b[t] === CH_OFF || !s.b[t] || (s.b[t] > 0) !== (side > 0)) return;
    mine = t; t += d;
    while (s.b[t] === 0) t += d;
    var p = s.b[t]; if (!p || p === CH_OFF || (p > 0) === (side > 0)) return;
    var kind = Math.abs(p), straight = CH_ROOK.indexOf(d) >= 0;
    if (kind === CH_Q || (straight ? kind === CH_R : kind === CH_B)) out.push({ sq: mine, by: t });
  });
  return out;
}
function chdLineDir(a, b) {
  var df = chFile(b) - chFile(a), dr = chRank(b) - chRank(a);
  if (df && dr && Math.abs(df) !== Math.abs(dr)) return 0;
  if (!df && !dr) return 0;
  return Math.sign(dr) * 10 + Math.sign(df);
}
/* a skewer: our slider checks along a line with a rook or queen behind the king */
function chdBuildSkewer(rnd) {
  var side = rnd() < 0.5 ? 1 : -1;
  for (var t = 0; t < 60; t++) {
    var slider = chdPick([CH_R, CH_B, CH_Q], rnd), dirs = slider === CH_R ? CH_ROOK : slider === CH_B ? CH_BISHOP : CH_ROOK.concat(CH_BISHOP);
    var ek = chdRandSq(rnd), d = chdPick(dirs, rnd), behind = ek - d * (1 + ((rnd() * 2) | 0));
    var to = ek + d * (2 + ((rnd() * 3) | 0));
    if (!chOnBoard(behind) || !chOnBoard(to)) continue;
    var mid = ek - d; if (behind !== mid && !chOnBoard(mid)) continue;
    /* the slider arrives on `to` from somewhere off the line */
    var from = null, dirs2 = lgShuffle(dirs.filter(function (x) { return x !== d && x !== -d; }), rnd);
    for (var i = 0; i < dirs2.length && from == null; i++) { var f = to + dirs2[i] * (1 + ((rnd() * 3) | 0)), ok = chOnBoard(f); for (var u = to + dirs2[i]; ok && u !== f; u += dirs2[i]) if (!chOnBoard(u)) ok = false; if (ok) from = f; }
    if (from == null) continue;
    var target = chdPick([CH_Q, CH_R, CH_Q], rnd);
    if (slider === CH_Q && target !== CH_Q) target = CH_Q;
    var mk = chdRandSq(rnd);
    var list = [[chName(ek), -CH_K * side], [chName(behind), -target * side], [chName(from), slider * side], [chName(mk), CH_K * side]];
    if (chdKingDist(mk, ek) < 2) continue;
    var s = chdPlace(list, side); if (!s) continue;
    /* the line between must be empty, and nothing between `from` and `to` */
    if (chInCheck(s, side)) continue;
    chdScatter(s, rnd, 2 + ((rnd() * 4) | 0), [to, mid].concat(CH_KING.map(function (x) { return ek + x; })));
    for (var w = to - d; w !== ek; w -= d) if (s.b[w]) { s = null; break; }
    if (!s) continue;
    var r = chdTacticAccept(s, function (m) { return m.from === from && m.to === to; });
    if (r) return { s: s, r: r, theme: "skewer" };
  }
  return null;
}
/* a discovered check: our piece masks our slider's line to the king, then jumps to attack the queen */
function chdBuildDiscovery(rnd) {
  var side = rnd() < 0.5 ? 1 : -1;
  for (var t = 0; t < 80; t++) {
    var slider = chdPick([CH_R, CH_B, CH_Q], rnd), dirs = slider === CH_R ? CH_ROOK : slider === CH_B ? CH_BISHOP : CH_ROOK.concat(CH_BISHOP);
    var ek = chdRandSq(rnd), d = chdPick(dirs, rnd), mask = ek + d * (1 + ((rnd() * 2) | 0)), sl = mask + d * (1 + ((rnd() * 2) | 0));
    if (!chOnBoard(mask) || !chOnBoard(sl) || chdKingDist(mask, ek) < 2) continue;
    var gaps = []; for (var g = ek + d; g !== sl; g += d) if (!chOnBoard(g)) { gaps = null; break; }
    if (!gaps) continue;
    var maskKind = chdPick([CH_N, CH_N, CH_B], rnd), jumps = maskKind === CH_N ? CH_KNIGHT : CH_BISHOP;
    var to = mask + chdPick(jumps, rnd);
    if (!chOnBoard(to) || chdLineDir(ek, to) === d) continue;
    var qsq = to + chdPick(maskKind === CH_N ? CH_KNIGHT : CH_ROOK.concat(CH_BISHOP).filter(function (x) { return maskKind !== CH_B || CH_BISHOP.indexOf(x) >= 0; }), rnd) * (maskKind === CH_N ? 1 : 2);
    if (!chOnBoard(qsq)) continue;
    var mk = chdRandSq(rnd);
    var list = [[chName(ek), -CH_K * side], [chName(mask), maskKind * side], [chName(sl), slider * side], [chName(qsq), -CH_Q * side], [chName(mk), CH_K * side]];
    var s = chdPlace(list, side); if (!s || chInCheck(s, side) || chdKingDist(mk, ek) < 2) continue;
    /* the queen must not be capturable at once: the point is the discovery */
    if (chAttacked(s, qsq, side)) continue;
    chdScatter(s, rnd, 2 + ((rnd() * 3) | 0), [to].concat(CH_KING.map(function (x) { return ek + x; })));
    var lineClear = true; for (g = ek + d; g !== mask; g += d) if (s.b[g]) lineClear = false;
    if (!lineClear || chAttacked(s, qsq, side)) continue;
    var r = chdTacticAccept(s, function (m) { if (m.from !== mask) return false; chMake(s, m); var disc = chInCheck(s); chUnmake(s); return disc; });
    if (r) return { s: s, r: r, theme: "discovery" };
  }
  return null;
}
/* a pin to exploit: a minor piece pinned to its king, and a pawn that can attack it */
function chdBuildPinWin(rnd) {
  var side = rnd() < 0.5 ? 1 : -1;
  for (var t = 0; t < 80; t++) {
    var slider = chdPick([CH_R, CH_B, CH_Q], rnd), dirs = slider === CH_R ? CH_ROOK : slider === CH_B ? CH_BISHOP : CH_ROOK.concat(CH_BISHOP);
    var ek = chdRandSq(rnd), d = chdPick(dirs, rnd), pin = ek + d * (1 + ((rnd() * 2) | 0)), sl = pin + d * (2 + ((rnd() * 3) | 0));
    if (!chOnBoard(pin) || !chOnBoard(sl)) continue;
    var okLine = true; for (var g = ek + d; g !== sl; g += d) if (!chOnBoard(g)) okLine = false;
    if (!okLine) continue;
    /* our pawn: two squares below the pinned piece diagonally (from our side), pushing one attacks it */
    var pf = chFile(pin) + (rnd() < 0.5 ? -1 : 1), pr = chRank(pin) - 2 * side;
    if (pf < 0 || pf > 7 || pr < 1 || pr > 6) continue;
    var paw = chSq(pf, pr);
    var mk = chdRandSq(rnd), pinned = chdPick([CH_N, CH_B, CH_N], rnd);
    var list = [[chName(ek), -CH_K * side], [chName(pin), -pinned * side], [chName(sl), slider * side], [chName(paw), CH_P * side], [chName(mk), CH_K * side]];
    var s = chdPlace(list, side); if (!s || chInCheck(s, side) || chdKingDist(mk, ek) < 2) continue;
    chdScatter(s, rnd, 2 + ((rnd() * 3) | 0), [paw + 10 * side].concat(CH_KING.map(function (x) { return ek + x; })));
    if (!chdPinned(s, -side).some(function (p) { return p.sq === pin; })) continue;
    var r = chdTacticAccept(s, function (m) { return m.from === paw; });
    if (r) return { s: s, r: r, theme: "pin" };
  }
  return null;
}
var CH_LINE_TXT = {
  skewer: ["Find the <b>skewer</b>: check along a line, and take what stands behind the king.", "A skewer is a pin in reverse: the valuable piece is in front, it must move, and the piece behind it falls. Two enemy pieces on one line is the cue."],
  discovery: ["Find the <b>discovered check</b>: move the front piece so the piece behind it gives check, and let the moving piece win something.", "The moving piece is free to attack anything, because the opponent must answer the check first. Look for your own piece standing between your line piece and the enemy king."],
  pin: ["A piece is <b>pinned</b> to its king. Win it.", "A piece pinned to the king cannot legally move, so attack it again, ideally with a pawn: it cannot run."]
};
CH_DRILLS.chline = { name: "Pins, skewers, discoveries", target: 20, gen: function (ctx) {
  var rnd = chdRnd(ctx), pick = rnd(), t0 = Date.now();
  /* one in four: spot the pinned piece in a game position (an exact property, no engine needed) */
  if (pick < 0.25) {
    for (var t = 0; t < 80; t++) {
      var s = chRandomPosition(14 + ((rnd() * 40) | 0), rnd);
      if (chStatus(s) === "checkmate" || chStatus(s) === "stalemate") continue;
      var side = rnd() < 0.5 ? 1 : -1, pins = chdPinned(s, side);
      if (!pins.length) { side = -side; pins = chdPinned(s, side); }
      if (!pins.length) continue;
      var names = pins.map(function (p) { return chName(p.sq); }), p0 = pins[0];
      return { kind: "square", question: "Click the <b>" + (side > 0 ? "White" : "Black") + "</b> piece that is <b>pinned</b> to its king.", answer: names[0], accept: names, target: 12, board: chdPos(s, { flip: false }),
        explain: ["The " + CH_NAMES[Math.abs(s.b[p0.sq])] + " on <b>" + names[0] + "</b> stands between its king and the " + CH_NAMES[Math.abs(s.b[p0.by])] + " on " + chName(p0.by) + (names.length > 1 ? " (also pinned: " + names.slice(1).join(", ") + ")" : "") + ". It may not move off that line.", "Scan out from the king along the eight lines: the first piece you meet of the king's own colour, with an enemy rook, bishop or queen of the right kind behind it, is pinned. A pinned piece does not defend either."] };
    }
  }
  var builders = pick < 0.5 ? [chdBuildSkewer, chdBuildDiscovery, chdBuildPinWin] : pick < 0.75 ? [chdBuildDiscovery, chdBuildPinWin, chdBuildSkewer] : [chdBuildPinWin, chdBuildSkewer, chdBuildDiscovery];
  var got = null;
  for (var b = 0; b < builders.length * 2 && !got && Date.now() - t0 < 1500; b++) got = builders[b % builders.length](rnd);
  if (!got) { var s0 = chFromFen("4k3/8/3p4/4n3/8/8/5P2/4R1K1 w - - 0 1"); got = { s: s0, r: chdTacticAccept(s0, function (m) { return chName(m.from) === "f2"; }), theme: "pin" }; }
  var S = got.s, R = got.r, T = CH_LINE_TXT[got.theme];
  return { kind: "move", question: chdSide(S) + " to move. " + T[0], answer: R.theme.san, accept: R.accept, target: 20, board: chdPos(S), elo: 1150,
    explain: ["<b>" + R.theme.san + "</b> wins about " + Math.max(1, Math.round((R.best.score - chEval(S)) / 100)) + " points of material against the best defence" + (R.accept.length > 1 ? " (the engine also accepts " + R.accept.filter(function (x) { return x !== R.theme.san; }).join(", ") + ")" : "") + ".", T[1]] };
} };

/* ---- the back rank (Fischer): a king boxed in by its own pawns ---- */
function chdBuildBackRank(rnd, two) {
  for (var t = 0; t < 80; t++) {
    var side = rnd() < 0.5 ? 1 : -1, home = side > 0 ? 7 : 0, fwd = -side;   /* the defender's back rank and the direction it faces */
    var kf = 1 + ((rnd() * 6) | 0), list = [[chName(chSq(kf, home)), -CH_K * side]];
    [-1, 0, 1].forEach(function (df) { var f = kf + df; if (f >= 0 && f <= 7) list.push([chName(chSq(f, home + fwd)), -CH_P * side]); });
    var used = {}; list.forEach(function (x) { used[x[0]] = 1; });
    var free = function () { for (var k = 0; k < 30; k++) { var f = (rnd() * 8) | 0; if (Math.abs(f - kf) > 1) return f; } return null; };
    var f1 = free(); if (f1 == null) continue;
    var heavy = [];
    if (two) {
      /* a defending rook on the back rank, two heavy pieces of ours on its file: take, retake, mate */
      list.push([chName(chSq(f1, home)), -CH_R * side]);
      var r1 = home + fwd * (2 + ((rnd() * 3) | 0)), r2 = home + fwd * (5 + ((rnd() * 2) | 0));
      if (r2 < 0 || r2 > 7 || r1 < 0 || r1 > 7) continue;
      heavy = [[chName(chSq(f1, r1)), chdPick([CH_R, CH_Q], rnd) * side], [chName(chSq(f1, r2)), CH_R * side]];
    } else {
      var rr = home + fwd * (1 + ((rnd() * 5) | 0)); if (rr < 0 || rr > 7) continue;
      heavy = [[chName(chSq(f1, rr)), chdPick([CH_R, CH_R, CH_Q], rnd) * side]];
    }
    list = list.concat(heavy);
    var mf = (rnd() * 8) | 0, mr = side > 0 ? 0 : 7, mk = chSq(mf, mr);
    list.push([chName(mk), CH_K * side]);
    /* our king gets luft so the defender has no back-rank trick of its own */
    [-1, 0, 1].forEach(function (df) { var f = mf + df; if (f >= 0 && f <= 7 && df !== 0 && rnd() < 0.5) list.push([chName(chSq(f, mr + side)), CH_P * side]); });
    var s = chdPlace(list, side); if (!s || chInCheck(s, side)) continue;
    chdScatter(s, rnd, (rnd() * 4) | 0, []);
    var mates = chMatingMoves(s);
    if (!two) { if (mates.length) return { s: s, accept: mates.map(function (m) { return chSan(s, m); }), n: 1 }; continue; }
    if (mates.length) continue;
    var firsts = chdMate2Firsts(s);
    if (firsts.length) return { s: s, accept: firsts, n: 2 };
  }
  return null;
}
CH_DRILLS.chbackrank = { name: "Back-rank mates", target: 20, gen: function (ctx) {
  var rnd = chdRnd(ctx), two = rnd() < 0.45, got = chdBuildBackRank(rnd, two) || chdBuildBackRank(rnd, false);
  if (!got) { var s = chFromFen(CH_MATE1[0][0]); got = { s: s, accept: chMatingMoves(s).map(function (m) { return chSan(s, m); }), n: 1 }; }
  var S = got.s;
  return { kind: "move", question: chdSide(S) + " to move. " + (got.n === 1 ? "<b>Mate in one</b> on the back rank." : "<b>Mate in two</b>: the back rank has one defender. Play the first move."), answer: got.accept[0], accept: got.accept, target: got.n === 1 ? 12 : 30, board: chdPos(S), elo: got.n === 1 ? 1000 : 1300,
    explain: ["<b>" + got.accept[0] + "</b>" + (got.accept.length > 1 ? " (also " + got.accept.slice(1).join(", ") + ")" : "") + ".", got.n === 1 ? "The king is boxed in by its own pawns: a rook or queen that reaches the back rank with nothing to block or capture it is mate." : "Take the defender with check; it must be retaken, and the second heavy piece mates on the rank it just left. Remove the guard, then mate: Fischer's programmed lesson in one position."] };
} };

/* ---- the basic mates: king and queen, king and rook, and the stalemate trap ---- */
function chdBareMate(rnd, piece) {
  var side = rnd() < 0.5 ? 1 : -1;
  for (var t = 0; t < 100; t++) {
    var ek = chdRandSq(rnd), mk = chdRandSq(rnd), pq = chdRandSq(rnd);
    var edge = chFile(ek) === 0 || chFile(ek) === 7 || chRank(ek) === 0 || chRank(ek) === 7;
    if (!edge && rnd() < 0.8) continue;
    var s = chdPlace([[chName(ek), -CH_K * side], [chName(mk), CH_K * side], [chName(pq), piece * side]], side);
    if (!s || chInCheck(s, side) || chdKingDist(ek, mk) < 2) continue;
    return s;
  }
  return null;
}
CH_DRILLS.chbasicmate = { name: "Basic mates", target: 20, gen: function (ctx) {
  var rnd = chdRnd(ctx), pick = rnd(), piece = rnd() < 0.55 ? CH_Q : CH_R, nm = piece === CH_Q ? "queen" : "rook";
  if (pick < 0.3) {
    /* the stalemate trap: which of four moves leaves the lone king no move and no check? */
    for (var t = 0; t < 300; t++) {
      var s = chdBareMate(rnd, CH_Q); if (!s) continue;
      var ms = chLegal(s).filter(function (m) { return Math.abs(m.piece) === CH_Q; }), stale = [], fine = [];
      ms.forEach(function (m) { chMake(s, m); var st = chStatus(s); chUnmake(s); if (st === "stalemate") stale.push(m); else if (st === "" && !chAttacked(s, m.to, -s.side)) fine.push(m); });
      if (!stale.length || fine.length < 3) continue;
      var bad = chdPick(stale, rnd), opts = [chSan(s, bad)].concat(lgShuffle(fine, rnd).slice(0, 3).map(function (m) { return chSan(s, m); }));
      return { kind: "choice", question: chdSide(s) + " to move, king and queen against king. Which queen move throws the win away by <b>stalemate</b>?", options: lgShuffle(opts, rnd), answer: chSan(s, bad), target: 15, board: chdPos(s),
        explain: ["<b>" + chSan(s, bad) + "</b> leaves the lone king no legal move while it is not in check: stalemate, a draw.", "Shrink the box but always leave the king a square until your own king has arrived. Before any quiet queen move, count the enemy king's squares."] };
    }
  }
  if (pick < 0.55) {
    /* mate, stalemate or neither: the defender to move */
    var want = chdPick(["checkmate", "stalemate", "", "check"], rnd);
    for (t = 0; t < 2000; t++) {
      var s2 = chdBareMate(rnd, piece); if (!s2) continue;
      s2.side = -s2.side; if (chInCheck(s2, -s2.side)) continue;
      var st2 = chStatus(s2); if (st2 !== want && t < 1900) continue;
      var ans = st2 === "checkmate" ? "Checkmate" : st2 === "stalemate" ? "Stalemate" : st2 === "check" ? "Check, but not mate" : "Neither: play goes on";
      return { kind: "choice", question: chdSide(s2) + " to move. Checkmate, stalemate, or neither?", options: ["Checkmate", "Stalemate", "Check, but not mate", "Neither: play goes on"], answer: ans, target: 10, board: chdPos(s2, { flip: false }),
        explain: ["<b>" + ans + "</b>. " + (st2 === "checkmate" ? "The king is in check and every square is covered." : st2 === "stalemate" ? "The king is not in check but has no legal move: a draw." : st2 === "check" ? "The king is in check but has a square (or can capture the " + nm + ")." : "Not in check, and the king has a legal move."), "Two questions, every time: is the king attacked now, and does it have a legal move?"] };
    }
  }
  /* deliver the mate: in one, or in two with the quiet move */
  for (t = 0; t < 400; t++) {
    var s3 = chdBareMate(rnd, piece); if (!s3) continue;
    var mm = chMatingMoves(s3);
    if (mm.length && rnd() < 0.5) return { kind: "move", question: chdSide(s3) + " to move. King and " + nm + ": <b>mate in one</b>.", answer: chSan(s3, mm[0]), accept: mm.map(function (m) { return chSan(s3, m); }), target: 12, board: chdPos(s3), elo: 900,
      explain: ["<b>" + chSan(s3, mm[0]) + "</b>.", piece === CH_Q ? "The queen mates on the edge, protected by the king or from a distance with the king taking the escape squares." : "The rook checks along the edge while your king faces the enemy king (opposition): the king has nowhere to go."] };
    if (mm.length) continue;
    var f2 = chdMate2Firsts(s3);
    if (f2.length && f2.length <= 6) return { kind: "move", question: chdSide(s3) + " to move. King and " + nm + ": <b>mate in two</b>. Play the first move.", answer: f2[0], accept: f2, target: 30, board: chdPos(s3), elo: 1150,
      explain: ["<b>" + f2[0] + "</b>" + (f2.length > 1 ? " (also " + f2.slice(1).join(", ") + ")" : "") + ".", "Often the first move is quiet: it takes the last squares away without stalemate, and the mate follows. Check that the lone king has exactly the moves you expect."] };
  }
  return CH_DRILLS.chmate1.gen(ctx);
} };

/* ---- rook endings: Lucena and Philidor, every answer checked by Stockfish at depth 30 (see CH_ROOKEND) ---- */
CH_DRILLS.chrookend = { name: "Lucena and Philidor", target: 25, gen: function (ctx) {
  var rnd = chdRnd(ctx), e = chdPick(CH_ROOKEND, rnd), s = chFromFen(e.fen);
  if (e.kind === "result") return { kind: "choice", question: chdSide(s) + " to move. With best play, is this a <b>win</b> for the side with the pawn, or a <b>draw</b>?", options: ["Win", "Draw"], answer: e.answer, target: 20, board: chdPos(s, { flip: false }),
    explain: [e.answer === "Win" ? "<b>Win.</b> The attacking king stands in front of its pawn on the seventh and the defending king is cut off: the Lucena position. The rook builds a bridge on the fourth rank and the pawn queens." : "<b>Draw.</b> The defending king is in front of the pawn: the Philidor position. The rook holds the third rank, then checks from behind once the pawn advances.", "The first question in every rook ending: where is the defending king? In front of the pawn, a draw; cut off from it, usually a win."] };
  var drop = e.kind === "drop";
  return { kind: "move", question: chdSide(s) + " to move. " + (drop ? "The pawn has just reached the sixth rank. <b>Hold the draw.</b>" : "The king has stepped out of the Lucena box and is being checked. <b>Keep the win.</b>"), answer: e.accept[0], accept: e.accept, target: 25, board: chdPos(s), elo: 1400,
    explain: ["<b>" + e.accept[0] + "</b>" + (e.accept.length > 1 ? " (also " + e.accept.slice(1).join(", ") + ")" : "") + ".", drop ? "Philidor's second phase: the pawn on the sixth has taken the attacking king's shelter, so the rook drops back down its file and checks from behind; the king can never hide. Every other move here loses (Stockfish)." : "The rook interposes on the fourth rank: the bridge. The checks are over and the pawn queens. Stepping the king back toward the pawn also keeps the win, but only repeats the position; walking away from the pawn lets the defender check forever (Stockfish)."] };
} };

/* ---- opening principles: develop, take the centre, castle, without hanging anything ---- */
function chdPrincipled(s, m) {
  var kind = Math.abs(m.piece), back = s.side > 0 ? 0 : 7, fr = chRank(m.from);
  if (m.flag === "castle" || (kind === CH_K && Math.abs(chFile(m.to) - chFile(m.from)) === 2)) return "castles";
  if ((kind === CH_N || kind === CH_B) && fr === back && !m.cap && (kind === CH_B || (chFile(m.to) > 0 && chFile(m.to) < 7))) return "develops";
  if (kind === CH_P && (chFile(m.from) === 3 || chFile(m.from) === 4) && fr === (s.side > 0 ? 1 : 6) && !m.cap) return "a centre pawn";
  return null;
}
CH_DRILLS.chdevelop = { name: "Opening principles", target: 15, gen: function (ctx) {
  var rnd = chdRnd(ctx);
  for (var t = 0; t < 40; t++) {
    var o = chdPick(CH_OPENINGS, rnd), toks = o[0].split(/\s+/).map(function (x) { return x.replace(/^\d+\./, ""); }).filter(Boolean);
    var n = 1 + ((rnd() * toks.length) | 0), s = chStart();
    for (var i = 0; i < n; i++) { var m = chParseSan(s, toks[i]); if (m) chMake(s, m); }
    var sc = chScoreMoves(s, 3, 30000), best = sc[0].score;
    var good = sc.filter(function (x) { return chdPrincipled(s, x.move) && best - x.score <= 60; });
    if (!good.length) continue;
    var shown = toks.slice(0, n), line = shown.map(function (x, k) { return (k % 2 === 0 ? (k / 2 + 1) + "." : "") + x; }).join(" ");
    return { kind: "move", question: "After <b>" + line + "</b>, " + chdSide(s) + " to move. Play a move that follows the <b>opening principles</b>: develop a knight or bishop, move the d- or e-pawn, or castle, without losing material.", answer: good[0].san, accept: good.map(function (x) { return x.san; }), target: 15, board: chdPos(s),
      explain: ["Good here: " + good.map(function (x) { return "<b>" + x.san + "</b> (" + chdPrincipled(s, x.move) + ")"; }).join(", ") + ".", "Not now: moving a developed piece again, an early queen trip, a rim pawn. Every principled move above was checked by the engine not to drop material."] };
  }
  return CH_DRILLS.chopen.gen(ctx);
} };

/* ---- pawn structure: exact definitions ---- */
function chdPawns(s, side) { return chPieces(s).filter(function (p) { return p.kind === CH_P && p.side === side; }).map(function (p) { return p.sq; }); }
function chdIsolated(s, side) { var P = chdPawns(s, side); return P.filter(function (a) { return !P.some(function (b) { return Math.abs(chFile(b) - chFile(a)) === 1; }); }); }
function chdDoubled(s, side) { var P = chdPawns(s, side); return P.filter(function (a) { return P.some(function (b) { return b !== a && chFile(b) === chFile(a); }); }); }
function chdPassed(s, side) { var P = chdPawns(s, side), E = chdPawns(s, -side); return P.filter(function (a) { return !E.some(function (b) { return Math.abs(chFile(b) - chFile(a)) <= 1 && (chRank(b) - chRank(a)) * side > 0; }); }); }
function chdIslands(s, side) { var files = [0, 0, 0, 0, 0, 0, 0, 0], n = 0; chdPawns(s, side).forEach(function (a) { files[chFile(a)] = 1; }); for (var f = 0; f < 8; f++) if (files[f] && (f === 0 || !files[f - 1])) n++; return n; }
var CH_PAWN_DEF = {
  isolated: [chdIsolated, "an <b>isolated</b> pawn (no friendly pawn on either neighbouring file)", "It cannot be defended by a pawn: blockade the square in front of it and attack it with pieces."],
  doubled: [chdDoubled, "a <b>doubled</b> pawn (two friendly pawns on one file)", "Doubled pawns cannot protect each other, and the front one usually falls in the endgame."],
  passed: [chdPassed, "a <b>passed</b> pawn (no enemy pawn in front of it on its own or a neighbouring file)", "Only pieces can stop it: push it, put a rook behind it, and blockade the enemy's."]
};
CH_DRILLS.chpawns = { name: "Pawn structure", target: 12, gen: function (ctx) {
  var rnd = chdRnd(ctx), kind = chdPick(["isolated", "doubled", "passed", "passed", "islands"], rnd);
  for (var t = 0; t < 200; t++) {
    var s = chRandomPosition(20 + ((rnd() * 50) | 0), rnd), side = rnd() < 0.5 ? 1 : -1, nm = side > 0 ? "White" : "Black";
    if (chdPawns(s, side).length < 3) continue;
    if (kind === "islands") {
      var n = chdIslands(s, side);
      return { kind: "num", question: "How many <b>pawn islands</b> does <b>" + nm + "</b> have? (An island is a group of pawns on neighbouring files.)", answer: n, tol: 0, target: 12, board: chdPos(s, { flip: false }),
        explain: [nm + " has <b>" + n + "</b>: files with pawns are " + chdPawns(s, side).map(function (a) { return CH_FILES[chFile(a)]; }).filter(function (x, i, A) { return A.indexOf(x) === i; }).sort().join(", ") + "; each break between occupied files starts a new island.", "Fewer islands is usually the healthier structure: every island has a weak end that pieces must defend (Capablanca)."] };
    }
    var D = CH_PAWN_DEF[kind], hits = D[0](s, side);
    if (!hits.length || hits.length === chdPawns(s, side).length) continue;
    var names = hits.map(chName);
    return { kind: "square", question: "Click " + D[1].replace("a <b>", "a <b>") + " of <b>" + nm + "</b>.", answer: names[0], accept: names, target: 12, board: chdPos(s, { flip: false }),
      explain: [nm + "'s " + kind + " pawn" + (names.length > 1 ? "s: " : ": ") + "<b>" + names.join(", ") + "</b>.", D[2]] };
  }
  return CH_DRILLS.chmat.gen(ctx);
} };

/* ---- good and bad pieces: open files, outposts, good and bad bishops ---- */
function chdOpenFiles(s) { var out = []; for (var f = 0; f < 8; f++) { var any = false; for (var r = 0; r < 8; r++) { var p = s.b[chSq(f, r)]; if (Math.abs(p) === CH_P) any = true; } if (!any) out.push(f); } return out; }
/* an outpost for side: in the enemy half (rank 4–6 from its side), defended by its own pawn, and no enemy pawn on a neighbouring file can ever attack it */
function chdOutposts(s, side) {
  var E = chdPawns(s, -side), out = [];
  for (var f = 0; f < 8; f++) for (var rr = 3; rr <= 5; rr++) {
    var r = side > 0 ? rr : 7 - rr, sq = chSq(f, r);
    if (Math.abs(s.b[sq]) === CH_P) continue;
    var defended = s.b[sq - 9 * side] === CH_P * side || s.b[sq - 11 * side] === CH_P * side;
    var safe = !E.some(function (b) { return Math.abs(chFile(b) - f) === 1 && (chRank(b) - r) * side > 0; });
    if (defended && safe) out.push(sq);
  }
  return out;
}
CH_DRILLS.chpiece = { name: "Good and bad pieces", target: 15, gen: function (ctx) {
  var rnd = chdRnd(ctx), pick = rnd();
  if (pick < 0.35) {
    /* rooks to the open file */
    for (var t = 0; t < 120; t++) {
      var s = chRandomPosition(24 + ((rnd() * 50) | 0), rnd); if (chStatus(s) !== "") continue;
      var open = chdOpenFiles(s); if (!open.length || open.length > 3) continue;
      var rooks = chLegal(s).filter(function (m) { return Math.abs(m.piece) === CH_R && open.indexOf(chFile(m.to)) >= 0 && open.indexOf(chFile(m.from)) < 0; });
      if (!rooks.length) continue;
      var best = chSearch(s, 2, 20000).score;
      var good = rooks.map(function (m) { chMake(s, m); var r = chLegal(s).length ? -chSearch(s, 1, 8000).score : (chInCheck(s) ? CH_MATE : 0); chUnmake(s); return { move: m, san: chSan(s, m), score: r }; }).filter(function (x) { return best - x.score <= 80; });
      if (!good.length) continue;
      return { kind: "move", question: chdSide(s) + " to move. Put a <b>rook on an open file</b> (a file with no pawns), without losing material.", answer: good[0].san, accept: good.map(function (x) { return x.san; }), target: 15, board: chdPos(s),
        explain: ["Open file" + (open.length > 1 ? "s" : "") + ": <b>" + open.map(function (f) { return CH_FILES[f]; }).join(", ") + "</b>. Accepted: " + good.map(function (x) { return x.san; }).join(", ") + ".", "A rook on an open file reaches the seventh rank and the enemy camp; behind its own pawns it is a spectator."] };
    }
  }
  if (pick < 0.7) {
    /* outposts */
    for (t = 0; t < 200; t++) {
      var s2 = chRandomPosition(16 + ((rnd() * 50) | 0), rnd), side = rnd() < 0.5 ? 1 : -1, op = chdOutposts(s2, side);
      if (!op.length || op.length > 6) continue;
      var nm = side > 0 ? "White" : "Black";
      return { kind: "square", question: "Click an <b>outpost</b> for " + nm + "'s knight: a square in the enemy half, defended by " + nm + "'s pawn, that no enemy pawn can ever attack.", answer: chName(op[0]), accept: op.map(chName), target: 15, board: chdPos(s2, { flip: false }),
        explain: ["Outposts for " + nm + ": <b>" + op.map(chName).join(", ") + "</b>.", "Check three things: it is in the enemy half, your pawn guards it, and no enemy pawn on a neighbouring file is still behind it to kick a piece out. A knight there cannot be dislodged except by a trade."] };
    }
  }
  /* good or bad bishop: own pawns on the bishop's colour */
  for (t = 0; t < 300; t++) {
    var side2 = rnd() < 0.5 ? 1 : -1, bad = rnd() < 0.5, list = [], used = {};
    var bsq = chdRandSq(rnd), col = (chFile(bsq) + chRank(bsq)) % 2;
    list.push([chName(bsq), CH_B * side2]); used[bsq] = 1;
    var placed = 0, tries = 0;
    while (placed < 6 && tries++ < 200) {
      var f = (rnd() * 8) | 0, r = 2 + ((rnd() * 4) | 0), sq = chSq(f, r), same = (f + r) % 2 === col;
      if (used[sq]) continue;
      if (same !== (placed < 5 ? bad : !bad)) continue;
      list.push([chName(sq), CH_P * side2]); used[sq] = 1; placed++;
    }
    var k1 = chdRandSq(rnd), k2 = chdRandSq(rnd);
    if (used[k1] || used[k2] || chdKingDist(k1, k2) < 2) continue;
    list.push([chName(k1), CH_K * side2], [chName(k2), -CH_K * side2]);
    var s3 = chdPlace(list, side2); if (!s3 || chInCheck(s3, side2)) continue;
    var P = chdPawns(s3, side2), on = P.filter(function (a) { return (chFile(a) + chRank(a)) % 2 === col; }).length;
    var isBad = on >= 5, isGood = on <= 1; if (!isBad && !isGood) continue;
    var nm2 = side2 > 0 ? "White" : "Black";
    return { kind: "choice", question: "Is " + nm2 + "'s bishop on " + chName(bsq) + " a <b>good</b> or a <b>bad</b> bishop?", options: ["Good bishop", "Bad bishop"], answer: isBad ? "Bad bishop" : "Good bishop", target: 10, board: chdPos(s3, { flip: false }),
      explain: [on + " of " + nm2 + "'s " + P.length + " pawns stand on " + (col ? "light" : "dark") + " squares, the bishop's colour: " + (isBad ? "it is hemmed in by its own pawns, a 'tall pawn'." : "the pawns leave its diagonals open."), "Put your pawns on the opposite colour from your bishop; against a bad bishop, fix the pawns where they are."] };
  }
  return CH_DRILLS.chpawns.gen(ctx);
} };

/* ---- Nimzowitsch: blockade the passed pawn, attack the chain at its base ---- */
function chdChainBases(s, side) {
  /* a chain: pawns linked diagonally; its base is a pawn with a linked pawn diagonally in front and none diagonally behind */
  var P = chdPawns(s, side), out = [];
  P.forEach(function (a) {
    var ahead = P.some(function (b) { return Math.abs(chFile(b) - chFile(a)) === 1 && chRank(b) - chRank(a) === side; });
    var behind = P.some(function (b) { return Math.abs(chFile(b) - chFile(a)) === 1 && chRank(a) - chRank(b) === side; });
    if (ahead && !behind) out.push(a);
  });
  return out;
}
CH_DRILLS.chnimzo = { name: "Blockade and the chain", target: 12, gen: function (ctx) {
  var rnd = chdRnd(ctx), blockade = rnd() < 0.55;
  for (var t = 0; t < 200; t++) {
    var s = chRandomPosition(20 + ((rnd() * 50) | 0), rnd), side = rnd() < 0.5 ? 1 : -1, nm = side > 0 ? "White" : "Black", them = side > 0 ? "Black" : "White";
    if (blockade) {
      var passed = chdPassed(s, -side).filter(function (a) { var r = chRank(a) + (-side); return r >= 0 && r <= 7; });
      if (!passed.length) continue;
      var a = chdPick(passed, rnd), sq = a - 10 * side;
      return { kind: "square", question: them + " has a passed pawn on <b>" + chName(a) + "</b>. Click the square where " + nm + " should <b>blockade</b> it.", answer: chName(sq), accept: [chName(sq)], target: 10, board: chdPos(s, { flip: false, mark: [chName(a)] }),
        explain: ["<b>" + chName(sq) + "</b>, the square directly in front of the pawn.", "Nimzowitsch: the passed pawn has a 'lust to expand', so restrain it, blockade it, then destroy it. A knight is the ideal blockader: it loses none of its range standing there."] };
    }
    var bases = chdChainBases(s, -side);
    if (!bases.length) continue;
    return { kind: "square", question: "Click the <b>base</b> of a " + them + " pawn chain: the rearmost pawn of a diagonal chain, the point " + nm + " should attack.", answer: chName(bases[0]), accept: bases.map(chName), target: 12, board: chdPos(s, { flip: false }),
      explain: [them + "'s chain base" + (bases.length > 1 ? "s" : "") + ": <b>" + bases.map(chName).join(", ") + "</b>.", "Every pawn in a chain is defended by the one diagonally behind it, except the base. Attack the base with a pawn break and the whole chain loses its support."] };
  }
  return CH_DRILLS.chpawns.gen(ctx);
} };

/* ---- Silman's imbalances: what is different between the two sides ---- */
CH_DRILLS.chimbalance = { name: "Imbalances", target: 12, gen: function (ctx) {
  var rnd = chdRnd(ctx), kind = chdPick(["pair", "passed", "islands", "material"], rnd);
  var opts = ["White", "Black", "Neither"];
  for (var t = 0; t < 200; t++) {
    var s = chRandomPosition(20 + ((rnd() * 60) | 0), rnd), w, b, ans, q, why;
    if (kind === "pair") {
      var bish = function (side) { var cs = chPieces(s).filter(function (p) { return p.kind === CH_B && p.side === side; }).map(function (p) { return (chFile(p.sq) + chRank(p.sq)) % 2; }); return cs.indexOf(0) >= 0 && cs.indexOf(1) >= 0; };
      w = bish(1); b = bish(-1); ans = w && !b ? "White" : b && !w ? "Black" : "Neither";
      q = "Which side has the <b>bishop pair</b> (and the other side does not)?"; why = "Two bishops on opposite colours, against a side without them, are worth about half a pawn in an open position: open the position for them.";
    } else if (kind === "passed") {
      w = chdPassed(s, 1).length; b = chdPassed(s, -1).length; ans = w && !b ? "White" : b && !w ? "Black" : w && b ? "Both" : "Neither"; opts = ["White", "Black", "Both", "Neither"];
      q = "Which side has a <b>passed pawn</b>?"; why = "Passed: White " + (chdPassed(s, 1).map(chName).join(", ") || "none") + "; Black " + (chdPassed(s, -1).map(chName).join(", ") || "none") + ". A passed pawn is a static plus: it lasts into the endgame.";
    } else if (kind === "islands") {
      w = chdIslands(s, 1); b = chdIslands(s, -1); ans = w < b ? "White" : b < w ? "Black" : "Neither";
      q = "Which side has the healthier structure: <b>fewer pawn islands</b>?"; why = "Islands: White " + w + ", Black " + b + ". Each island has a weak end to defend.";
    } else {
      var m = chMaterial(s); w = m.white; b = m.black; ans = w > b ? "White" : b > w ? "Black" : "Neither";
      q = "Which side is <b>ahead in material</b> on the 1/3/3/5/9 count?"; why = "White " + w + ", Black " + b + ". Material is the first imbalance and the most permanent one.";
    }
    if (ans === "Neither" && rnd() < 0.7) continue;
    return { kind: "choice", question: q, options: opts, answer: ans, target: 12, board: chdPos(s, { flip: false }), explain: ["<b>" + ans + "</b>.", why] };
  }
  return CH_DRILLS.chmat.gen(ctx);
} };

/* ---- the blunder check: is this candidate safe, or does it lose material to a forcing reply? ---- */
CH_DRILLS.chblunder = { name: "Blunder check", target: 25, gen: function (ctx) {
  var rnd = chdRnd(ctx), wantBad = rnd() < 0.5, t0 = Date.now();
  /* the candidate's score after a depth-2 reply search, against the best move at depth 3: the same comparison chScoreMoves makes */
  var after = function (s, m) { chMake(s, m); var r = chLegal(s).length ? chSearch(s, 2, 15000) : { score: chInCheck(s) ? -CH_MATE : 0, move: null }; var reply = r.move ? chSan(s, r.move) : null; chUnmake(s); return { v: -r.score, reply: reply }; };
  for (var t = 0; t < 60 && Date.now() - t0 < 1500; t++) {
    var s = chRandomPosition(14 + ((rnd() * 40) | 0), rnd); if (chStatus(s) !== "") continue;
    var ms = chLegal(s); if (ms.length < 5) continue;
    /* natural-looking candidates: captures and piece moves */
    var b = chSearch(s, 3, 40000); if (!b.move || Math.abs(b.score) > 600) continue;
    var cands = lgShuffle(ms.filter(function (m) { return m.cap || Math.abs(m.piece) !== CH_P; }), rnd).slice(0, 8), m = null, c = null, best = 0, loss = 0;
    for (var k = 0; k < cands.length && !m; k++) {
      c = after(s, cands[k]); best = Math.max(b.score, c.v); loss = best - c.v;
      if (wantBad ? loss >= 250 : loss <= 30) m = cands[k];
    }
    if (!m) continue;
    var san = chSan(s, m), bestSan = chSan(s, b.move);
    return { kind: "choice", question: chdSide(s) + " to move. You are about to play <b>" + san + "</b> (marked). Blunder check: is it <b>safe</b> (within half a pawn of the best move) or a <b>blunder</b> (losing 2.5 pawns or more)?", options: ["Safe", "Blunder"], answer: wantBad ? "Blunder" : "Safe", target: 25, board: chdPos(s, { mark: [chName(m.from), chName(m.to)] }),
      explain: [wantBad ? "<b>Blunder.</b> " + (c.reply ? "After " + san + ", <b>" + c.reply + "</b> is the punishing reply" : "It loses material") + "; the engine rates it about " + (loss / 100).toFixed(1) + " pawns worse than " + bestSan + "." : "<b>Safe.</b> " + san + " is within " + (loss / 100).toFixed(1) + " pawns of the engine's best" + (bestSan !== san ? " (" + bestSan + ")" : "") + (c.reply ? "; the main reply, " + c.reply + ", wins nothing." : "."), "Before you touch a piece: what are their checks, captures and threats after my move? Look at every piece the move leaves unguarded and every line it opens."] };
  }
  return CH_DRILLS.chbest.gen(ctx);
} };

/* ---- CCT: count the forcing moves ---- */
CH_DRILLS.chcct = { name: "Checks, captures, threats", target: 20, gen: function (ctx) {
  var rnd = chdRnd(ctx), what = rnd() < 0.5 ? "checks" : "captures";
  for (var t = 0; t < 100; t++) {
    var s = chRandomPosition(14 + ((rnd() * 50) | 0), rnd); if (chStatus(s) !== "") continue;
    var ms = chLegal(s), hits = ms.filter(function (m) { if (what === "captures") return !!m.cap; chMake(s, m); var c = chInCheck(s); chUnmake(s); return c; });
    if (!hits.length && rnd() < 0.7) continue;
    var sans = hits.map(function (m) { return chSan(s, m); });
    return { kind: "num", question: chdSide(s) + " to move. How many legal <b>" + what + "</b> does " + chdSide(s) + " have?", answer: sans.length, tol: 0, target: 20, board: chdPos(s),
      explain: ["<b>" + sans.length + "</b>" + (sans.length ? ": " + sans.join(", ") : "") + ".", "The candidate list starts with the forcing moves: every check, every capture, then every threat, for both sides. List them all before calculating any; the move you never list is the one that loses the game."] };
  }
  return CH_DRILLS.chmat.gen(ctx);
} };

/* ---- mixtures for the book lessons ---- */
CH_DRILLS.chtactics = { name: "Tactics by theme", target: 20, gen: function (ctx) {
  var m = chdPick(["chfork", "chline", "chline", "chbackrank", "chmate1"], chdRnd(ctx)), q = CH_DRILLS[m].gen(ctx);
  q.question = "<small>" + CH_DRILLS[m].name + "</small> " + q.question; return q;
} };
CH_DRILLS.chendgame = { name: "Endgame technique", target: 20, gen: function (ctx) {
  var m = chdPick(["chsquare", "chopp", "chbasicmate", "chrookend", "chrookend"], chdRnd(ctx)); return CH_DRILLS[m].gen(ctx);
} };

/* ============================================================
   PLAY: a game against the engine, every move graded
   ============================================================ */
var CH_LEVELS_ENGINE = [
  { n: 1, name: "Beginner bot", about: "Looks one move ahead and blunders often.", depth: 1, noise: 350, elo: 600 },
  { n: 2, name: "Casual", about: "Two plies. Sees simple captures, misses tactics.", depth: 2, noise: 150, elo: 900 },
  { n: 3, name: "Club", about: "Three plies plus captures. Punishes hanging pieces.", depth: 3, noise: 40, elo: 1200 },
  { n: 4, name: "Strong club", about: "Four plies. Finds most two-move tactics.", depth: 4, noise: 0, elo: 1500 },
  { n: 5, name: "Expert", about: "Five plies, node-capped. Solid and sharp.", depth: 5, noise: 0, elo: 1800 },
  { n: 6, name: "Master", about: "Six plies within a budget. Hard.", depth: 6, noise: 0, elo: 2000 }
];
function chPlayNew(level, color, rnd) {
  var s = chStart();
  return { s: s, level: level, color: color, keys: [chKey(s)], moves: [], over: "", result: null, rnd: rnd || Math.random, grades: { Best: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 }, loss: 0, n: 0 };
}
function chPlayStatus(g) {
  var st = chStatus(g.s, g.keys);
  if (st === "checkmate") { g.over = "checkmate"; g.result = g.s.side === g.color ? "loss" : "win"; }
  else if (st === "stalemate" || st === "fifty" || st === "material" || st === "repetition") { g.over = st; g.result = "draw"; }
  return g.over;
}
function chEngineMove(g) {
  var L = CH_LEVELS_ENGINE[g.level - 1] || CH_LEVELS_ENGINE[2];
  var ms = chLegal(g.s); if (!ms.length) return null;
  var pick;
  if (L.noise) {
    var sc = chScoreMoves(g.s, Math.max(1, L.depth), 40000);
    var top = sc.filter(function (x) { return sc[0].score - x.score <= L.noise; });
    pick = top[(g.rnd() * top.length) | 0].move;
    if (sc[0].score >= CH_MATE - 50) pick = sc[0].move;
  } else {
    /* node budgets keep a move to a few seconds in plain JS (about 25-30k nodes a second): the depth is reached when the position allows */
    var r = chSearch(g.s, L.depth, L.depth >= 6 ? 150000 : L.depth >= 5 ? 100000 : 150000);
    pick = r.move || ms[0];
  }
  var san = chSan(g.s, pick);
  chMake(g.s, pick); g.keys.push(chKey(g.s));
  g.moves.push({ san: san, who: "engine" });
  chPlayStatus(g);
  return pick;
}
/* the hero's move: judge it at depth 4, record the grade, make it */
function chHeroMove(g, m, depth) {
  var j = chJudge(g.s, m, depth || 4, 300000);
  var san = chSan(g.s, m);
  chMake(g.s, m); g.keys.push(chKey(g.s));
  g.moves.push({ san: san, who: "hero", grade: j.grade, loss: j.loss, best: j.bestSan, drop: j.drop, quality: j.quality });
  g.grades[j.grade]++; g.loss += j.loss; g.n++;
  chPlayStatus(g);
  return j;
}
/* game accuracy: each hero move's accuracy from its win% drop (chMoveAccuracy), averaged; ACPL alongside */
function chAccuracyOf(drops) { if (!drops.length) return null; return drops.reduce(function (a, d) { return a + chMoveAccuracy(100 * d); }, 0) / drops.length; }
function chAccuracy(g) {
  if (!g.n) return null;
  var drops = g.moves.filter(function (m) { return m.who === "hero"; }).map(function (m) { return m.drop || 0; });
  return { acpl: g.loss / g.n, accuracy: chAccuracyOf(drops) };
}

/* ---- the chess level: your recent moves and your tactics rating ---- */
var CHL_LEVELS = [
  { min: 0, name: "Beginner", about: "Pieces hang, mates are missed. Drill the tactics and play the bot at level 1." },
  { min: 35, name: "Novice", about: "The rules are automatic; one-move tactics still slip by." },
  { min: 50, name: "Club player", about: "Most moves are sound. Two-move tactics and endgame technique are the gap." },
  { min: 62, name: "Intermediate", about: "Few blunders. Strategy and calculation depth decide games now." },
  { min: 72, name: "Advanced", about: "Strong, consistent play. Mistakes are positional, not tactical." },
  { min: 80, name: "Expert", about: "Nearly every move within a whisker of the engine's choice at this depth." },
  { min: 88, name: "Master", about: "The engine rarely finds a clearly better move." },
  { min: 94, name: "Grandmaster-like", about: "At this depth, the engine and you agree." }
];
function chlNew() { return { d: [], games: [], puzzle: 1000, pn: 0, ph: [] }; }
function chlAddGame(L, g, now) {
  g.moves.filter(function (m) { return m.who === "hero"; }).forEach(function (m) { L.d.push({ t: now, q: m.quality, l: m.loss, g: m.grade, d: m.drop || 0 }); });
  if (L.d.length > 1500) L.d.splice(0, L.d.length - 1500);
  var acc = chAccuracy(g);
  L.games.unshift({ t: now, level: g.level, color: g.color, result: g.result, over: g.over, n: g.n, acc: acc ? Math.round(acc.accuracy) : null, acpl: acc ? Math.round(acc.acpl) : null, grades: g.grades, moves: g.moves.map(function (m) { return m.san; }) });
  if (L.games.length > 60) L.games.length = 60;
  return L;
}
function chlRate(ds) { if (!ds.length) return null; var k = 6, p = 0.6, s = ds.reduce(function (a, d) { return a + d.q; }, 0); return 100 * (s + k * p) / (ds.length + k); }
function chlLevel(r) { var Lv = CHL_LEVELS[0]; for (var i = 0; i < CHL_LEVELS.length; i++) if (r >= CHL_LEVELS[i].min) Lv = CHL_LEVELS[i]; var ix = CHL_LEVELS.indexOf(Lv), nx = CHL_LEVELS[ix + 1] || null; return { name: Lv.name, about: Lv.about, index: ix, next: nx, toNext: nx ? (r - Lv.min) / (nx.min - Lv.min) : 1 }; }
/* a recorded move's win% drop: stored since the accuracy change; older records carry only the quality, which was 1 − 4 × drop */
function chlDrop(x) { return x.d != null ? x.d : x.q > 0 ? (1 - x.q) / 4 : 0.25; }
function chlSummary(L) {
  var d = (L && L.d) || [], recent = d.slice(-100), before = d.slice(-200, -100);
  var r = chlRate(recent), r0 = before.length >= 20 ? chlRate(before) : null;
  var wins = (L.games || []).filter(function (g) { return g.result === "win"; }).length;
  return { n: d.length, placed: d.length >= 20, left: Math.max(0, 20 - d.length), rating: r, prev: r0, delta: r != null && r0 != null ? r - r0 : null, level: r != null ? chlLevel(r) : null, acpl: recent.length ? recent.reduce(function (a, x) { return a + x.l; }, 0) / recent.length : null, accuracy: chAccuracyOf(recent.map(chlDrop)), games: (L.games || []).length, wins: wins, puzzle: L.puzzle || 1000, puzzles: L.pn || 0, bestLevelBeaten: (L.games || []).filter(function (g) { return g.result === "win"; }).reduce(function (a, g) { return Math.max(a, g.level); }, 0) };
}
/* a puzzle answered: Elo against the puzzle's rating, K shrinking as you settle */
function chlPuzzle(L, elo, ok) {
  var E = 1 / (1 + Math.pow(10, (elo - L.puzzle) / 400)), K = L.pn < 20 ? 48 : L.pn < 60 ? 32 : 20;
  L.puzzle = Math.round(L.puzzle + K * ((ok ? 1 : 0) - E));
  L.pn = (L.pn || 0) + 1;
  L.ph = L.ph || []; L.ph.push(L.puzzle); if (L.ph.length > 200) L.ph.shift();
  return L.puzzle;
}

if (typeof module !== "undefined") module.exports = {
  CH_DRILLS: CH_DRILLS, CH_MATE1: CH_MATE1, CH_MATE2: CH_MATE2, CH_OPENINGS: CH_OPENINGS, CH_UNI: CH_UNI, chdSquareRule: chdSquareRule, chdFindForks: chdFindForks, chdSoundForks: chdSoundForks, chdBuildFork: chdBuildFork, chdMate2Firsts: chdMate2Firsts, chAccuracyOf: chAccuracyOf,
  CH_LEVELS_ENGINE: CH_LEVELS_ENGINE, chPlayNew: chPlayNew, chEngineMove: chEngineMove, chHeroMove: chHeroMove, chPlayStatus: chPlayStatus, chAccuracy: chAccuracy,
  CHL_LEVELS: CHL_LEVELS, chlNew: chlNew, chlAddGame: chlAddGame, chlSummary: chlSummary, chlPuzzle: chlPuzzle, chlLevel: chlLevel
};
