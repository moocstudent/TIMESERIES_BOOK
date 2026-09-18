/* =========================================================
   Pages — Home / Module / Chapter / About  (bilingual)
   ========================================================= */

// --- Markdown -------------------------------------------------
function renderMarkdown(md) {
  if (!md) return "";
  if (typeof marked === "undefined") return md.replace(/\n/g, "<br>");
  try { return marked.parse(md); } catch (e) { return md; }
}
const ProseBlock = ({ md }) => {
  const html = React.useMemo(() => renderMarkdown(md), [md]);
  if (!md || !md.trim()) return null;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};
// A lecture figure is written in the markdown as a line of its own:
//     @fig pm1-triangle
// Split the source on those markers so the SVG (defined in figures*.jsx and
// looked up through <Figure>) is rendered as a real React node between the
// surrounding paragraphs instead of being swallowed by marked.
const FIG_MARK = /^@fig[ \t]+([A-Za-z0-9_-]+)[ \t]*$/gm;
function splitFigures(md) {
  if (!md) return [];
  const out = [];
  let last = 0, m;
  FIG_MARK.lastIndex = 0;
  while ((m = FIG_MARK.exec(md)) !== null) {
    out.push({ kind: "md", text: md.slice(last, m.index) });
    out.push({ kind: "fig", name: m[1] });
    last = m.index + m[0].length;
  }
  out.push({ kind: "md", text: md.slice(last) });
  return out;
}

const Prose = ({ md, className }) => {
  const parts = React.useMemo(() => splitFigures(md), [md]);
  let figNo = 0;
  return (
    <div className={className || "course-prose"}>
      {parts.map((p, i) => {
        if (p.kind !== "fig") return <ProseBlock key={i} md={p.text} />;
        if (typeof Figure === "undefined") return null;
        figNo += 1;
        return <Figure key={i} name={p.name} idx={figNo} />;
      })}
    </div>
  );
};

// Fetch content/<id>.<lang>.md; fall back to the other language, then to a flag.
function useChapterContent(id, lang) {
  const [state, setState] = React.useState({ text: "", loading: true, missing: false });
  React.useEffect(() => {
    if (!id) { setState({ text: "", loading: false, missing: true }); return; }
    let alive = true;
    setState({ text: "", loading: true, missing: false });
    const tryFetch = (l) => fetch(`content/${id}.${l}.md`, { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); });
    tryFetch(lang)
      .then((txt) => { if (alive) setState({ text: txt, loading: false, missing: false }); })
      .catch(() => tryFetch(lang === "zh" ? "en" : "zh")
        .then((txt) => { if (alive) setState({ text: txt, loading: false, missing: false }); })
        .catch(() => { if (alive) setState({ text: "", loading: false, missing: true }); }));
    return () => { alive = false; };
  }, [id, lang]);
  return state;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
const roman_lc = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi"];

