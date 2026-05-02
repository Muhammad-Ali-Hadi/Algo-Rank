const cheerio = require('cheerio');

/**
 * Scrape a Codeforces problem page.
 * Supports URLs like:
 *   - https://codeforces.com/problemset/problem/1/A
 *   - https://codeforces.com/contest/1/problem/A
 */
async function scrapeCodeforces(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch problem page: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Extract problem statement
  const statementDiv = $('.problem-statement');

  // Title
  const title = statementDiv.find('.title').first().text().trim();

  // Time and memory limits
  const timeLimit = statementDiv.find('.time-limit').text().replace('time limit per test', '').trim();
  const memoryLimit = statementDiv.find('.memory-limit').text().replace('memory limit per test', '').trim();

  // Problem body (description, input, output sections)
  let statement = '';

  // Get all section divs within problem-statement
  statementDiv.children('div').each((_, el) => {
    const div = $(el);
    const className = div.attr('class') || '';

    // Skip the header (title, limits) and sample-tests
    if (className.includes('header') || className.includes('sample-tests')) return;

    // Get the section title and body
    const sectionTitle = div.find('.section-title').text().trim();
    const sectionBody = div.clone().find('.section-title').remove().end().html();

    if (sectionTitle) {
      statement += `<h3>${sectionTitle}</h3>`;
    }
    if (sectionBody) {
      statement += sectionBody.trim();
    }
  });

  // Helper to extract text while preserving block newlines
  const extractWithNewlines = (el) => {
    const cloned = el.clone();
    cloned.find('br').replaceWith('\n');
    cloned.find('.test-example-line').each((_, div) => $(div).append('\n'));
    return cloned.text().trim();
  };

  // Extract sample test cases
  const samples = [];
  statementDiv.find('.sample-test').each((_, testEl) => {
    const test = $(testEl);
    const inputs = test.find('.input pre');
    const outputs = test.find('.output pre');

    const inputCount = Math.max(inputs.length, outputs.length);
    for (let i = 0; i < inputCount; i++) {
      const inputText = extractWithNewlines(inputs.eq(i));
      const outputText = extractWithNewlines(outputs.eq(i));
      if (inputText || outputText) {
        samples.push({ input: inputText, output: outputText });
      }
    }
  });

  // Detect supported languages from Codeforces (standard list)
  const languages = [
    'GNU C++17', 'GNU C++20 (64)', 'Java 17', 'Python 3',
    'PyPy 3-64', 'JavaScript', 'Kotlin', 'Rust', 'Go', 'C#'
  ];

  return {
    title: title || 'Unknown Problem',
    timeLimit,
    memoryLimit,
    statement: statement || '<p>Could not extract problem statement.</p>',
    samples,
    languages,
    source: 'codeforces',
  };
}

/**
 * Detect judge from URL and scrape accordingly.
 */
async function scrapeProblem(url) {
  if (!url) throw new Error('URL is required');

  const normalizedUrl = url.toLowerCase();

  if (normalizedUrl.includes('codeforces.com')) {
    return scrapeCodeforces(url);
  }

  // For unsupported judges, return a placeholder
  return {
    title: 'External Problem',
    timeLimit: '',
    memoryLimit: '',
    statement: `<p>Problem scraping is not yet supported for this judge.</p><p><a href="${url}" target="_blank">Open problem in new tab →</a></p>`,
    samples: [],
    languages: ['C++', 'Java', 'Python 3', 'JavaScript'],
    source: 'unknown',
  };
}

module.exports = { scrapeProblem };
