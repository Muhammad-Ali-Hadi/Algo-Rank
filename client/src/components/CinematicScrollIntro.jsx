import { useRef, useEffect, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ═══ Syntax colors (matches CodeBackground.jsx) ═══ */
const C = {
  keyword: '#C678DD', type: '#E5C07B', func: '#61AFEF',
  string: '#98C379', number: '#D19A66', comment: '#5C6370',
  operator: '#56B6C2', plain: '#ABB2BF', bracket: '#C678DD',
};

/* ═══ DFS Code tokens ═══ */
const DFS_TOKENS = [
  { t: '// Depth First Search\n', c: C.comment },
  { t: '#include', c: C.keyword }, { t: ' <', c: C.operator },
  { t: 'vector', c: C.string }, { t: '>\n', c: C.operator },
  { t: '#include', c: C.keyword }, { t: ' <', c: C.operator },
  { t: 'iostream', c: C.string }, { t: '>\n\n', c: C.operator },
  { t: 'using', c: C.keyword }, { t: ' ', c: C.plain },
  { t: 'namespace', c: C.keyword }, { t: ' ', c: C.plain },
  { t: 'std', c: C.type }, { t: ';\n\n', c: C.plain },
  { t: 'void', c: C.type }, { t: ' ', c: C.plain },
  { t: 'dfs', c: C.func }, { t: '(', c: C.bracket },
  { t: 'int', c: C.type }, { t: ' v, ', c: C.plain },
  { t: 'vector', c: C.type }, { t: '<', c: C.operator },
  { t: 'vector', c: C.type }, { t: '<', c: C.operator },
  { t: 'int', c: C.type }, { t: '>>&', c: C.operator },
  { t: ' adj,\n', c: C.plain },
  { t: '         ', c: C.plain },
  { t: 'vector', c: C.type }, { t: '<', c: C.operator },
  { t: 'bool', c: C.type }, { t: '>&', c: C.operator },
  { t: ' visited', c: C.plain }, { t: ') {\n', c: C.bracket },
  { t: '    visited[v] = ', c: C.plain },
  { t: 'true', c: C.keyword }, { t: ';\n', c: C.plain },
  { t: '    ', c: C.plain },
  { t: 'cout', c: C.func }, { t: ' << v << ', c: C.operator },
  { t: '" "', c: C.string }, { t: ';\n\n', c: C.plain },
  { t: '    ', c: C.plain },
  { t: 'for', c: C.keyword }, { t: ' (', c: C.bracket },
  { t: 'int', c: C.type }, { t: ' u : adj[v]', c: C.plain },
  { t: ') {\n', c: C.bracket },
  { t: '        ', c: C.plain },
  { t: 'if', c: C.keyword }, { t: ' (!visited[u])\n', c: C.plain },
  { t: '            ', c: C.plain },
  { t: 'dfs', c: C.func }, { t: '(u, adj, visited);\n', c: C.plain },
  { t: '    }\n', c: C.bracket },
  { t: '}', c: C.bracket },
];

function buildTokenData(tokens) {
  let fullText = '';
  const ranges = [];
  for (const tk of tokens) {
    const start = fullText.length;
    fullText += tk.t;
    ranges.push({ start, end: fullText.length, color: tk.c });
  }
  return { fullText, ranges };
}

function CodeDisplay({ charCount }) {
  const { fullText, ranges } = useMemo(() => buildTokenData(DFS_TOKENS), []);
  const spans = useMemo(() => {
    const result = [];
    for (const r of ranges) {
      if (r.start >= charCount) break;
      const end = Math.min(r.end, charCount);
      if (end <= r.start) continue;
      result.push(
        <span key={r.start} style={{ color: r.color }}>{fullText.slice(r.start, end)}</span>
      );
    }
    return result;
  }, [charCount, fullText, ranges]);

  return (
    <pre className="whitespace-pre-wrap leading-relaxed font-mono text-[9px] sm:text-[11px] md:text-xs">
      {spans}
      {charCount > 0 && charCount < fullText.length && (
        <span className="inline-block w-[2px] h-[1em] align-middle ml-px"
          style={{ backgroundColor: '#528BFF', animation: 'cursorBlink 1s step-end infinite' }} />
      )}
    </pre>
  );
}

/* ═══════════════════════════════════════════
   Realistic Keyboard Component
   ═══════════════════════════════════════════ */
function RealisticKeyboard() {
  /* Key definitions: each row has keys with relative widths */
  const rows = [
    /* Function row */
    [
      { w: 1, label: 'esc' },
      ...Array(12).fill(null).map((_, i) => ({ w: 1, label: `F${i + 1}` })),
      { w: 1, label: '⏻' },
    ],
    /* Number row */
    [
      { w: 1, label: '`' }, { w: 1, label: '1' }, { w: 1, label: '2' },
      { w: 1, label: '3' }, { w: 1, label: '4' }, { w: 1, label: '5' },
      { w: 1, label: '6' }, { w: 1, label: '7' }, { w: 1, label: '8' },
      { w: 1, label: '9' }, { w: 1, label: '0' }, { w: 1, label: '-' },
      { w: 1, label: '=' }, { w: 1.6, label: '⌫' },
    ],
    /* QWERTY row */
    [
      { w: 1.5, label: '⇥' }, { w: 1, label: 'Q' }, { w: 1, label: 'W' },
      { w: 1, label: 'E' }, { w: 1, label: 'R' }, { w: 1, label: 'T' },
      { w: 1, label: 'Y' }, { w: 1, label: 'U' }, { w: 1, label: 'I' },
      { w: 1, label: 'O' }, { w: 1, label: 'P' }, { w: 1, label: '[' },
      { w: 1, label: ']' }, { w: 1.1, label: '\\' },
    ],
    /* Home row */
    [
      { w: 1.75, label: '⇪' }, { w: 1, label: 'A' }, { w: 1, label: 'S' },
      { w: 1, label: 'D' }, { w: 1, label: 'F' }, { w: 1, label: 'G' },
      { w: 1, label: 'H' }, { w: 1, label: 'J' }, { w: 1, label: 'K' },
      { w: 1, label: 'L' }, { w: 1, label: ';' }, { w: 1, label: '\'' },
      { w: 1.85, label: '⏎' },
    ],
    /* Bottom alpha row */
    [
      { w: 2.25, label: '⇧' }, { w: 1, label: 'Z' }, { w: 1, label: 'X' },
      { w: 1, label: 'C' }, { w: 1, label: 'V' }, { w: 1, label: 'B' },
      { w: 1, label: 'N' }, { w: 1, label: 'M' }, { w: 1, label: ',' },
      { w: 1, label: '.' }, { w: 1, label: '/' }, { w: 2.35, label: '⇧' },
    ],
    /* Space row */
    [
      { w: 1.25, label: 'fn' }, { w: 1.25, label: '⌃' }, { w: 1.25, label: '⌥' },
      { w: 1.5, label: '⌘' }, { w: 5, label: '' },
      { w: 1.5, label: '⌘' }, { w: 1.25, label: '⌥' },
      { w: 1, label: '◀' }, { w: 1, label: '▲' }, { w: 1, label: '▶' },
    ],
  ];

  return (
    <div style={{
      width: '94%', height: '100%', padding: '1.5%',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '2%',
    }}>
      {rows.map((row, ri) => (
        <div key={ri} className="flex" style={{ gap: '2%', height: ri === 0 ? '12%' : '17%' }}>
          {row.map((key, ki) => (
            <div key={ki} style={{
              flex: `${key.w} 1 0%`,
              height: '100%',
              borderRadius: ri === 0 ? '2px' : '3px',
              background: `linear-gradient(180deg, 
                rgba(90,90,90,1) 0%, rgba(70,70,70,1) 40%, rgba(60,60,60,1) 100%)`,
              boxShadow: `
                0 1px 0 rgba(30,30,30,0.8),
                0 1.5px 2px rgba(0,0,0,0.35),
                inset 0 0.5px 0 rgba(120,120,120,0.35),
                inset 0 -0.5px 0 rgba(30,30,30,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: ri === 0 ? 'clamp(3px, 0.4vw, 6px)' : 'clamp(5px, 0.6vw, 8px)',
              color: 'rgba(180,180,180,0.6)',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              userSelect: 'none',
            }}>
              {key.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function CinematicScrollIntro({ userName, children }) {
  const wrapperRef = useRef(null);
  const pinnedRef = useRef(null);
  const laptopGroupRef = useRef(null);
  const lidRef = useRef(null);
  const screenRef = useRef(null);
  const glowRef = useRef(null);
  const welcomeRef = useRef(null);
  const descRef = useRef(null);
  const dashboardRef = useRef(null);
  const scrollHintRef = useRef(null);

  const [charCount, setCharCount] = useState(0);
  const { fullText } = useMemo(() => buildTokenData(DFS_TOKENS), []);
  const totalChars = fullText.length;

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* ── Set ALL initial states explicitly before timeline ── */
      // gsap.set for lidRef removed, handled by inline style directly
      gsap.set(screenRef.current, { opacity: 0 });
      gsap.set(glowRef.current, { opacity: 0 });
      gsap.set(welcomeRef.current, { opacity: 0, y: 60 });
      gsap.set(descRef.current, { opacity: 0, y: 40 });
      gsap.set(dashboardRef.current, { opacity: 0, y: 40 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: 'top top',
          end: 'bottom bottom',
          pin: pinnedRef.current,
          scrub: 2,
          onUpdate: (self) => {
            const p = self.progress;
            if (p >= 0.32 && p <= 0.58) {
              setCharCount(Math.floor(((p - 0.32) / 0.26) * totalChars));
            } else if (p < 0.32) {
              setCharCount(0);
            } else {
              setCharCount(totalChars);
            }
          }
        }
      });

      /* ── Scroll hint fades ── */
      tl.to(scrollHintRef.current, { opacity: 0, duration: 0.04 }, 0);

      /* ── PHASE 1: Lid opens (0% → 28%) ──
         Lid starts at -179° (closed over keyboard via inline style)
         Animates to 0° (upright, facing user) */
      tl.to(lidRef.current,
        { rotateX: 0, duration: 0.28, ease: 'power3.inOut' },
        0
      );

      /* ── PHASE 2: Screen powers on (20% → 30%) ── */
      tl.to(screenRef.current, {
        opacity: 1, duration: 0.10, ease: 'power1.in'
      }, 0.20);

      /* ── Glow appears ── */
      tl.to(glowRef.current, { opacity: 1, duration: 0.08 }, 0.25);

      /* ── PHASE 3: Code types via onUpdate (32% → 58%) ── */

      /* ── PHASE 4: Laptop shifts up + scales (58% → 68%) ── */
      tl.to(laptopGroupRef.current, {
        y: -80, scale: 0.7, duration: 0.10, ease: 'power2.inOut'
      }, 0.58);
      tl.to(glowRef.current, { opacity: 0, duration: 0.06 }, 0.60);

      /* ── PHASE 5: Welcome text (65% → 74%) ── */
      tl.to(welcomeRef.current, {
        opacity: 1, y: 0, duration: 0.09, ease: 'power2.out'
      }, 0.65);

      /* ── PHASE 6: Description (74% → 82%) ── */
      tl.to(descRef.current, {
        opacity: 1, y: 0, duration: 0.08, ease: 'power2.out'
      }, 0.74);

      /* ── PHASE 7: Fade out animation, show dashboard (84% → 96%) ── */
      tl.to([laptopGroupRef.current, welcomeRef.current, descRef.current], {
        opacity: 0, duration: 0.07, ease: 'power1.in'
      }, 0.84);
      tl.to(dashboardRef.current, {
        opacity: 1, y: 0, duration: 0.12, ease: 'power2.out'
      }, 0.88);
    });

    return () => ctx.revert();
  }, [totalChars]);

  return (
    <>
      <style>{`
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scrollBounce { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY(8px);opacity:0.3} }
      `}</style>

      <div ref={wrapperRef}
        style={{ height: '600vh', '--lw': 'clamp(240px, 35vw, 500px)', '--lh': 'calc(var(--lw) * 0.625)' }}
        className="relative">
        <div ref={pinnedRef}
          className="w-full h-screen overflow-hidden flex items-center justify-center"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(88,166,255,0.025) 0%, #000 65%)' }}>

          {/* ═══ 3D SCENE ═══ */}
          <div style={{
            perspective: '1400px',
            perspectiveOrigin: '50% 48%',   /* slightly above center = seated view */
          }}>
            <div ref={laptopGroupRef} style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(8deg)',   /* subtle seated angle */
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>

              {/* ─── LID ─── */}
              <div ref={lidRef} style={{
                width: 'var(--lw)',
                height: 'var(--lh)',
                transformStyle: 'preserve-3d',
                transformOrigin: 'center bottom',
                transform: 'rotateX(-179deg)', // Hardcoded closed state
              }}>
                {/* FRONT FACE — Screen (visible when lid rotates open) */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '8px 8px 0 0',
                  background: `linear-gradient(175deg,
                    #d9d9d9 0%, #c9c9c9 20%, #b5b5b5 45%,
                    #c0c0c0 60%, #a8a8a8 80%, #9a9a9a 100%)`,
                  boxShadow: `
                    inset 0 1px 0 rgba(255,255,255,0.55),
                    inset 0 -0.5px 0 rgba(0,0,0,0.08),
                    0 -2px 20px rgba(0,0,0,0.15)`,
                  padding: 'clamp(5px, 0.8vw, 12px)',
                  backfaceVisibility: 'hidden',
                }}>
                  {/* Black bezel + screen */}
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '4px',
                    background: '#080808', position: 'relative', overflow: 'hidden',
                    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)',
                  }}>
                    {/* Camera dot */}
                    <div style={{
                      position: 'absolute', top: '3px', left: '50%',
                      transform: 'translateX(-50%)',
                      width: '3px', height: '3px', borderRadius: '50%',
                      background: 'radial-gradient(circle, #222, #0a0a0a)',
                      zIndex: 3,
                    }} />

                    {/* Screen content */}
                    <div ref={screenRef}
                      className="absolute inset-0 top-[10px] flex flex-col"
                      style={{ opacity: 0 }}>
                      {/* Editor title bar */}
                      <div className="flex items-center gap-1 px-2.5 py-1"
                        style={{ background: '#1a1a1a', borderBottom: '1px solid #252525' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
                        <span className="ml-2" style={{ color: C.comment, fontSize: 'clamp(6px,0.55vw,9px)' }}>
                          depth_first_search.cpp — AlgoRank
                        </span>
                      </div>
                      {/* Editor body */}
                      <div className="flex flex-1 overflow-hidden" style={{ background: '#1e1e1e' }}>
                        <div className="flex flex-col items-end py-1.5 px-1 select-none"
                          style={{ borderRight: '1px solid #252525', minWidth: '20px' }}>
                          {Array.from({ length: 18 }, (_, i) => (
                            <span key={i} style={{ color: '#444', fontSize: 'clamp(5px,0.45vw,8px)', lineHeight: 1.7 }}>
                              {i + 1}
                            </span>
                          ))}
                        </div>
                        <div className="flex-1 p-1.5 overflow-hidden">
                          <CodeDisplay charCount={charCount} />
                        </div>
                      </div>
                    </div>

                    {/* Subtle screen reflection */}
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(130deg, rgba(255,255,255,0.015) 0%, transparent 45%)' }} />
                  </div>
                </div>

                {/* BACK FACE — Silver lid exterior (visible when closed) */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '8px 8px 0 0',
                  background: `linear-gradient(175deg,
                    #dcdcdc 0%, #ccc 25%, #b8b8b8 50%, #aaa 75%, #9e9e9e 100%)`,
                  boxShadow: `
                    inset 0 1px 0 rgba(255,255,255,0.5),
                    0 2px 10px rgba(0,0,0,0.2)`,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateX(180deg)',
                }}>
                  {/* Algo-Rank Favicon Logo */}
                  <div style={{
                    position: 'absolute', top: '48%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'clamp(28px, 4.5vw, 55px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <img src="/algo-rank.svg" alt="Algo-Rank Logo" style={{ width: '100%', height: 'auto', opacity: 0.9, filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }} />
                  </div>
                </div>
              </div>

              {/* ─── HINGE ─── */}
              <div style={{
                width: 'var(--lw)',
                height: '4px',
                background: 'linear-gradient(90deg, #888, #a5a5a5, #999, #a5a5a5, #888)',
                borderRadius: '0 0 1px 1px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                flexShrink: 0,
              }} />

              {/* ─── BASE (Keyboard body) ─── */}
              <div style={{
                width: 'var(--lw)',
                height: 'var(--lh)',
                background: `linear-gradient(178deg,
                  #cbcbcb 0%, #c0c0c0 15%, #b3b3b3 40%,
                  #bababa 55%, #ababab 75%, #9e9e9e 100%)`,
                borderRadius: '0 0 8px 8px',
                boxShadow: `
                  0 6px 30px rgba(0,0,0,0.45),
                  0 2px 6px rgba(0,0,0,0.2),
                  inset 0 0.5px 0 rgba(255,255,255,0.35)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: '3%', paddingBottom: '2%',
                position: 'relative', flexShrink: 0,
              }}>
                <div style={{ width: '100%', height: '54%', display: 'flex', justifyContent: 'center' }}>
                  <RealisticKeyboard />
                </div>

                {/* Trackpad */}
                <div style={{
                  width: '32%', height: '32%',
                  background: `linear-gradient(180deg,
                    rgba(175,175,175,1) 0%, rgba(160,160,160,1) 100%)`,
                  borderRadius: '4px',
                  marginTop: '4%',
                  boxShadow: `
                    inset 0 0.5px 1px rgba(0,0,0,0.1),
                    0 0.5px 0 rgba(255,255,255,0.15)`,
                  border: '0.5px solid rgba(0,0,0,0.06)',
                }} />

                {/* Front lip indentation */}
                <div style={{
                  position: 'absolute', bottom: '0', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '12%', height: '2px',
                  background: 'linear-gradient(180deg, rgba(120,120,120,0.4), rgba(100,100,100,0.3))',
                  borderRadius: '0 0 4px 4px',
                }} />
              </div>

              {/* ─── Ground shadow ─── */}
              <div ref={glowRef} style={{
                width: 'clamp(240px, 38vw, 500px)', height: '24px',
                background: 'radial-gradient(ellipse, rgba(88,166,255,0.10), transparent 70%)',
                filter: 'blur(12px)', opacity: 0, marginTop: '10px', flexShrink: 0,
              }} />
            </div>
          </div>

          {/* ═══ WELCOME TEXT ═══ */}
          <div ref={welcomeRef}
            className="absolute text-center w-full px-4"
            style={{ bottom: 'clamp(70px, 12vh, 160px)', opacity: 0 }}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              <span style={{
                backgroundImage: 'linear-gradient(135deg, #58A6FF 0%, #79C0FF 40%, #1F6FEB 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>
                Welcome back, {userName}
              </span>
            </h1>
          </div>

          {/* ═══ DESCRIPTION ═══ */}
          <div ref={descRef}
            className="absolute text-center w-full px-4"
            style={{ bottom: 'clamp(24px, 5vh, 90px)', opacity: 0 }}>
            <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto"
              style={{ color: '#6B7280', fontFamily: "'Inter', system-ui, sans-serif" }}>
              Compete in coding contests, sharpen your algorithms, and climb the Algo-Rank leaderboard.
            </p>
          </div>

          {/* ═══ DASHBOARD CONTENT ═══ */}
          <div ref={dashboardRef}
            className="absolute inset-0 overflow-auto"
            style={{ opacity: 0, zIndex: 50 }}>
            {children}
          </div>

          {/* ═══ SCROLL HINT ═══ */}
          <div ref={scrollHintRef}
            className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ zIndex: 5, opacity: 1 }}>
            <span className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: '#484F58' }}>
              Scroll to explore
            </span>
            <div className="w-5 h-8 rounded-full flex items-start justify-center p-1"
              style={{ border: '1.5px solid #333' }}>
              <div className="w-1 h-2 rounded-full"
                style={{ background: '#484F58', animation: 'scrollBounce 2s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
// </div >

// {/* ═══ DASHBOARD CONTENT ═══ */ }
// < div ref={dashboardRef}
//   className="absolute inset-0 overflow-auto"
//   style={{ opacity: 0, zIndex: 50 }}>
//   {children}
// </div >

// {/* ═══ SCROLL HINT ═══ */ }
// < div ref={scrollHintRef}
//   className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center"
//   style={{ zIndex: 5, opacity: 1 }}>
//   <span className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: '#484F58' }}>
//     Scroll to explore
//   </span>
//   <div className="w-5 h-8 rounded-full flex items-start justify-center p-1"
//     style={{ border: '1.5px solid #333' }}>
//     <div className="w-1 h-2 rounded-full"
//       style={{ background: '#484F58', animation: 'scrollBounce 2s ease-in-out infinite' }} />
//   </div>
// </div >
// </div >
//         </div >
//       </div >
//     </>
//   );
// }
