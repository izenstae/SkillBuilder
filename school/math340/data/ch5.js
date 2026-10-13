/* ============================================================
 * Chapter 5 — Continuous Random Variables  (Week 5)
 * Source: class lecture notes (C5, part 1 — 22 slides) + Blitzstein &
 *         Hwang §5.1
 * Covers: continuous random variables, probability density functions
 *         and the two validity conditions, probabilities as areas,
 *         P(X = c) = 0, the CDF F(x) = ∫ f, P(X > a) = 1 − F(a) and
 *         P(a ≤ X ≤ b) = F(b) − F(a), recovering f = F′, and the mean
 *         and variance of a continuous r.v. The deck's examples (kx² on
 *         [0, 2], the traffic headway density, the bridge load, the
 *         gravel sold, and the c(1 − (1 − x)²) practice problem) appear
 *         as cards and as problem shapes with fresh numbers.
 * ============================================================ */
(function () {
  const U = MATH340.util;
  const R = String.raw;

  const flashcards = [
    {
      id: "c5-cont-def", tag: "Definition",
      front: R`When is a random variable <em>continuous</em>?`,
      back: R`When its possible values comprise a <b>single interval</b> on the number line or a <b>union of disjoint intervals</b>, and probabilities come from a density: \(P(X = c) = 0\) for every single value \(c\). Measurements (time, length, weight, load) are the typical example.`,
    },
    {
      id: "c5-pdf-def", tag: "Definition · PDF",
      front: R`Define the <em>probability density function</em> (PDF) of a continuous r.v. \(X\).`,
      back: R`A function \(f(x)\) such that for any \(a \le b\), $$P(a \le X \le b) = \int_a^b f(x)\,dx.$$ The probability of an interval is the <b>area under the density curve</b> above that interval.`,
    },
    {
      id: "c5-pdf-valid", tag: "Valid PDF",
      front: R`What two conditions make \(f\) a legitimate PDF?`,
      back: R`1. \(f(x) \ge 0\) for all \(x\).<br>2. $$\int_{-\infty}^{\infty} f(x)\,dx = 1.$$ Condition 2 is how you find an unknown constant \(k\): integrate over the support, set the result to 1, solve.`,
    },
    {
      id: "c5-point-zero", tag: "Continuous · points",
      front: R`For a continuous \(X\), what is \(P(X = c)\)? Does \(P(a \le X \le b)\) differ from \(P(a &lt; X &lt; b)\)?`,
      back: R`\(P(X = c) = \int_c^c f(x)\,dx = 0\). So endpoints never matter: $$P(a \le X \le b) = P(a &lt; X \le b) = P(a \le X &lt; b) = P(a &lt; X &lt; b).$$ This is the opposite of the discrete case, where "\(\le\)" vs "\(&lt;\)" changes the answer.`,
    },
    {
      id: "c5-density-not-prob", tag: "Common pitfall",
      front: R`Is \(f(x)\) a probability? Can a density be larger than 1?`,
      back: R`<b>No</b>, and <b>yes</b>. \(f(x)\) is probability <em>per unit length</em>: \(P(x \le X \le x + \varepsilon) \approx f(x)\,\varepsilon\) for small \(\varepsilon\). A uniform density on \([0, 0.25]\) has height \(4\). Only <b>areas</b> are probabilities, and the total area is 1.`,
    },
    {
      id: "c5-cdf-def", tag: "Definition · CDF",
      front: R`Define the CDF \(F(x)\) of a continuous r.v. with PDF \(f\).`,
      back: R`$$F(x) = P(X \le x) = \int_{-\infty}^{x} f(y)\,dy.$$ \(F(x)\) is the area under the density to the <b>left</b> of \(x\). It rises continuously from 0 (left of the support) to 1 (right of it). No jumps, since single points carry no probability.`,
    },
    {
      id: "c5-cdf-probs", tag: "Proposition",
      front: R`Express \(P(X > a)\) and \(P(a \le X \le b)\) using the CDF \(F\).`,
      back: R`$$P(X > a) = 1 - F(a), \qquad P(a \le X \le b) = F(b) - F(a).$$ The area between \(a\) and \(b\) is the area left of \(b\) minus the area left of \(a\). No endpoint adjustment is needed: that was only for discrete r.v.s.`,
    },
    {
      id: "c5-cdf-pieces", tag: "CDF · piecewise",
      front: R`\(f\) is positive only on \([0, b]\). Write the full CDF for all real \(x\).`,
      back: R`$$F(x) = \begin{cases} 0, & x &lt; 0, \\ \int_0^x f(y)\,dy, & 0 \le x \le b, \\ 1, & x > b. \end{cases}$$ Always give all three pieces: "for all real \(x\)" means the parts outside the support count too. Integrate with a dummy variable \(y\), so that \(x\) stays the upper limit.`,
    },
    {
      id: "c5-f-from-F", tag: "Proposition · f = F′",
      front: R`How do you get the PDF from the CDF?`,
      back: R`Differentiate: $$f(x) = F'(x)$$ at every \(x\) where the derivative exists (the fundamental theorem of calculus). Example: \(F(x) = 1 - e^{-2x}\) for \(x \ge 0\) gives \(f(x) = 2e^{-2x}\).`,
    },
    {
      id: "c5-mean", tag: "Definition · mean",
      front: R`Define \(E(X)\) for a continuous r.v. with PDF \(f\).`,
      back: R`$$\mu_X = E(X) = \int_{-\infty}^{\infty} x\,f(x)\,dx.$$ It is the discrete definition with the sum replaced by an integral and the PMF by the PDF. It is the balance point of the density curve.`,
    },
    {
      id: "c5-lotus", tag: "LOTUS · continuous",
      front: R`How do you compute \(E(g(X))\), e.g. \(E(X^2)\), for a continuous \(X\)?`,
      back: R`LOTUS again, with an integral: $$E(g(X)) = \int_{-\infty}^{\infty} g(x)\,f(x)\,dx.$$ So \(E(X^2) = \int x^2 f(x)\,dx\). Linearity still holds: \(E(aX + b) = aE(X) + b\).`,
    },
    {
      id: "c5-var", tag: "Definition · variance",
      front: R`Define \(V(X)\) and \(\sigma_X\) for a continuous r.v., and give the shortcut formula.`,
      back: R`$$\sigma_X^2 = V(X) = \int_{-\infty}^{\infty} (x - \mu)^2 f(x)\,dx = E[(X - \mu)^2], \qquad \sigma_X = \sqrt{V(X)}.$$ Shortcut: \(V(X) = E(X^2) - [E(X)]^2\). Usually it is easier to integrate \(x^2 f(x)\) than \((x - \mu)^2 f(x)\).`,
    },
    {
      id: "c5-ex-kx2", tag: "Example · kx²",
      front: R`\(f(x) = kx^2\) on \(0 \le x \le 2\). Find \(k\), \(P(0.5 \le X \le 1)\), \(P(1 &lt; X \le 3)\) and \(P(X > 1)\).`,
      back: R`\(\int_0^2 kx^2\,dx = \frac{8k}{3} = 1\), so \(k = \frac{3}{8}\), and \(F(x) = \frac{x^3}{8}\) on \([0, 2]\).<br>\(P(0.5 \le X \le 1) = \frac{1 - 0.125}{8} = \frac{7}{64}\).<br>\(P(1 &lt; X \le 3) = P(1 &lt; X \le 2) = 1 - \frac{1}{8} = \frac{7}{8}\). There is no density past 2.<br>\(P(X > 1) = \frac{7}{8}\) too.`,
    },
    {
      id: "c5-ex-headway", tag: "Example · traffic headway",
      front: R`Headway \(X\) (seconds) has \(f(x) = 0.15e^{-0.15(x - 0.5)}\) for \(x \ge 0.5\). Is it a valid PDF? Find \(P(X \le 5)\).`,
      back: R`\(f \ge 0\), and \(\int_{0.5}^{\infty} 0.15e^{-0.15(x - 0.5)}\,dx = \big[-e^{-0.15(x - 0.5)}\big]_{0.5}^{\infty} = 0 - (-1) = 1\). So it is valid. $$P(X \le 5) = 1 - e^{-0.15(4.5)} = 1 - e^{-0.675} \approx 0.491.$$`,
    },
    {
      id: "c5-ex-bridge", tag: "Example · bridge load",
      front: R`A bridge load has \(f(x) = \frac{1}{8} + \frac{3}{8}x\) on \([0, 2]\). Find \(F(x)\), \(P(1 \le X \le 1.5)\) and \(P(X > 1)\).`,
      back: R`\(F(x) = \frac{x}{8} + \frac{3x^2}{16}\) on \([0, 2]\), with \(0\) to the left and \(1\) to the right.<br>\(P(1 \le X \le 1.5) = F(1.5) - F(1) = \frac{39}{64} - \frac{5}{16} = \frac{19}{64}\).<br>\(P(X > 1) = 1 - \frac{5}{16} = \frac{11}{16}\).<br><small>The slide prints \(\frac{3}{8}x^2\). That version integrates to \(\frac{5}{4}\), so it is not a valid PDF. The linear \(\frac{3}{8}x\) is the intended density.</small>`,
    },
    {
      id: "c5-ex-gravel", tag: "Example · gravel sold",
      front: R`\(f(x) = \frac{3}{2}(1 - x^2)\) on \([0, 1]\). Find \(E(X)\) and \(V(X)\).`,
      back: R`\(E(X) = \frac{3}{2}\int_0^1 (x - x^3)\,dx = \frac{3}{2}\cdot\frac{1}{4} = \frac{3}{8}\).<br>\(E(X^2) = \frac{3}{2}\int_0^1 (x^2 - x^4)\,dx = \frac{3}{2}\cdot\frac{2}{15} = \frac{1}{5}\).<br>\(V(X) = \frac{1}{5} - \left(\frac{3}{8}\right)^2 = \frac{19}{320} \approx 0.0594\).`,
    },
    {
      id: "c5-ex-practice", tag: "Practice · c(1 − (1 − x)²)",
      front: R`\(f(x) = c\,(1 - (1 - x)^2)\) on \(0 &lt; x &lt; 2\). Find \(c\), \(F(x)\), \(E(X)\), \(E(X^2)\) and \(V(X)\).`,
      back: R`\(1 - (1 - x)^2 = 2x - x^2\), and \(\int_0^2 (2x - x^2)\,dx = \frac{4}{3}\), so \(c = \frac{3}{4}\).<br>\(F(x) = \frac{3x^2 - x^3}{4}\) on \([0, 2]\). For example, \(P(X &lt; \frac{1}{2}) = \frac{5}{32}\) and \(P(\frac{1}{4} &lt; X &lt; \frac{3}{4}) = \frac{35}{128}\).<br>The density is symmetric about 1, so \(E(X) = 1\). \(E(X^2) = \frac{6}{5}\), so \(V(X) = \frac{1}{5}\).`,
    },
    {
      id: "c5-uniform", tag: "Uniform(a, b)",
      front: R`\(X \sim \text{Unif}(a, b)\). Give its PDF, CDF, mean and variance.`,
      back: R`$$f(x) = \frac{1}{b - a}\ \ (a \le x \le b), \qquad F(x) = \frac{x - a}{b - a}\ \ (a \le x \le b),$$ $$E(X) = \frac{a + b}{2}, \qquad V(X) = \frac{(b - a)^2}{12}.$$ Probability is proportional to length: \(P(c \le X \le d) = \frac{d - c}{b - a}\) for \([c, d] \subseteq [a, b]\).`,
    },
    {
      id: "c5-percentile", tag: "Percentiles",
      front: R`How do you find the median (or the \(p\)th percentile) of a continuous \(X\)?`,
      back: R`Solve \(F(m) = 0.5\) (or \(F(x_p) = p\)) for the unknown. The median splits the area under the density in half. For a skewed density it differs from the mean. Example: \(F(x) = 1 - e^{-\lambda x}\) gives \(m = \frac{\ln 2}{\lambda}\), while the mean is \(\frac{1}{\lambda}\).`,
    },
    {
      id: "c5-disc-vs-cont", tag: "Discrete ↔ continuous",
      front: R`Translate the discrete toolkit to continuous r.v.s: the PMF, sums over \(x\), point probabilities \(P(X = x)\) and the jumps in the CDF.`,
      back: R`PMF \(p(x)\) \(\to\) PDF \(f(x)\) (a density, not a probability: \(f(x) > 1\) is allowed); \(\sum_x\) \(\to\) \(\int dx\); \(P(X = x) > 0\) at the support points \(\to\) \(P(X = x) = 0\) for every \(x\); jumps in \(F\) \(\to\) a continuous \(F\) with \(F'(x) = f(x)\) wherever \(f\) is continuous. \(E(X)\), \(E[g(X)]\) (LOTUS) and \(V(X)\) keep the same form with \(\sum \to \int\) and \(p \to f\): \(E(X) = \int x f(x)\,dx\). Linearity, \(V(X) = E(X^2) - \mu^2\) and \(V(aX + b) = a^2 V(X)\) carry over unchanged.`,
    },
  ];

  /* ---------------- exact rational arithmetic ----------------
   * Polynomial densities on [0, b] with integer coefficients give rational
   * areas, CDF values and moments, so the solutions can show exact
   * fractions instead of decimals that hide where the answer came from. */
  function Q(n, d = 1) {
    if (d < 0) { n = -n; d = -d; }
    const g = U.gcd(n, d) || 1;
    return [n / g, d / g];
  }
  const qa = (x, y) => Q(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
  const qs = (x, y) => Q(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
  const qm = (x, y) => Q(x[0] * y[0], x[1] * y[1]);
  const qd = (x, y) => Q(x[0] * y[1], x[1] * y[0]);
  const qp = (x, k) => Q(Math.pow(x[0], k), Math.pow(x[1], k));
  const qv = x => x[0] / x[1];
  function qt(x) {                                       // signed LaTeX
    const s = U.fracTex(Math.abs(x[0]), x[1]);
    return x[0] < 0 ? `-${s}` : s;
  }
  const f4 = x => U.fmt(x, 4);

  /* A polynomial is a list of [rational coefficient, power]. */
  function integ(poly, lo, hi) {                         // ∫_lo^hi poly
    let s = Q(0);
    for (const [c, p] of poly) s = qa(s, qm(c, qd(qs(qp(hi, p + 1), qp(lo, p + 1)), Q(p + 1))));
    return s;
  }
  const shift = (poly, k) => poly.map(([c, p]) => [c, p + k]);   // x^k · poly
  const scale = (poly, k) => poly.map(([c, p]) => [qm(c, k), p]);
  function polyTex(poly, v = "x") {
    const parts = [];
    poly.filter(([c]) => c[0] !== 0).forEach(([c, p], i) => {
      const mag = Q(Math.abs(c[0]), c[1]);
      const coef = (p > 0 && mag[0] === 1 && mag[1] === 1) ? "" : U.fracTex(mag[0], mag[1]);
      const pow = p === 0 ? "" : p === 1 ? v : `${v}^{${p}}`;
      const term = coef && pow ? `${coef}${pow}` : coef + pow;
      parts.push(i === 0 ? (c[0] < 0 ? `-${term}` : term) : `${c[0] < 0 ? "-" : "+"} ${term}`);
    });
    return parts.join(" ") || "0";
  }
  const antiTex = poly => polyTex(poly.map(([c, p]) => [qd(c, Q(p + 1)), p + 1]));

  /* Polynomial density shapes on [0, b]: `p` is the unnormalised shape. */
  const SHAPES = [
    () => { const n = U.randInt(1, 3), b = U.randInt(1, 3); return { b, p: [[Q(1), n]], tex: n === 1 ? "x" : `x^{${n}}` }; },
    () => { const b = U.randInt(1, 3); const alt = b === 2 && Math.random() < 0.5;
      return { b, p: [[Q(b), 1], [Q(-1), 2]], tex: alt ? R`\left(1 - (1 - x)^2\right)` : `x(${b} - x)`, sym: true }; },
    () => { const b = U.randInt(1, 2); return { b, p: [[Q(b * b), 0], [Q(-1), 2]], tex: `(${b * b} - x^2)` }; },
    () => { const b = U.randInt(1, 4); return { b, p: [[Q(b), 0], [Q(-1), 1]], tex: `(${b} - x)` }; },
    () => { const a = U.randInt(1, 3), b = U.randInt(1, 2); return { b, p: [[Q(a), 0], [Q(1), 1]], tex: `(${a} + x)` }; },
  ];

  /* A fully worked density: shape, constant k, CDF, moments, all exact. */
  function density(pickShape) {
    const s = (pickShape || U.pick(SHAPES))();
    const B = Q(s.b);
    const area = integ(s.p, Q(0), B);
    const k = qd(Q(1), area);
    const fpoly = scale(s.p, k);
    const F = x => (qv(x) <= 0 ? Q(0) : qv(x) >= s.b ? Q(1) : integ(fpoly, Q(0), x));
    const ex = integ(shift(fpoly, 1), Q(0), B);
    const ex2 = integ(shift(fpoly, 2), Q(0), B);
    const v = qs(ex2, qm(ex, ex));
    const kTex = U.fracTex(k[0], k[1]);
    const fTex = R`f(x) = \begin{cases} ${kTex}\,${s.tex}, & 0 \le x \le ${s.b}, \\ 0, & \text{otherwise.} \end{cases}`;
    return { ...s, B, area, k, kTex, fpoly, F, ex, ex2, v, fTex };
  }
  // A rational point strictly inside (0, b), in quarters.
  function inner(b, avoid) {
    let x;
    do { x = Q(U.randInt(1, 4 * b - 1), 4); } while (avoid && qv(x) === qv(avoid));
    return x;
  }
  const dec = x => U.fmt(qv(x), 4);                       // 3/4 -> "0.75"
  const rate = lam => (lam === 1 ? "" : lam);             // e^{-x}, not e^{-1x}

  const EXP_CTX = [
    { what: "the time headway (in seconds) between consecutive cars on a busy freeway", unit: "seconds" },
    { what: "the time (in minutes) until the next customer arrives after the shop has been open a while", unit: "minutes" },
    { what: "the lifetime (in years) of a component, which carries a minimum warranty life", unit: "years" },
  ];
  function expDensity() {
    const lam = U.pick([0.1, 0.15, 0.2, 0.25, 0.4, 0.5]);
    const a = U.pick([0, 0.5, 1, 2]);
    const ctx = U.pick(EXP_CTX);
    const ex = a === 0 ? "x" : `(x - ${a})`;
    const fTex = R`f(x) = \begin{cases} ${lam}\,e^{-${lam}${ex}}, & x \ge ${a}, \\ 0, & \text{otherwise.} \end{cases}`;
    const F = t => (t <= a ? 0 : 1 - Math.exp(-lam * (t - a)));
    return { lam, a, ctx, ex, fTex, F };
  }

  const generators = [
    /* ========== 1. Valid densities ========== */
    MATH340.makeGenerator({
      id: "c5-gen-pdf",
      name: "Valid PDFs & normalising constants",
      blurb: "f ≥ 0 and total area 1: find k, check a candidate, step and uniform densities, solve for the support.",
      variants: [
        {
          name: "Find the constant k",
          make() {
            const d = density();
            return {
              q: R`A continuous random variable \(X\) has density \(f(x) = k\,${d.tex}\) for \(0 \le x \le ${d.b}\), and \(f(x) = 0\) otherwise. Find the value of \(k\) that makes \(f\) a valid PDF.`,
              answer: qv(d.k), kind: "num",
              sol: R`<div class="sol-step">A PDF must have total area 1. Integrate over the support and set the result equal to 1.</div>
                   <div class="sol-step">$$\int_0^{${d.b}} \left(${polyTex(d.p)}\right)dx = \Big[${antiTex(d.p)}\Big]_0^{${d.b}} = ${qt(d.area)}$$</div>
                   <div class="sol-step">$$k \cdot ${qt(d.area)} = 1 \implies k = ${d.kTex} \approx ${f4(qv(d.k))}$$ Also check \(f \ge 0\) on \([0, ${d.b}]\), which it is.</div>`,
            };
          },
        },
        {
          name: "Total area of a candidate density",
          make() {
            const d = density();
            const m = U.pick([Q(1), Q(1), Q(1, 2), Q(3, 2), Q(2), Q(3, 4)]);
            const c = qm(d.k, m);
            const total = qm(c, d.area);
            return {
              q: R`Someone proposes \(f(x) = ${qt(c)}\,${d.tex}\) for \(0 \le x \le ${d.b}\) (and \(0\) otherwise) as a PDF. Compute \(\int_{-\infty}^{\infty} f(x)\,dx\). (The function is a valid PDF only if the answer is exactly 1.)`,
              answer: qv(total), kind: "num",
              sol: R`<div class="sol-step">\(f \ge 0\) holds on \([0, ${d.b}]\), so validity comes down to the total area.</div>
                   <div class="sol-step">$$\int_0^{${d.b}} ${qt(c)}\,(${polyTex(d.p)})\,dx = ${qt(c)} \cdot ${qt(d.area)} = ${qt(total)}$$</div>
                   <div class="sol-step">${qv(total) === 1 ? "The area is 1: a valid PDF." : R`The area is \(${qt(total)} \ne 1\): <b>not</b> a valid PDF. The constant that would fix it is \(${d.kTex}\).`}</div>`,
            };
          },
        },
        {
          name: "Exponential-type density: find k",
          make() {
            const e = expDensity();
            return {
              q: R`Let \(X\) be ${e.ctx.what}, with density \(f(x) = k\,e^{-${e.lam}${e.ex}}\) for \(x \ge ${e.a}\), and \(0\) otherwise. Find \(k\).`,
              answer: e.lam, kind: "num",
              sol: R`<div class="sol-step">Set the total area to 1. The integral runs from \(${e.a}\) to \(\infty\).</div>
                   <div class="sol-step">$$\int_{${e.a}}^{\infty} k\,e^{-${e.lam}${e.ex}}\,dx = k\Big[-\tfrac{1}{${e.lam}}e^{-${e.lam}${e.ex}}\Big]_{${e.a}}^{\infty} = k\cdot\frac{1}{${e.lam}}$$</div>
                   <div class="sol-step">$$\frac{k}{${e.lam}} = 1 \implies k = ${e.lam}$$ The coefficient in front of the exponential equals the rate. That is why \(\lambda e^{-\lambda x}\) is a valid density for every rate \(\lambda > 0\).</div>`,
            };
          },
        },
        {
          name: "Step density",
          make() {
            const u = U.randInt(1, 3), w = U.randInt(1, 3), r = U.pick([2, 3, 4]);
            const c = Q(1, u + r * w);
            return {
              q: R`A density takes two levels: $$f(x) = \begin{cases} c, & 0 \le x &lt; ${u}, \\ ${r}c, & ${u} \le x \le ${u + w}, \\ 0, & \text{otherwise.} \end{cases}$$ Find \(c\).`,
              answer: qv(c), kind: "num",
              sol: R`<div class="sol-step">The area under a step density is a sum of rectangles: height \(\times\) width for each piece.</div>
                   <div class="sol-step">$$c \cdot ${u} + ${r}c \cdot ${w} = ${u + r * w}c = 1$$</div>
                   <div class="sol-step">$$c = ${qt(c)} \approx ${f4(qv(c))}$$</div>`,
            };
          },
        },
        {
          name: "Uniform on a short interval: heights above 1",
          make() {
            const a = U.randInt(0, 5);
            const w = U.pick([Q(1, 5), Q(1, 4), Q(2, 5), Q(1, 2), Q(1, 8)]);
            const h = qd(Q(1), w);
            const b = qa(Q(a), w);
            return {
              q: R`\(X\) is uniformly distributed on the interval \([${a}, ${dec(b)}]\). What is the value of its density \(f(x)\) for \(x\) inside that interval?`,
              answer: qv(h), kind: "num",
              sol: R`<div class="sol-step">A uniform density is constant on its interval, and the rectangle must have area 1: height \(\times\) width \(= 1\).</div>
                   <div class="sol-step">$$f(x) = \frac{1}{${dec(b)} - ${a}} = \frac{1}{${dec(w)}} = ${qt(h)}$$</div>
                   <div class="sol-step">The height is bigger than 1, and that is fine. A density is probability per unit length, not a probability. Only areas must lie in \([0, 1]\).</div>`,
            };
          },
        },
        {
          name: "Solve for the support",
          make() {
            const lin = Math.random() < 0.5;
            const b = lin ? U.randInt(2, 6) : U.randInt(1, 3);
            const kq = lin ? Q(2, b * b) : Q(3, b * b * b);
            return {
              q: R`\(f(x) = ${qt(kq)}\,${lin ? "x" : "x^2"}\) for \(0 \le x \le b\), and \(0\) otherwise. For what value of \(b\) is \(f\) a valid PDF?`,
              answer: b, kind: "num",
              sol: R`<div class="sol-step">Now the constant is known and the endpoint is the unknown. Still set the total area to 1.</div>
                   <div class="sol-step">$$\int_0^b ${qt(kq)}\,${lin ? "x" : "x^2"}\,dx = ${qt(kq)}\cdot\frac{b^{${lin ? 2 : 3}}}{${lin ? 2 : 3}} = 1 \implies b^{${lin ? 2 : 3}} = ${lin ? b * b : b * b * b}$$</div>
                   <div class="sol-step">$$b = ${b}$$ (the positive root, since the support is \([0, b]\)).</div>`,
            };
          },
        },
      ],
    }),

    /* ========== 2. Probabilities as areas ========== */
    MATH340.makeGenerator({
      id: "c5-gen-prob",
      name: "Probabilities from a PDF",
      blurb: "Integrate the density over the event: intervals, tails, ranges past the support, exponentials, conditioning.",
      variants: [
        {
          name: "Area between two points",
          make() {
            const d = density();
            const x1 = inner(d.b), x2 = inner(d.b, x1);
            const [lo, hi] = qv(x1) < qv(x2) ? [x1, x2] : [x2, x1];
            const ans = qs(d.F(hi), d.F(lo));
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(P(${dec(lo)} \le X \le ${dec(hi)})\).`,
              answer: qv(ans), kind: "prob",
              sol: R`<div class="sol-step">The probability is the area under \(f\) between the two points: \(\int_{${dec(lo)}}^{${dec(hi)}} f(x)\,dx\).</div>
                   <div class="sol-step">An antiderivative of \(f\) is \(${antiTex(d.fpoly)}\), so $$P = \Big[${antiTex(d.fpoly)}\Big]_{${dec(lo)}}^{${dec(hi)}} = ${qt(d.F(hi))} - ${qt(d.F(lo))}$$</div>
                   <div class="sol-step">$$P(${dec(lo)} \le X \le ${dec(hi)}) = ${qt(ans)} \approx ${f4(qv(ans))}$$</div>`,
            };
          },
        },
        {
          name: "Interval running past the support",
          make() {
            const d = density();
            const lo = inner(d.b);
            const hi = d.b + U.randInt(1, 3);
            const ans = qs(Q(1), d.F(lo));
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(P(${dec(lo)} &lt; X \le ${hi})\).`,
              answer: qv(ans), kind: "prob",
              sol: R`<div class="sol-step">The density is \(0\) beyond \(x = ${d.b}\), so the part of the interval from \(${d.b}\) to \(${hi}\) adds no area: \(P(${dec(lo)} &lt; X \le ${hi}) = P(${dec(lo)} &lt; X \le ${d.b})\).</div>
                   <div class="sol-step">$$\int_{${dec(lo)}}^{${d.b}} f(x)\,dx = 1 - F(${dec(lo)}) = 1 - ${qt(d.F(lo))}$$</div>
                   <div class="sol-step">$$= ${qt(ans)} \approx ${f4(qv(ans))}$$</div>`,
            };
          },
        },
        {
          name: "Upper tail by the complement",
          make() {
            const d = density();
            const a = inner(d.b);
            const ans = qs(Q(1), d.F(a));
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(P(X > ${dec(a)})\).`,
              answer: qv(ans), kind: "prob",
              sol: R`<div class="sol-step">Either integrate from \(${dec(a)}\) to \(${d.b}\), or use \(P(X > a) = 1 - F(a)\). The second is often less work.</div>
                   <div class="sol-step">$$F(${dec(a)}) = \int_0^{${dec(a)}} f(x)\,dx = ${qt(d.F(a))}$$</div>
                   <div class="sol-step">$$P(X > ${dec(a)}) = 1 - ${qt(d.F(a))} = ${qt(ans)} \approx ${f4(qv(ans))}$$</div>`,
            };
          },
        },
        {
          name: "Exponential density: area under a decaying curve",
          make() {
            const e = expDensity();
            const t = e.a + U.pick([1, 2, 3, 4.5, 5, 8]);
            const upper = Math.random() < 0.5;
            const below = e.F(t);
            const ans = upper ? 1 - below : below;
            const arg = U.fmt(e.lam * (t - e.a), 4);
            return {
              q: R`Let \(X\) be ${e.ctx.what}, with density $$${e.fTex}$$ Find \(P(X ${upper ? ">" : R`\le`} ${t})\).`,
              answer: ans, kind: "prob",
              sol: R`<div class="sol-step">Integrate the density from where it starts, \(x = ${e.a}\). An antiderivative of \(${e.lam}e^{-${e.lam}${e.ex}}\) is \(-e^{-${e.lam}${e.ex}}\).</div>
                   <div class="sol-step">$$P(X \le ${t}) = \Big[-e^{-${e.lam}${e.ex}}\Big]_{${e.a}}^{${t}} = 1 - e^{-${e.lam}(${U.fmt(t - e.a)})} = 1 - e^{-${arg}}$$</div>
                   <div class="sol-step">$$P(X ${upper ? ">" : R`\le`} ${t}) ${upper ? R`= e^{-${arg}}` : ""} \approx ${f4(ans)}$$</div>`,
            };
          },
        },
        {
          name: "Conditional probability from a density",
          make() {
            const d = density();
            let a, c;
            do { a = inner(d.b); c = inner(d.b, a); } while (qv(c) <= qv(a));
            const ta = qs(Q(1), d.F(a)), tc = qs(Q(1), d.F(c));
            const ans = qd(tc, ta);
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Given that \(X > ${dec(a)}\), find the probability that \(X > ${dec(c)}\).`,
              answer: qv(ans), kind: "prob",
              sol: R`<div class="sol-step">The definition of conditional probability. Since \(\{X > ${dec(c)}\} \subseteq \{X > ${dec(a)}\}\), the intersection is just \(\{X > ${dec(c)}\}\): $$P(X > ${dec(c)} \mid X > ${dec(a)}) = \frac{P(X > ${dec(c)})}{P(X > ${dec(a)})}$$</div>
                   <div class="sol-step">Both tails via the CDF: \(1 - F(${dec(c)}) = ${qt(tc)}\) and \(1 - F(${dec(a)}) = ${qt(ta)}\).</div>
                   <div class="sol-step">$$\frac{${qt(tc)}}{${qt(ta)}} = ${qt(ans)} \approx ${f4(qv(ans))}$$</div>`,
            };
          },
        },
        {
          name: "Single points have zero probability",
          make() {
            const d = density();
            const askPoint = Math.random() < 0.35;
            if (askPoint) {
              const c = inner(d.b);
              return {
                q: R`\(X\) has density $$${d.fTex}$$ Find \(P(X = ${dec(c)})\).`,
                answer: 0, kind: "prob",
                sol: R`<div class="sol-step">For a continuous r.v., a single point has no width, so no area above it.</div>
                     <div class="sol-step">$$P(X = ${dec(c)}) = \int_{${dec(c)}}^{${dec(c)}} f(x)\,dx = 0$$ The density value \(f(${dec(c)})\) is <b>not</b> this probability.</div>`,
              };
            }
            const x1 = inner(d.b), x2 = inner(d.b, x1);
            const [lo, hi] = qv(x1) < qv(x2) ? [x1, x2] : [x2, x1];
            const ans = qs(d.F(hi), d.F(lo));
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(P(${dec(lo)} &lt; X &lt; ${dec(hi)})\). (Strict inequalities.)`,
              answer: qv(ans), kind: "prob",
              sol: R`<div class="sol-step">Strict or not makes no difference for a continuous r.v.: the endpoints have probability 0, so \(P(${dec(lo)} &lt; X &lt; ${dec(hi)}) = F(${dec(hi)}) - F(${dec(lo)})\).</div>
                   <div class="sol-step">$$= ${qt(d.F(hi))} - ${qt(d.F(lo))} = ${qt(ans)} \approx ${f4(qv(ans))}$$</div>`,
            };
          },
        },
      ],
    }),

    /* ========== 3. The CDF ========== */
    MATH340.makeGenerator({
      id: "c5-gen-cdf",
      name: "CDF ↔ PDF",
      blurb: "F(x) = ∫ f, probabilities from F, f = F′, and percentiles by solving F(x) = p.",
      variants: [
        {
          name: "F(x) by integrating the density",
          make() {
            const d = density();
            const x0 = inner(d.b);
            const ans = d.F(x0);
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find the CDF value \(F(${dec(x0)}) = P(X \le ${dec(x0)})\).`,
              answer: qv(ans), kind: "prob",
              sol: R`<div class="sol-step">\(F(x) = \int_{-\infty}^x f(y)\,dy\). The density is 0 left of 0, so integrate from 0.</div>
                   <div class="sol-step">For \(0 \le x \le ${d.b}\): \(F(x) = ${antiTex(d.fpoly)}\).</div>
                   <div class="sol-step">$$F(${dec(x0)}) = ${qt(ans)} \approx ${f4(qv(ans))}$$</div>`,
            };
          },
        },
        {
          name: "F outside the support",
          make() {
            const d = density();
            const left = Math.random() < 0.5;
            const x0 = left ? -U.randInt(1, 3) : d.b + U.randInt(1, 4);
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(F(${x0})\).`,
              answer: left ? 0 : 1, kind: "prob",
              sol: R`<div class="sol-step">"\(F\) for all real \(x\)" includes the pieces off the support. \(F(x) = P(X \le x)\) is the area to the left of \(x\).</div>
                   <div class="sol-step">${left
                     ? R`\(${x0} &lt; 0\): there is no density to the left, so \(F(${x0}) = 0\).`
                     : R`\(${x0} > ${d.b}\): all of the density is to the left, so \(F(${x0}) = 1\).`}</div>`,
            };
          },
        },
        {
          name: "Probability from a given CDF",
          make() {
            const kind = U.randInt(0, 2);
            let Ftex, Fv, lo, hi, cases;
            if (kind === 0) {
              const n = U.randInt(2, 4), b = U.randInt(1, 3);
              cases = R`\left(\frac{x}{${b}}\right)^{${n}}, & 0 \le x \le ${b}`;
              Fv = x => (x <= 0 ? 0 : x >= b ? 1 : Math.pow(x / b, n));
              [lo, hi] = [U.randInt(1, 2 * b - 1) / 4, null];
              hi = lo + U.randInt(1, 2 * b) / 4;
              Ftex = R`F(x) = \begin{cases} 0, & x &lt; 0, \\ ${cases}, \\ 1, & x > ${b}. \end{cases}`;
            } else if (kind === 1) {
              const lam = U.pick([0.5, 1, 2, 0.25]);
              Fv = x => (x <= 0 ? 0 : 1 - Math.exp(-lam * x));
              lo = U.pick([0.5, 1, 2]); hi = lo + U.pick([1, 2, 3]);
              Ftex = R`F(x) = \begin{cases} 0, & x &lt; 0, \\ 1 - e^{-${rate(lam)}x}, & x \ge 0. \end{cases}`;
            } else {
              Fv = x => (x <= 0 ? 0 : x >= 2 ? 1 : (3 * x * x - x * x * x) / 4);
              lo = U.randInt(1, 4) / 4; hi = lo + U.randInt(1, 3) / 4;
              Ftex = R`F(x) = \begin{cases} 0, & x &lt; 0, \\ \dfrac{3x^2 - x^3}{4}, & 0 \le x \le 2, \\ 1, & x > 2. \end{cases}`;
            }
            const tail = Math.random() < 0.4;
            const ans = tail ? 1 - Fv(lo) : Fv(hi) - Fv(lo);
            return {
              q: R`A continuous r.v. \(X\) has CDF $$${Ftex}$$ Find \(${tail ? `P(X > ${lo})` : `P(${lo} \\le X \\le ${hi})`}\).`,
              answer: ans, kind: "prob",
              sol: R`<div class="sol-step">With the CDF in hand, no integration is needed: ${tail ? R`\(P(X > a) = 1 - F(a)\)` : R`\(P(a \le X \le b) = F(b) - F(a)\)`}.</div>
                   <div class="sol-step">${tail ? R`$$1 - F(${lo}) = 1 - ${f4(Fv(lo))}$$` : R`$$F(${hi}) - F(${lo}) = ${f4(Fv(hi))} - ${f4(Fv(lo))}$$`}</div>
                   <div class="sol-step">$$\approx ${f4(ans)}$$</div>`,
            };
          },
        },
        {
          name: "PDF from the CDF: f = F′",
          make() {
            if (Math.random() < 0.5) {
              const n = U.randInt(2, 4), b = U.randInt(1, 3);
              const x0 = U.randInt(1, 4 * b - 1) / 4;
              const ans = n * Math.pow(x0, n - 1) / Math.pow(b, n);
              return {
                q: R`\(X\) has CDF \(F(x) = \left(\frac{x}{${b}}\right)^{${n}}\) for \(0 \le x \le ${b}\) (with \(F = 0\) to the left and \(F = 1\) to the right). Find the density value \(f(${x0})\).`,
                answer: ans, kind: "num",
                sol: R`<div class="sol-step">The density is the derivative of the CDF: \(f(x) = F'(x)\).</div>
                     <div class="sol-step">$$f(x) = \frac{d}{dx}\frac{x^{${n}}}{${Math.pow(b, n)}} = \frac{${n}x^{${n - 1}}}{${Math.pow(b, n)}}, \quad 0 \le x \le ${b}$$</div>
                     <div class="sol-step">$$f(${x0}) = \frac{${n}(${x0})^{${n - 1}}}{${Math.pow(b, n)}} \approx ${f4(ans)}$$ It is a density value, not a probability.</div>`,
              };
            }
            const lam = U.pick([0.5, 1, 2, 3]);
            const x0 = U.pick([0.5, 1, 1.5, 2]);
            const ans = lam * Math.exp(-lam * x0);
            return {
              q: R`\(X\) has CDF \(F(x) = 1 - e^{-${rate(lam)}x}\) for \(x \ge 0\) (and \(0\) for \(x &lt; 0\)). Find the density value \(f(${x0})\).`,
              answer: ans, kind: "num",
              sol: R`<div class="sol-step">Differentiate the CDF: \(f(x) = F'(x)\).</div>
                   <div class="sol-step">$$f(x) = \frac{d}{dx}\left(1 - e^{-${rate(lam)}x}\right) = ${rate(lam)}e^{-${rate(lam)}x}, \quad x \ge 0$$</div>
                   <div class="sol-step">$$f(${x0}) = ${rate(lam)}e^{-${U.fmt(lam * x0)}} \approx ${f4(ans)}$$</div>`,
            };
          },
        },
        {
          name: "Median or percentile: solve F(x) = p",
          make() {
            const p = U.pick([0.5, 0.5, 0.25, 0.75, 0.9]);
            const name = p === 0.5 ? "median" : `${Math.round(p * 100)}th percentile`;
            if (Math.random() < 0.5) {
              const n = U.randInt(1, 3), b = U.randInt(1, 4);
              const ans = b * Math.pow(p, 1 / n);
              return {
                q: R`\(X\) has CDF \(F(x) = \left(\frac{x}{${b}}\right)${n === 1 ? "" : `^{${n}}`}\) for \(0 \le x \le ${b}\). Find the ${name} of \(X\).`,
                answer: ans, kind: "num",
                sol: R`<div class="sol-step">The ${name} is the \(x\) with \(F(x) = ${p}\): ${p === 0.5 ? "half the area lies to its left" : `${Math.round(p * 100)}% of the area lies to its left`}.</div>
                     <div class="sol-step">$$\left(\frac{x}{${b}}\right)${n === 1 ? "" : `^{${n}}`} = ${p} \implies x = ${b}\cdot${n === 1 ? p : `(${p})^{1/${n}}`}$$</div>
                     <div class="sol-step">$$x \approx ${f4(ans)}$$</div>`,
              };
            }
            const lam = U.pick([0.1, 0.2, 0.5, 1, 2]);
            const ans = -Math.log(1 - p) / lam;
            return {
              q: R`\(X\) has CDF \(F(x) = 1 - e^{-${rate(lam)}x}\) for \(x \ge 0\). Find the ${name} of \(X\).`,
              answer: ans, kind: "num",
              sol: R`<div class="sol-step">Solve \(F(x) = ${p}\) for \(x\).</div>
                   <div class="sol-step">$$1 - e^{-${rate(lam)}x} = ${p} \implies e^{-${rate(lam)}x} = ${U.fmt(1 - p, 2)} \implies x = \frac{-\ln(${U.fmt(1 - p, 2)})}{${lam}}$$</div>
                   <div class="sol-step">$$x \approx ${f4(ans)}$$${p === 0.5 ? R` The mean is \(\frac{1}{${lam}} = ${f4(1 / lam)}\), larger than the median: the long right tail pulls the mean up.` : ""}</div>`,
            };
          },
        },
      ],
    }),

    /* ========== 4. Mean and variance ========== */
    MATH340.makeGenerator({
      id: "c5-gen-moments",
      name: "Mean & variance of a continuous r.v.",
      blurb: "E(X) = ∫ x f, E(X²) by LOTUS, V(X) = E(X²) − [E(X)]², symmetry, uniforms and linear transforms.",
      variants: [
        {
          name: "E(X) = ∫ x f(x) dx",
          make() {
            const d = density();
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(E(X)\).`,
              answer: qv(d.ex), kind: "num",
              sol: R`<div class="sol-step">Integrate \(x\) times the density over the support: \(E(X) = \int_0^{${d.b}} x f(x)\,dx\).</div>
                   <div class="sol-step">$$\int_0^{${d.b}} \left(${polyTex(shift(d.fpoly, 1))}\right)dx = \Big[${antiTex(shift(d.fpoly, 1))}\Big]_0^{${d.b}}$$</div>
                   <div class="sol-step">$$E(X) = ${qt(d.ex)} \approx ${f4(qv(d.ex))}$$</div>`,
            };
          },
        },
        {
          name: "E(X²) by LOTUS",
          make() {
            const d = density();
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(E(X^2)\).`,
              answer: qv(d.ex2), kind: "num",
              sol: R`<div class="sol-step">LOTUS: \(E(X^2) = \int x^2 f(x)\,dx\). Multiply the density by \(x^2\) and integrate. You do not need the distribution of \(X^2\).</div>
                   <div class="sol-step">$$\int_0^{${d.b}} \left(${polyTex(shift(d.fpoly, 2))}\right)dx = \Big[${antiTex(shift(d.fpoly, 2))}\Big]_0^{${d.b}}$$</div>
                   <div class="sol-step">$$E(X^2) = ${qt(d.ex2)} \approx ${f4(qv(d.ex2))}$$</div>`,
            };
          },
        },
        {
          name: "Variance by the shortcut",
          make() {
            const d = density();
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(V(X)\).`,
              answer: qv(d.v), kind: "num",
              sol: R`<div class="sol-step">\(V(X) = E(X^2) - [E(X)]^2\): two integrals, then subtract.</div>
                   <div class="sol-step">\(E(X) = \int_0^{${d.b}} x f(x)\,dx = ${qt(d.ex)}\), and \(E(X^2) = \int_0^{${d.b}} x^2 f(x)\,dx = ${qt(d.ex2)}\).</div>
                   <div class="sol-step">$$V(X) = ${qt(d.ex2)} - \left(${qt(d.ex)}\right)^2 = ${qt(d.v)} \approx ${f4(qv(d.v))}$$</div>`,
            };
          },
        },
        {
          name: "Standard deviation",
          make() {
            const d = density();
            const ans = Math.sqrt(qv(d.v));
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(\sigma_X\), the standard deviation of \(X\).`,
              answer: ans, kind: "num",
              sol: R`<div class="sol-step">\(\sigma_X = \sqrt{V(X)}\), so get the variance first.</div>
                   <div class="sol-step">\(E(X) = ${qt(d.ex)}\), \(E(X^2) = ${qt(d.ex2)}\), so \(V(X) = ${qt(d.v)}\).</div>
                   <div class="sol-step">$$\sigma_X = \sqrt{${qt(d.v)}} \approx ${f4(ans)}$$</div>`,
            };
          },
        },
        {
          name: "Symmetric density: read off the mean",
          make() {
            const useUnif = Math.random() < 0.4;
            if (useUnif) {
              const a = U.randInt(-3, 5), w = U.randInt(2, 10);
              return {
                q: R`\(X\) has density \(f(x) = \frac{1}{${w}}\) for \(${a} \le x \le ${a + w}\), and \(0\) otherwise. Find \(E(X)\).`,
                answer: a + w / 2, kind: "num",
                sol: R`<div class="sol-step">The density is flat, so it is symmetric about the midpoint of its interval, and the balance point is that midpoint.</div>
                     <div class="sol-step">$$E(X) = \frac{${a} + ${a + w < 0 ? `(${a + w})` : a + w}}{2} = ${U.fmt(a + w / 2)}$$ (Integrating \(\int x\cdot\frac{1}{${w}}\,dx\) gives the same.)</div>`,
              };
            }
            const d = density(SHAPES[1]);
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Find \(E(X)\).`,
              answer: qv(d.ex), kind: "num",
              sol: R`<div class="sol-step">Look before integrating: \(${d.tex} \) is symmetric about \(x = ${U.fmt(d.b / 2)}\) (\(f(${U.fmt(d.b / 2)} + t) = f(${U.fmt(d.b / 2)} - t)\)).</div>
                   <div class="sol-step">A symmetric density balances at its centre of symmetry: $$E(X) = ${U.fmt(d.b / 2)}$$</div>`,
            };
          },
        },
        {
          name: "Uniform(a, b): mean and variance",
          make() {
            const a = U.randInt(-5, 10), w = U.randInt(2, 12);
            const b = a + w;
            const askVar = Math.random() < 0.5;
            const ctx = U.pick([
              R`A bus arrives at a uniformly random time between ${a} and ${b} minutes after the hour. Let \(X\) be the arrival time (minutes after the hour).`,
              R`\(X \sim \text{Unif}(${a}, ${b})\).`,
            ].slice(a < 0 ? 1 : 0));   // "-3 minutes after the hour" is not a time
            const ans = askVar ? w * w / 12 : (a + b) / 2;
            return {
              q: R`${ctx} Find \(${askVar ? "V(X)" : "E(X)"}\).`,
              answer: ans, kind: "num",
              sol: R`<div class="sol-step">The density is \(\frac{1}{${w}}\) on \([${a}, ${b}]\).</div>
                   <div class="sol-step">${askVar
                     ? R`\(E(X^2) = \int_{${a}}^{${b}} \frac{x^2}{${w}}\,dx\) and \(E(X) = \frac{${a} + ${b < 0 ? `(${b})` : b}}{2}\). The shortcut simplifies to $$V(X) = \frac{(b - a)^2}{12} = \frac{${w}^2}{12} = ${U.fracTex(w * w, 12)} \approx ${f4(ans)}$$`
                     : R`$$E(X) = \int_{${a}}^{${b}} \frac{x}{${w}}\,dx = \frac{(${b})^2 - (${a})^2}{2\cdot${w}} = \frac{${a} + ${b < 0 ? `(${b})` : b}}{2} = ${U.fmt(ans)}$$`}</div>`,
            };
          },
        },
        {
          name: "Linear transform of a continuous r.v.",
          make() {
            const d = density();
            const a = U.pick([2, 3, 5, 10, -2]), b = U.pick([-3, 1, 4, 20, 100]);
            const askVar = Math.random() < 0.5;
            const ans = askVar ? a * a * qv(d.v) : a * qv(d.ex) + b;
            const Y = `${a}X ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
            return {
              q: R`\(X\) has density $$${d.fTex}$$ Let \(Y = ${Y}\). Find \(${askVar ? "V(Y)" : "E(Y)"}\).`,
              answer: ans, kind: "num",
              sol: R`<div class="sol-step">The Chapter 4 rules hold for continuous r.v.s too: ${askVar ? R`\(V(aX + b) = a^2V(X)\)` : R`\(E(aX + b) = aE(X) + b\)`}. So you only need ${askVar ? "\\(V(X)\\)" : "\\(E(X)\\)"} from the density.</div>
                   <div class="sol-step">${askVar
                     ? R`\(E(X) = ${qt(d.ex)}\), \(E(X^2) = ${qt(d.ex2)}\), so \(V(X) = ${qt(d.v)}\).`
                     : R`\(E(X) = \int_0^{${d.b}} x f(x)\,dx = ${qt(d.ex)}\).`}</div>
                   <div class="sol-step">$$${askVar ? `V(Y) = (${a})^2 \\cdot ${qt(d.v)}` : `E(Y) = ${a}\\cdot${qt(d.ex)} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`} \approx ${f4(ans)}$$</div>`,
            };
          },
        },
      ],
    }),
  ];

  const methodGuide = [
    {
      when: R`a density with an unknown constant \(k\) (or an unknown endpoint)`,
      use: R`Set \(\int f(x)\,dx = 1\) over the support and solve`,
      why: R`Total area 1 is the only equation available. Also confirm \(f \ge 0\). A density value above 1 is allowed; an area above 1 is not.`,
    },
    {
      when: R`"verify that \(f\) is a valid PDF"`,
      use: R`Check both: \(f(x) \ge 0\) everywhere, and \(\int_{-\infty}^{\infty} f = 1\)`,
      why: R`Integrate over exactly the support, which can run to \(\infty\) for an exponential. A printed density that integrates to something other than 1 is not a PDF.`,
    },
    {
      when: R`\(P(a \le X \le b)\), \(P(X > a)\) with a density given`,
      use: R`Integrate \(f\) over the event, or use \(F(b) - F(a)\) and \(1 - F(a)\)`,
      why: R`Probabilities are areas. Clip the interval to the support: any part past it adds nothing. \(\le\) vs \(&lt;\) never matters, because single points have probability 0.`,
    },
    {
      when: R`"find the CDF for all real \(x\)"`,
      use: R`\(F(x) = \int_{-\infty}^x f(y)\,dy\), written in three pieces`,
      why: R`\(0\) left of the support, the integral on it, \(1\) right of it. Use a dummy variable so \(x\) stays the upper limit. Check that \(F\) reaches exactly 1 at the right end.`,
    },
    {
      when: R`a CDF is given and a density value or the PDF is wanted`,
      use: R`Differentiate: \(f(x) = F'(x)\)`,
      why: R`The fundamental theorem of calculus. Going the other way (PDF to CDF) is integration.`,
    },
    {
      when: R`"median", "percentile", "the value below which 90% fall"`,
      use: R`Solve \(F(x) = p\)`,
      why: R`The median splits the area in half. For a skewed density it is not the mean.`,
    },
    {
      when: R`\(E(X)\), \(E(X^2)\), \(V(X)\) or \(\sigma_X\) of a continuous r.v.`,
      use: R`\(\int x f\), \(\int x^2 f\), then \(V = E(X^2) - [E(X)]^2\)`,
      why: R`The discrete formulas with \(\sum\) replaced by \(\int\). Spot symmetry first: a density symmetric about \(c\) has mean \(c\). Linear transforms follow Chapter 4: \(E(aX + b) = aE(X) + b\), \(V(aX + b) = a^2V(X)\).`,
    },
    {
      when: R`"uniformly distributed on \([a, b]\)", "at a random time between …"`,
      use: R`\(f = \frac{1}{b - a}\); mean \(\frac{a + b}{2}\); variance \(\frac{(b - a)^2}{12}\)`,
      why: R`Probability is proportional to length. The height \(\frac{1}{b - a}\) exceeds 1 whenever the interval is shorter than 1.`,
    },
  ];

  MATH340.registerUnit({
    id: "ch5",
    title: "Chapter 5 · Continuous Random Variables",
    short: "Ch 5 · Continuous",
    week: 5,
    order: 5,
    description: "Continuous random variables: probability density functions and their validity, probabilities as areas, the CDF and f = F′, percentiles, and the mean and variance of a continuous r.v.",
    flashcards,
    generators,
    methodGuide,
  });
})();
