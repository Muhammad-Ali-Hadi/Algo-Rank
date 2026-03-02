import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

// Syntax color tokens for C++ code highlighting
const COLORS = {
  keyword: '#C678DD',   // purple - keywords
  type: '#E5C07B',      // yellow - types
  func: '#61AFEF',      // blue - functions
  string: '#98C379',    // green - strings/includes
  number: '#D19A66',    // orange - numbers
  comment: '#5C6370',   // gray - comments
  operator: '#56B6C2',  // cyan - operators
  plain: '#ABB2BF',     // light gray - default text
  bracket: '#C678DD',   // purple - brackets
};

// Each fragment is an array of {text, color} tokens for syntax highlighting
const CODE_FRAGMENTS = [
  [
    { text: '#include', color: COLORS.keyword }, { text: ' <', color: COLORS.operator },
    { text: 'bits/stdc++.h', color: COLORS.string }, { text: '>\n', color: COLORS.operator },
    { text: 'using', color: COLORS.keyword }, { text: ' ', color: COLORS.plain },
    { text: 'namespace', color: COLORS.keyword }, { text: ' ', color: COLORS.plain },
    { text: 'std', color: COLORS.type }, { text: ';\n\n', color: COLORS.plain },
    { text: 'int', color: COLORS.type }, { text: ' ', color: COLORS.plain },
    { text: 'main', color: COLORS.func }, { text: '(){\n', color: COLORS.bracket },
    { text: '    ', color: COLORS.plain },
    { text: 'vector', color: COLORS.type }, { text: '<', color: COLORS.operator },
    { text: 'int', color: COLORS.type }, { text: '>', color: COLORS.operator },
    { text: ' v;\n', color: COLORS.plain },
    { text: '    ', color: COLORS.plain },
    { text: 'sort', color: COLORS.func }, { text: '(v.', color: COLORS.plain },
    { text: 'begin', color: COLORS.func }, { text: '(), v.', color: COLORS.plain },
    { text: 'end', color: COLORS.func }, { text: '());\n', color: COLORS.plain },
    { text: '    ', color: COLORS.plain },
    { text: 'return', color: COLORS.keyword }, { text: ' ', color: COLORS.plain },
    { text: '0', color: COLORS.number }, { text: ';\n', color: COLORS.plain },
    { text: '}', color: COLORS.bracket },
  ],
  [
    { text: '// Binary Search', color: COLORS.comment }, { text: '\n', color: COLORS.plain },
    { text: 'int', color: COLORS.type }, { text: ' ', color: COLORS.plain },
    { text: 'binarySearch', color: COLORS.func }, { text: '(', color: COLORS.bracket },
    { text: 'vector', color: COLORS.type }, { text: '<', color: COLORS.operator },
    { text: 'int', color: COLORS.type }, { text: '>&', color: COLORS.operator },
    { text: ' a, ', color: COLORS.plain },
    { text: 'int', color: COLORS.type }, { text: ' x){\n', color: COLORS.bracket },
    { text: '    ', color: COLORS.plain },
    { text: 'int', color: COLORS.type }, { text: ' lo = ', color: COLORS.plain },
    { text: '0', color: COLORS.number }, { text: ', hi = a.', color: COLORS.plain },
    { text: 'size', color: COLORS.func }, { text: '()-', color: COLORS.plain },
    { text: '1', color: COLORS.number }, { text: ';\n', color: COLORS.plain },
    { text: '    ', color: COLORS.plain },
    { text: 'while', color: COLORS.keyword }, { text: '(lo ', color: COLORS.plain },
    { text: '<=', color: COLORS.operator }, { text: ' hi){\n', color: COLORS.bracket },
    { text: '        ', color: COLORS.plain },
    { text: 'int', color: COLORS.type }, { text: ' mid = (lo+hi)/', color: COLORS.plain },
    { text: '2', color: COLORS.number }, { text: ';\n', color: COLORS.plain },
    { text: '        ', color: COLORS.plain },
    { text: 'if', color: COLORS.keyword }, { text: '(a[mid]==x) ', color: COLORS.plain },
    { text: 'return', color: COLORS.keyword }, { text: ' mid;\n', color: COLORS.plain },
    { text: '    }\n', color: COLORS.bracket },
    { text: '    ', color: COLORS.plain },
    { text: 'return', color: COLORS.keyword }, { text: ' -', color: COLORS.plain },
    { text: '1', color: COLORS.number }, { text: ';\n', color: COLORS.plain },
    { text: '}', color: COLORS.bracket },
  ],
  [
    { text: 'template', color: COLORS.keyword }, { text: '<', color: COLORS.operator },
    { text: 'typename', color: COLORS.keyword }, { text: ' T', color: COLORS.type },
    { text: '>\n', color: COLORS.operator },
    { text: 'struct', color: COLORS.keyword }, { text: ' ', color: COLORS.plain },
    { text: 'SegTree', color: COLORS.type }, { text: ' {\n', color: COLORS.bracket },
    { text: '    ', color: COLORS.plain },
    { text: 'vector', color: COLORS.type }, { text: '<T>', color: COLORS.operator },
    { text: ' tree;\n', color: COLORS.plain },
    { text: '    ', color: COLORS.plain },
    { text: 'int', color: COLORS.type }, { text: ' n;\n', color: COLORS.plain },
    { text: '    ', color: COLORS.plain },
    { text: 'void', color: COLORS.type }, { text: ' ', color: COLORS.plain },
    { text: 'build', color: COLORS.func }, { text: '(', color: COLORS.bracket },
    { text: 'vector', color: COLORS.type }, { text: '<T>&', color: COLORS.operator },
    { text: ' a){\n', color: COLORS.bracket },
    { text: '        n = a.', color: COLORS.plain },
    { text: 'size', color: COLORS.func }, { text: '();\n', color: COLORS.plain },
    { text: '        tree.', color: COLORS.plain },
    { text: 'resize', color: COLORS.func }, { text: '(', color: COLORS.bracket },
    { text: '2', color: COLORS.number }, { text: '*n);\n', color: COLORS.plain },
    { text: '    }\n', color: COLORS.bracket },
    { text: '};', color: COLORS.bracket },
  ],
  [
    { text: '// Depth First Search', color: COLORS.comment }, { text: '\n', color: COLORS.plain },
    { text: 'void', color: COLORS.type }, { text: ' ', color: COLORS.plain },
    { text: 'dfs', color: COLORS.func }, { text: '(', color: COLORS.bracket },
    { text: 'int', color: COLORS.type }, { text: ' u, ', color: COLORS.plain },
    { text: 'vector', color: COLORS.type }, { text: '<', color: COLORS.operator },
    { text: 'vector', color: COLORS.type }, { text: '<', color: COLORS.operator },
    { text: 'int', color: COLORS.type }, { text: '>>&', color: COLORS.operator },
    { text: ' adj,\n', color: COLORS.plain },
    { text: '         ', color: COLORS.plain },
    { text: 'vector', color: COLORS.type }, { text: '<', color: COLORS.operator },
    { text: 'bool', color: COLORS.type }, { text: '>&', color: COLORS.operator },
    { text: ' vis){\n', color: COLORS.bracket },
    { text: '    vis[u] = ', color: COLORS.plain },
    { text: 'true', color: COLORS.keyword }, { text: ';\n', color: COLORS.plain },
    { text: '    ', color: COLORS.plain },
    { text: 'for', color: COLORS.keyword }, { text: '(', color: COLORS.bracket },
    { text: 'int', color: COLORS.type }, { text: ' v : adj[u]){\n', color: COLORS.plain },
    { text: '        ', color: COLORS.plain },
    { text: 'if', color: COLORS.keyword }, { text: '(!vis[v])\n', color: COLORS.plain },
    { text: '            ', color: COLORS.plain },
    { text: 'dfs', color: COLORS.func }, { text: '(v, adj, vis);\n', color: COLORS.plain },
    { text: '    }\n', color: COLORS.bracket },
    { text: '}', color: COLORS.bracket },
  ],
  [
    { text: '#include', color: COLORS.keyword }, { text: ' <', color: COLORS.operator },
    { text: 'iostream', color: COLORS.string }, { text: '>\n', color: COLORS.operator },
    { text: 'using', color: COLORS.keyword }, { text: ' ', color: COLORS.plain },
    { text: 'namespace', color: COLORS.keyword }, { text: ' ', color: COLORS.plain },
    { text: 'std', color: COLORS.type }, { text: ';\n\n', color: COLORS.plain },
    { text: 'int', color: COLORS.type }, { text: ' ', color: COLORS.plain },
    { text: 'gcd', color: COLORS.func }, { text: '(', color: COLORS.bracket },
    { text: 'int', color: COLORS.type }, { text: ' a, ', color: COLORS.plain },
    { text: 'int', color: COLORS.type }, { text: ' b){\n', color: COLORS.bracket },
    { text: '    ', color: COLORS.plain },
    { text: 'if', color: COLORS.keyword }, { text: '(b == ', color: COLORS.plain },
    { text: '0', color: COLORS.number }, { text: ') ', color: COLORS.plain },
    { text: 'return', color: COLORS.keyword }, { text: ' a;\n', color: COLORS.plain },
    { text: '    ', color: COLORS.plain },
    { text: 'return', color: COLORS.keyword }, { text: ' ', color: COLORS.plain },
    { text: 'gcd', color: COLORS.func }, { text: '(b, a%b);\n', color: COLORS.plain },
    { text: '}', color: COLORS.bracket },
  ],
  [
    { text: 'struct', color: COLORS.keyword }, { text: ' ', color: COLORS.plain },
    { text: 'DisjointSet', color: COLORS.type }, { text: ' {\n', color: COLORS.bracket },
    { text: '    ', color: COLORS.plain },
    { text: 'vector', color: COLORS.type }, { text: '<', color: COLORS.operator },
    { text: 'int', color: COLORS.type }, { text: '>', color: COLORS.operator },
    { text: ' parent, rank;\n', color: COLORS.plain },
    { text: '    ', color: COLORS.plain },
    { text: 'void', color: COLORS.type }, { text: ' ', color: COLORS.plain },
    { text: 'init', color: COLORS.func }, { text: '(', color: COLORS.bracket },
    { text: 'int', color: COLORS.type }, { text: ' n){\n', color: COLORS.bracket },
    { text: '        parent.', color: COLORS.plain },
    { text: 'resize', color: COLORS.func }, { text: '(n);\n', color: COLORS.plain },
    { text: '        rank.', color: COLORS.plain },
    { text: 'resize', color: COLORS.func }, { text: '(n, ', color: COLORS.plain },
    { text: '0', color: COLORS.number }, { text: ');\n', color: COLORS.plain },
    { text: '        ', color: COLORS.plain },
    { text: 'iota', color: COLORS.func }, { text: '(parent.', color: COLORS.plain },
    { text: 'begin', color: COLORS.func }, { text: '(),\n', color: COLORS.plain },
    { text: '             parent.', color: COLORS.plain },
    { text: 'end', color: COLORS.func }, { text: '(), ', color: COLORS.plain },
    { text: '0', color: COLORS.number }, { text: ');\n', color: COLORS.plain },
    { text: '    }\n', color: COLORS.bracket },
    { text: '};', color: COLORS.bracket },
  ],
];

