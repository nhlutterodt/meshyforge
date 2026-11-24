// scripts/lib/spdx.mjs
//
// A minimal SPDX licence-expression evaluator, shared by the npm licence gate.
//
// WHY THIS IS NOT THE NOTICES GENERATOR'S SPLITTER. `expandExpression` in
// `generate-third-party-notices.mjs` answers "which identifiers appear in this
// expression", so a flat split on the operators is correct for grouping
// appendix sections. Satisfaction is a different question and needs the real
// grammar:
//
//     `MIT OR Apache-2.0`          -> EITHER disjunct satisfies
//     `(MIT OR Apache-2.0) AND X`  -> MIT alone does NOT satisfy; X must also
//
// A flat split would call that second expression satisfied by MIT alone, and
// would report a compliant package as non-compliant in the first case if it
// compared the whole string. Both mistakes are silent, so the grammar is
// implemented rather than approximated.
//
// Grammar (SPDX 2.x, the subset that appears in npm metadata):
//     or   := and ( "OR" and )*
//     and  := atom ( "AND" atom )*
//     atom := "(" or ")" | IDENT ( "WITH" IDENT )?
//
// Leniency, documented rather than hidden: `/` and `,` are treated as `OR`,
// because npm packages use them as bare disjunctions (`MIT/X11`,
// `MIT, Apache-2.0`). SPDX itself does not.

const OPERATORS = new Set(['AND', 'OR', 'WITH']);

/** Split an expression into identifiers, parentheses and operators. */
export function tokenize(expression) {
  const tokens = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (char === '(' || char === ')') {
      tokens.push(char);
      index += 1;
      continue;
    }
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    // npm uses a bare comma or slash as a disjunction; SPDX does not.
    if (char === ',' || char === '/') {
      tokens.push('OR');
      index += 1;
      continue;
    }
    let word = '';
    while (index < expression.length && !/[\s(),/]/.test(expression[index])) {
      word += expression[index];
      index += 1;
    }
    tokens.push(OPERATORS.has(word.toUpperCase()) ? word.toUpperCase() : word);
  }
  return tokens;
}

function parse(tokens) {
  let position = 0;

  function peek() {
    return tokens[position];
  }

  function parseAtom() {
    const token = tokens[position];
    if (token === undefined) throw new Error('unexpected end of license expression');
    if (token === '(') {
      position += 1;
      const inner = parseOr();
      if (tokens[position] !== ')') throw new Error('unbalanced parentheses');
      position += 1;
      return inner;
    }
    if (token === ')' || OPERATORS.has(token)) {
      throw new Error(`unexpected token "${token}"`);
    }
    position += 1;
    const node = { type: 'license', id: token, exception: null };
    if (peek() === 'WITH') {
      position += 1;
      const exception = tokens[position];
      if (exception === undefined) throw new Error('WITH without an exception');
      node.exception = exception;
      position += 1;
    }
    return node;
  }

  function parseAnd() {
    let node = parseAtom();
    while (peek() === 'AND') {
      position += 1;
      node = { type: 'and', left: node, right: parseAtom() };
    }
    return node;
  }

  function parseOr() {
    let node = parseAnd();
    while (peek() === 'OR') {
      position += 1;
      node = { type: 'or', left: node, right: parseAnd() };
    }
    return node;
  }

  const root = parseOr();
  if (position !== tokens.length) throw new Error('trailing tokens in license expression');
  return root;
}

/**
 * Evaluate an expression against an allowlist predicate.
 *
 * @param {string} expression  declared SPDX expression (may be empty/undefined)
 * @param {(identifier: string) => boolean} isAllowed
 * @returns {{ satisfied: boolean, error?: string }}
 */
export function evaluateExpression(expression, isAllowed) {
  const source = typeof expression === 'string' ? expression.trim() : '';
  if (!source) return { satisfied: false, error: 'no license declared' };

  const allows = (node) => {
    if (node.exception) {
      // `X WITH Y` is its own identifier in cargo-deny's vocabulary, so offer
      // the compound form first and fall back to the bare licence.
      return isAllowed(`${node.id} WITH ${node.exception}`) || isAllowed(node.id);
    }
    return isAllowed(node.id);
  };

  const walk = (node) => {
    if (node.type === 'license') return allows(node);
    if (node.type === 'and') return walk(node.left) && walk(node.right);
    return walk(node.left) || walk(node.right);
  };

  try {
    return { satisfied: walk(parse(tokenize(source))) };
  } catch {
    // An unparseable expression is a FAILURE, never a pass: silently treating it
    // as compliant is how an unknown licence becomes an assumption.
    return { satisfied: false, error: `unparseable expression: ${source}` };
  }
}

/** Every identifier mentioned, for reporting. Best-effort; never throws. */
export function identifiersIn(expression) {
  if (typeof expression !== 'string' || !expression.trim()) return [];
  return [
    ...new Set(
      tokenize(expression).filter(
        (token) => token !== '(' && token !== ')' && !OPERATORS.has(token),
      ),
    ),
  ];
}
