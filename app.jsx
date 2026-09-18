/* =========================================================
   App — Router · Theme · Language · Progress · Nav
   ========================================================= */

const THEME_KEY = "ts_book_theme";
const PROGRESS_KEY = "ts_book_progress";

function useHashRoute() {
  const [hash, setHash] = React.useState(window.location.hash || "#/");
  React.useEffect(() => {
    const onHash = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [hash, (h) => { window.location.hash = h; window.scrollTo({ top: 0 }); }];
}

// Progress persisted to localStorage (no login needed).
function useProgress() {
  const [progress, setProgress] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { return {}; }
  });
  const persist = (next) => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch (e) {} };
  const toggle = (id) => setProgress((p) => {
    const next = { ...p };
    if (next[id]) delete next[id]; else next[id] = true;
    persist(next);
    return next;
  });
  return [progress, toggle];
}

function useTheme() {
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "light"; } catch (e) { return "light"; }
  });
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "light" ? "dark" : "light"))];
}

// Dropdown holding the module codes (keeps the top nav compact).
const ModulesMenu = ({ nav, route, lang }) => {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const go = (id) => { setOpen(false); nav(`#/m/${id}`); };
  return (
    <div className="modules-menu" ref={ref}>
      <a className={`modules-trigger ${route === "module" ? "active" : ""}`} onClick={() => setOpen((o) => !o)}>
        {t("nav_modules")} <span className={`caret ${open ? "up" : ""}`}>▾</span>
      </a>
      {open && (
        <div className="modules-dropdown">
          {MODULES.map((m) => {
            const active = route === "module" && window.location.hash.includes("/" + m.id);
            return (
              <a key={m.id} className={`md-item ${active ? "active" : ""}`} onClick={() => go(m.id)}>
                <span className="md-code mono">{m.code}</span>
                <span className="md-name">{pick(lang, m)}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Nav = ({ progress, theme, toggleTheme, lang, toggleLang, nav, route }) => {
  const t = useT();
  const done = Object.values(progress).filter(Boolean).length;
  return (
    <header className="nav">
      <div className="nav-brand" onClick={() => nav("#/")}>
        <span className="mark">⌇</span>
        <span>signals &amp; forecasts.</span>
      </div>
      <nav className="nav-links">
        <a className={route === "home" ? "active" : ""} onClick={() => nav("#/")}>{t("nav_home")}</a>
        <ModulesMenu nav={nav} route={route} lang={lang} />
        <a className={route === "about" ? "active" : ""} onClick={() => nav("#/about")}>{t("nav_about")}</a>
      </nav>
      <div className="nav-right">
        <div className="progress-chip" title={t("your_progress")}>
          <span className="dot">{done}</span>
          <span>/ {CHAPTERS.length}</span>
        </div>
        <button className="lang-btn" onClick={toggleLang} title={t("lang_title")}>
          {lang === "zh" ? "EN" : "中"}
        </button>
        <button className="icon-btn" onClick={toggleTheme} title={t("theme_title")}>
          {theme === "light" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
          )}
        </button>
      </div>
    </header>
  );
};

const App = () => {
  const [hash, nav] = useHashRoute();
  const [lang, setLang, toggleLang] = useLangState();
  const [progress, toggleProgress] = useProgress();
  const [theme, toggleTheme] = useTheme();

  let route = "home";
  let courseId = null, moduleId = null;
  if (hash.startsWith("#/c/")) { route = "course"; courseId = hash.slice(4); }
  else if (hash.startsWith("#/m/")) { route = "module"; moduleId = hash.slice(4); }
  else if (hash === "#/about") { route = "about"; }

  const screenLabel = (() => {
    if (route === "home") return "01 Home · Roadmap";
    if (route === "module") { const m = MODULES.find((x) => x.id === moduleId); return m ? `02 Module · ${m.code} ${m.en}` : "02 Module"; }
    if (route === "course") { const c = CHAPTERS.find((x) => x.id === courseId); return c ? `03 Chapter · ${c.code} ${c.title.en}` : "03 Chapter"; }
    return "04 About";
  })();

  return (
    <LangContext.Provider value={lang}>
      <div data-screen-label={screenLabel}>
        <Nav progress={progress} theme={theme} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} nav={nav} route={route} />
        <div className="running-label">{screenLabel} · signals &amp; forecasts · 2026</div>

        {route === "home" && <HomePage progress={progress} nav={nav} />}
        {route === "module" && <ModulePage moduleId={moduleId} progress={progress} nav={nav} />}
        {route === "course" && <ChapterPage courseId={courseId} progress={progress} toggleProgress={toggleProgress} nav={nav} />}
        {route === "about" && <AboutPage nav={nav} />}
      </div>
    </LangContext.Provider>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