// ============== Ticker ==============
const Ticker = () => {
  const lang = useLang();
  const items = [...CHAPTERS, ...CHAPTERS];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((c, i) => (
          <span key={i} className="ticker-item">
            <span className="pip" />
            <span className="code">{c.code}</span>
            <span className="nm">{pick(lang, c.title)}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ opacity: 0.6 }}>{c.hours}h</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// ============== Roadmap (module rows of chapter chips) ==============
const Roadmap = ({ progress, nav }) => {
  const lang = useLang();
  return (
    <div className="hw-roadmap">
      {MODULES.map((m, mi) => {
        const cs = CHAPTERS.filter((c) => c.moduleId === m.id);
        const isAccent = m.accent === "accent";
        return (
          <div key={m.id} className="rm-row">
            <div className="rm-mod" onClick={() => nav(`#/m/${m.id}`)}>
              <span className="rm-no">{ROMAN[mi]}</span>
              <span className="rm-code">{m.code}</span>
              <span className="rm-name">{pick(lang, m)}</span>
            </div>
            <div className="rm-chips">
              {cs.map((c, ci) => (
                <React.Fragment key={c.id}>
                  {ci > 0 && <span className="rm-arrow">→</span>}
                  <button className={`rm-chip ${progress[c.id] ? "done" : ""} ${isAccent ? "acc" : ""}`}
                    title={pick(lang, c.title)} onClick={() => nav(`#/c/${c.id}`)}>
                    {c.code}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============== HOME ==============
const HomePage = ({ progress, nav }) => {
  const t = useT();
  const lang = useLang();
  const doneCount = Object.values(progress).filter(Boolean).length;
  const total = CHAPTERS.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const doneHours = CHAPTERS.filter((c) => progress[c.id]).reduce((s, c) => s + c.hours, 0);
  const subst = { M: MODULES.length, C: CHAPTERS.length };
  const firstId = CHAPTERS[0] ? CHAPTERS[0].id : "pr1";

  return (
    <div className="page">
      <section className="hero container">
        <div className="hero-eyebrow">
          <span className="swatch" />
          <span>{t("hero_badge")}</span>
          <span style={{ marginLeft: "auto", opacity: 0.7 }}>{doneCount ? `${doneCount}/${total} ✓` : "v1.0 · 2026"}</span>
        </div>
        <h1 className="hero-title">
          <span className="cn">{t("hero_l1")}</span><br />
          <span className="cn">{t("hero_l2a")}</span> <span className="accent">{t("hero_l2b")}</span>
        </h1>
        <p className="hero-sub dropcap">{fmt(t("hero_sub"), subst)}</p>
        <div className="cta-row">
          <button className="btn btn-accent" onClick={() => nav(`#/c/${firstId}`)}>{t("cta_start")}</button>
          <button className="btn" onClick={() => nav("#/about")}>{t("cta_howto")}</button>
          <button className="btn" onClick={() => { const el = document.getElementById("roadmap"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{t("cta_roadmap")}</button>
        </div>

        <div className="hero-meta">
          <div className="cell"><div className="v">{String(MODULES.length).padStart(2, "0")}</div><div className="l">{t("meta_modules")}</div></div>
          <div className="cell"><div className="v">{CHAPTERS.length}</div><div className="l">{t("meta_chapters")}</div></div>
          <div className="cell"><div className="v">{DEMO_COUNT}</div><div className="l">{t("meta_demos")}</div></div>
          <div className="cell"><div className="v">~{TOTAL_HOURS}</div><div className="l">{t("meta_hours")}</div></div>
        </div>

        <div className="bigbar" style={{ marginTop: 64 }}>
          <div className="left">
            <div className="lbl">{t("your_progress")}</div>
            <div className="pct"><span className="accent">{pct}</span><span style={{ fontSize: 36, color: "var(--muted)" }}>%</span></div>
          </div>
          <div className="right">
            <div><strong>{doneCount}</strong> / {total} {t("meta_chapters")}</div>
            <div><strong>{doneHours}</strong> / {TOTAL_HOURS} {t("meta_hours")}</div>
            <div style={{ marginTop: 6 }}>{t("synced")}</div>
          </div>
        </div>
        <div className="linebar"><div className="fill" style={{ width: `${pct}%` }} /></div>
      </section>

      <Ticker />

      {/* ROADMAP */}
      <section id="roadmap" className="section">
        <div className="container">
          <div className="sect-head">
            <div className="num">§ 01 / ROADMAP</div>
            <div className="title"><span className="cn">{t("sec01")}</span></div>
            <div className="aside">{t("sec01_aside")}</div>
          </div>
          <div className="roadmap-key">
            <div className="item"><span className="sw" /> {t("rm_notstarted")}</div>
            <div className="item"><span className="sw done" /> {t("rm_done")}</div>
          </div>
          <Roadmap progress={progress} nav={nav} />
        </div>
      </section>

      {/* MODULES */}
      <section className="section">
        <div className="container">
          <div className="sect-head">
            <div className="num">§ 02 / MODULES</div>
            <div className="title"><span className="cn">{t("sec02")}</span></div>
            <div className="aside">{t("sec02_aside")}</div>
          </div>
          <div className="module-grid">
            {MODULES.map((m, mi) => {
              const cs = CHAPTERS.filter((c) => c.moduleId === m.id);
              const done = cs.filter((c) => progress[c.id]).length;
              const isAccent = m.accent === "accent";
              return (
                <div key={m.id} className={`mod-card ${isAccent ? "has-accent" : ""}`} onClick={() => nav(`#/m/${m.id}`)}>
                  <div className="topline">
                    <span className="module-no">{m.code}</span>
                    <span>{cs.reduce((s, c) => s + c.hours, 0)} {t("hours_unit")}</span>
                  </div>
                  <div className="mod-zh">{pick(lang, m)}</div>
                  <div className="mod-en">{other(lang, m)}.</div>
                  <div className="mod-desc">「{pick(lang, m.tagline)}」 {pick(lang, m.description)}</div>
                  <div className="mod-foot">
                    <span>{cs.length} {t("modules_count")}</span>
                    <span><strong>{done}</strong> / {cs.length} {t("done_word")}</span>
                    <span style={{ marginLeft: "auto" }}>{t("enter_word")}</span>
                  </div>
                  <div className="corner">{roman_lc[mi]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* METHOD */}
      <section className="section">
        <div className="container">
          <div className="sect-head">
            <div className="num">§ 03 / METHOD</div>
            <div className="title"><span className="cn">{t("sec03")}</span></div>
            <div className="aside">{t("sec03_aside")}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, border: "1px solid var(--ink)" }}>
            {[
              { no: "01", zh: t("phil1_zh"), b: t("phil1_b") },
              { no: "02", zh: t("phil2_zh"), b: t("phil2_b") },
              { no: "03", zh: t("phil3_zh"), b: t("phil3_b") },
            ].map((p, i) => (
              <div key={i} style={{ padding: "32px 28px", borderRight: i < 2 ? "1px solid var(--ink)" : "none", background: i === 1 ? "var(--surface)" : "transparent" }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.16em" }}>{p.no}</div>
                <div style={{ fontFamily: "Noto Serif SC, serif", fontSize: 26, fontWeight: 500, marginTop: 24 }}>{p.zh}</div>
                <p style={{ marginTop: 16, color: "var(--ink-soft)", fontSize: 15 }}>{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>{t("footer_tag")}</span>
        <span>{`{ ${doneCount}/${total} } · ${t("footer_sync")}`}</span>
        <span>MIT · v1.0</span>
      </footer>
    </div>
  );
};

// ============== MODULE PAGE ==============
const ModulePage = ({ moduleId, progress, nav }) => {
  const t = useT();
  const lang = useLang();
  const m = MODULES.find((x) => x.id === moduleId);
  if (!m) return <div className="container" style={{ padding: 80 }}>{t("not_found_m")}</div>;
  const cs = CHAPTERS.filter((c) => c.moduleId === moduleId);
  const done = cs.filter((c) => progress[c.id]).length;
  const isAccent = m.accent === "accent";
  const idx = MODULES.findIndex((x) => x.id === moduleId);
  const modHours = cs.reduce((s, c) => s + c.hours, 0);

  return (
    <div className="page">
      <div className="container">
        <div className="breadcrumb">
          <a onClick={() => nav("#/")}>{t("bc_home")}</a>
          <span className="sep">/</span>
          <a onClick={() => nav("#/")}>{t("bc_modules")}</a>
          <span className="sep">/</span>
          <span style={{ color: "var(--ink)" }}>{m.code}</span>
        </div>

        <section style={{ padding: "48px 0 32px", position: "relative" }}>
          <div className="watermark fill" style={{ top: 20, right: -20, fontSize: "clamp(180px, 28vw, 380px)", opacity: isAccent ? 0.18 : 0.12, color: isAccent ? "var(--accent)" : "var(--ink)" }}>
            {ROMAN[idx]}
          </div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--muted)", position: "relative" }}>
            {t("module_word")} {m.code} · {idx + 1} {t("of_word")} {MODULES.length}
          </div>
          <h1 style={{ position: "relative", zIndex: 1, fontFamily: "Noto Serif SC, serif", fontSize: "clamp(48px, 7vw, 96px)", fontWeight: 500, lineHeight: 0.95, margin: "16px 0 12px", letterSpacing: "-0.02em" }}>
            {pick(lang, m)}.
          </h1>
          <div style={{ position: "relative", zIndex: 1, fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 36, color: isAccent ? "var(--accent)" : "var(--muted)" }}>
            {other(lang, m)}.
          </div>
          <p style={{ marginTop: 24, fontSize: 18, color: "var(--ink-soft)", maxWidth: 720, lineHeight: 1.6 }}>
            <span style={{ fontFamily: "Noto Serif SC, serif", fontSize: 22, color: "var(--ink)" }}>「{pick(lang, m.tagline)}」</span>
            <br /><br />
            {pick(lang, m.description)}
          </p>

          <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid var(--ink)" }}>
            {[
              [t("m_meta_chapters"), `${cs.length}`],
              [t("m_meta_hours"), `${modHours}`],
              [t("m_meta_level"), t(`diff_${m.level}`)],
              [t("m_meta_progress"), `${done} / ${cs.length}`],
            ].map(([k, v], i) => (
              <div key={i} style={{ padding: "20px 18px", borderRight: i < 3 ? "1px solid var(--hairline)" : "none" }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--muted)" }}>{k}</div>
                <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 40, marginTop: 6 }}>{v}</div>
              </div>
            ))}
          </div>
        </section>

        {m.arch && typeof Figure !== "undefined" && (
          <section style={{ padding: "8px 0 8px" }}>
            <div className="sect-head" style={{ marginBottom: 8 }}>
              <div className="num">§ ARCHITECTURE</div>
              <div className="title"><span className="cn">{lang === "zh" ? "架构总览" : "Architecture"}</span></div>
              <div className="aside">{lang === "zh" ? "这个模块的组件在整体里的位置" : "where this module's pieces sit in the whole"}</div>
            </div>
            <Figure name={m.arch} />
          </section>
        )}

        <section style={{ padding: "32px 0 80px" }}>
          <div className="sect-head" style={{ marginBottom: 0 }}>
            <div className="num">§ CHAPTERS</div>
            <div className="title"><span className="cn">{t("chapter_list")}</span></div>
            <div className="aside">{t("click_enter")}</div>
          </div>
          <div className="course-list">
            {cs.map((c) => {
              const isDone = !!progress[c.id];
              return (
                <div key={c.id} className={`course-row ${isDone ? "done" : ""}`} onClick={() => nav(`#/c/${c.id}`)}>
                  <div className="num">{c.code}</div>
                  <div className="name">
                    <div className="zh">{pick(lang, c.title)}</div>
                    <div className="en">{other(lang, c.title)}</div>
                  </div>
                  <div className="meta"><strong>{c.hours}</strong> {t("hours_unit")}</div>
                  <div className="meta">{c.prereq.length === 0 ? t("no_prereq") : fmt(t("prereq_n"), { n: c.prereq.length })}</div>
                  <div className={`tag ${c.difficulty === 3 ? "acc" : ""}`}>{t(`diff_${c.difficulty}`)}</div>
                  <div className={`check-cell ${isDone ? "checked" : ""}`}>{isDone ? "✓" : ""}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

// ============== CHAPTER PAGE ==============
const ChapterPage = ({ courseId, progress, toggleProgress, nav }) => {
  const t = useT();
  const lang = useLang();
  const c = CHAPTERS.find((x) => x.id === courseId);
  const content = useChapterContent(c ? c.id : null, lang);
  if (!c) return <div className="container" style={{ padding: 80 }}>{t("not_found_c")}</div>;
  const m = MODULES.find((x) => x.id === c.moduleId);
  const allIdx = CHAPTERS.findIndex((x) => x.id === c.id);
  const prev = allIdx > 0 ? CHAPTERS[allIdx - 1] : null;
  const next = allIdx < CHAPTERS.length - 1 ? CHAPTERS[allIdx + 1] : null;
  const isDone = !!progress[c.id];

  return (
    <div className="page">
      <div className="container">
        <div className="breadcrumb">
          <a onClick={() => nav("#/")}>{t("bc_home")}</a>
          <span className="sep">/</span>
          <a onClick={() => nav(`#/m/${m.id}`)}>{m.code}</a>
          <span className="sep">/</span>
          <span style={{ color: "var(--ink)" }}>{c.code}</span>
        </div>

        <div className="course-layout">
          {/* MAIN */}
          <article className="course-main">
            <div className="course-head">
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--muted)" }}>
                {c.code} · {t("module_word")} {m.code}
              </div>
              <h1 className="course-title">{pick(lang, c.title)}</h1>
              <div className="course-title-en">{other(lang, c.title)}.</div>

              {c.props && c.props.length > 0 && (
                <div className="part-tags">
                  {c.props.map((p, i) => <span key={i} className="part-tag mono">{p}</span>)}
                </div>
              )}

              <div className="course-tagrow">
                <span><strong>{c.hours}</strong> {t("hours_unit")}</span>
                <span>{t(`diff_${c.difficulty}`)}</span>
                <span style={{ marginLeft: "auto" }}>{c.prereq.length === 0 ? t("no_prereq") : fmt(t("prereq_n"), { n: c.prereq.length })}</span>
              </div>
            </div>

            {/* 00 Intro */}
            <section className="cs-block">
              <h2><span className="idx">00</span> <span className="cn">{t("ch_sec_intro")}</span></h2>
              <p style={{ fontSize: 17 }}>{pick(lang, c.summary)}</p>
            </section>

            {/* 01 Objectives */}
            <section className="cs-block">
              <h2><span className="idx">01</span> <span className="cn">{t("ch_sec_obj")}</span></h2>
              <ul className="checklist">
                {c.objectives.map((o, i) => <li key={i}>{pick(lang, o)}</li>)}
              </ul>
            </section>

            {/* 02 Outline */}
            <section className="cs-block">
              <h2><span className="idx">02</span> <span className="cn">{t("ch_sec_outline")}</span></h2>
              <ol className="list-ordered">
                {c.outline.map((o, i) => <li key={i}>{pick(lang, o)}</li>)}
              </ol>
            </section>

            {/* ✦ The effect (interactive) */}
            {c.viz && (
              <section className="cs-block">
                <h2><span className="idx">✦</span> <span className="cn">{t("ch_sec_viz")}</span></h2>
                <p style={{ color: "var(--muted)", margin: "0 0 16px", fontSize: 14 }}>{t("viz_hint")}</p>
                <Viz name={c.viz} />
              </section>
            )}

            {/* 03 The explanation (core notes) */}
            <section className="cs-block">
              <h2>
                <span className="idx">03</span>
                <span className="h2-row"><span className="cn">{t("ch_sec_notes")}</span><span className="key-badge">{t("key_badge")}</span></span>
              </h2>
              {content.loading ? (
                <p style={{ color: "var(--muted)" }}>{t("loading_notes")}</p>
              ) : content.missing ? (
                <p style={{ color: "var(--muted)" }}>{t("notes_soon")}</p>
              ) : (
                <Prose md={content.text} />
              )}
            </section>

            {/* 04 Code in three languages */}
            {typeof CODE !== "undefined" && CODE[c.id] && (
              <section className="cs-block">
                <h2>
                  <span className="idx">04</span>
                  <span className="h2-row"><span className="cn">{t("ch_sec_code")}</span><span className="key-badge">{t("code_badge")}</span></span>
                </h2>
                <p style={{ color: "var(--muted)", margin: "0 0 16px", fontSize: 14 }}>{t("code_hint")}</p>
                <CodeLab id={c.id} />
              </section>
            )}

            {/* prev / next */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 80, paddingTop: 24, borderTop: "1px solid var(--ink)" }}>
              {prev
                ? <button className="btn" onClick={() => nav(`#/c/${prev.id}`)}>← {pick(lang, prev.title)}</button>
                : <span />}
              {next
                ? <button className="btn btn-primary" onClick={() => nav(`#/c/${next.id}`)}>{pick(lang, next.title)} →</button>
                : <button className="btn btn-primary" onClick={() => nav(`#/m/${m.id}`)}>{t("back_to")} {m.code} →</button>}
            </div>
          </article>

          {/* ASIDE */}
          <aside className="course-aside">
            <div className="row"><span className="k">CODE</span><span className="v mono">{c.code}</span></div>
            <div className="row"><span className="k">{t("module_word")}</span><span className="v">{m.code}</span></div>
            <div className="row"><span className="k">{t("est_word")}</span><span className="v">{c.hours} {t("hours_unit")}</span></div>
            <div className="row"><span className="k">{t("level_word")}</span><span className="v">{t(`diff_${c.difficulty}`)}</span></div>
            <div className="row"><span className="k">{t("props_word")}</span><span className="v" style={{ textAlign: "right" }}>{(c.props || []).length}</span></div>
            {typeof CODE !== "undefined" && CODE[c.id] && (
              <div className="row"><span className="k">{t("langs_word")}</span><span className="v mono" style={{ textAlign: "right" }}>{CODE[c.id].tabs.map((x) => x.lang).join(" · ")}</span></div>
            )}

            <button className={`toggle-done ${isDone ? "done" : ""}`} onClick={() => toggleProgress(c.id)}>
              <span>{isDone ? `✓ ${t("marked_done")}` : `□ ${t("mark_done_btn")}`}</span>
              <span style={{ opacity: 0.6 }}>◍ local</span>
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};

// ============== ABOUT ==============
const AboutPage = ({ nav }) => {
  const t = useT();
  const subst = { M: MODULES.length, C: CHAPTERS.length };
  const cards = [
    { h: t("about_h1"), body: fmt(t("about_p1"), subst), body2: t("about_p1b") },
    { h: t("about_h2"), body: t("about_p2") },
    { h: t("about_h3"), body: t("about_p3") },
    { h: t("about_h4"), body: t("about_p4") },
  ];
  return (
    <div className="page">
      <div className="container">
        <div className="breadcrumb">
          <a onClick={() => nav("#/")}>{t("bc_home")}</a>
          <span className="sep">/</span>
          <span style={{ color: "var(--ink)" }}>{t("about_kicker")}</span>
        </div>

        <section style={{ padding: "60px 0 0" }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--muted)" }}>{t("about_kicker")}</div>
          <h1 style={{ fontFamily: "Noto Serif SC, serif", fontSize: "clamp(40px, 7vw, 96px)", fontWeight: 500, lineHeight: 0.98, margin: "16px 0 0", letterSpacing: "-0.02em" }}>
            {t("about_q")}
          </h1>
          <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 32, color: "var(--muted)", marginTop: 12 }}>
            {t("about_sub")}
          </div>
        </section>

        <div className="about-grid">
          {cards.map((card, i) => (
            <div key={i}>
              <h3><span className="cn">{card.h}</span></h3>
              {String(card.body).split("\n").map((line, j) => <p key={j}>{line}</p>)}
              {card.body2 && <p>{card.body2}</p>}
            </div>
          ))}
        </div>

        <footer className="footer">
          <span>{t("footer_tag")}</span>
          <span>v1.0 · 2026</span>
          <span>MIT License</span>
        </footer>
      </div>
    </div>
  );
};

window.HomePage = HomePage;
window.ModulePage = ModulePage;
window.ChapterPage = ChapterPage;
window.AboutPage = AboutPage;
window.Prose = Prose;