// Flatten tokens into a single string and a color map
function buildTokenData(tokens) {
  let fullText = '';
  const colorRanges = [];
  for (const t of tokens) {
    const start = fullText.length;
    fullText += t.text;
    colorRanges.push({ start, end: fullText.length, color: t.color });
  }
  return { fullText, colorRanges };
}

function TypingCodeBlock({ tokens, delay = 0, position }) {
  const { fullText, colorRanges } = useMemo(() => buildTokenData(tokens), [tokens]);
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState('waiting');
  const indexRef = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPhase('typing');
      indexRef.current = 0;
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    let interval;

    if (phase === 'typing') {
      interval = setInterval(() => {
        if (indexRef.current < fullText.length) {
          indexRef.current++;
          setCharCount(indexRef.current);
        } else {
          setPhase('pausing');
        }
      }, 30 + Math.random() * 40);
    }

    if (phase === 'pausing') {
      interval = setTimeout(() => setPhase('deleting'), 3000);
    }

    if (phase === 'deleting') {
      interval = setInterval(() => {
        if (indexRef.current > 0) {
          indexRef.current--;
          setCharCount(indexRef.current);
        } else {
          setPhase('waiting');
          setTimeout(() => {
            indexRef.current = 0;
            setPhase('typing');
          }, 1500);
        }
      }, 15);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(interval);
    };
  }, [phase, fullText]);

  // Build colored spans for the currently displayed text
  const renderedSpans = useMemo(() => {
    const spans = [];
    let rendered = 0;
    for (const range of colorRanges) {
      if (rendered >= charCount) break;
      const segStart = range.start;
      const segEnd = Math.min(range.end, charCount);
      if (segEnd <= segStart) continue;
      const text = fullText.slice(segStart, segEnd);
      spans.push(
        <span key={segStart} style={{ color: range.color }}>
          {text}
        </span>
      );
      rendered = segEnd;
    }
    return spans;
  }, [charCount, fullText, colorRanges]);

  return (
    <motion.div
      className="absolute font-mono text-xs sm:text-sm whitespace-pre select-none pointer-events-none"
      style={{ ...position, opacity: 0.35 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.35 }}
      transition={{ duration: 1, delay: delay / 1000 }}
    >
      {renderedSpans}
      <motion.span
        className="inline-block w-[2px] h-[1em] ml-[1px] align-middle"
        style={{ backgroundColor: '#528BFF' }}
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
      />
    </motion.div>
  );
}

export default function CodeBackground() {
  const positions = useMemo(() => [
    { top: '5%', left: '3%' },
    { top: '8%', right: '5%' },
    { top: '35%', left: '2%' },
    { top: '40%', right: '3%' },
    { bottom: '15%', left: '5%' },
    { bottom: '10%', right: '4%' },
  ], []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {CODE_FRAGMENTS.map((tokens, i) => (
        <TypingCodeBlock
          key={i}
          tokens={tokens}
          delay={i * 2000}
          position={positions[i]}
        />
      ))}
    </div>
  );
}
