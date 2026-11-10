export const CASES = [
  {
    id: 'P1',
    prompt: 'Write a Python function that validates an email address.',
    constraints: ['Returns a boolean', 'Rejects malformed input'],
    rubric: [
      { id: 'C1', statement: 'The response includes a Python function.' },
      { id: 'C2', statement: 'The function returns a boolean.' },
    ],
    output: 'def validate(email):\n    return True\n',
    reviewers: [
      { id: 'A', scores: { C1: 'PASS', C2: 'PASS' } },
      { id: 'B', scores: { C1: 'PASS', C2: 'PASS' } },
    ],
    metaScores: { measurability: 1, coverage: 2, discrimination: 0, specificity: 1 },
    shortcutVerdict: 'sound',
    referenceVerdict: 'defective',
    defectClass: 'vacuous',
    fix: {
      replace: { C1: 'The function returns False for "not-an-email" and True for "user@example.com".' },
      add: [],
    },
    catches: 'The output is a stub that returns True for everything. Both reviewers pass it, because C1 "includes a Python function" is satisfied by `def validate(email): return True` and C2 "returns a boolean" is satisfied by `True`. The rubric grades the scaffold, not the feature. The shortcut says the rubric is sound because the output passed; the meta-rubric says the rubric is defective because C1 would also pass `def f(): pass`.',
  },
  {
    id: 'P2',
    prompt: 'Explain what a database index is to a junior developer.',
    constraints: ['Names the operations an index accelerates', 'Does not claim every query gets faster'],
    rubric: [
      { id: 'C1', statement: 'The explanation is clear and engaging.' },
      { id: 'C2', statement: 'The explanation is technically accurate.' },
    ],
    output: 'Think of an index like the table of contents in a book — it helps you find what you need faster. Every query you run will be quicker with an index, which is why databases use them everywhere.',
    reviewers: [
      { id: 'A', scores: { C1: 'PASS', C2: 'FAIL' } },
      { id: 'B', scores: { C1: 'PASS', C2: 'PASS' } },
    ],
    metaScores: { measurability: 0, coverage: 1, discrimination: 1, specificity: 1 },
    shortcutVerdict: 'sound',
    referenceVerdict: 'defective',
    defectClass: 'unmeasurable',
    fix: {
      replace: {
        C1: 'The explanation names three specific operations an index accelerates (point lookup, range scan, sort-avoidance) and is at most four sentences.',
        C2: 'No claim contradicts section "Indexes" of the database documentation at the URL cited in the prompt.',
      },
      add: [],
    },
    catches: 'The output claims "every query will be quicker", which is false. Reviewer A catches it; Reviewer B does not. That disagreement is not the reviewers\' fault: "technically accurate" has no cited source, so both reviewers are applying a private standard. "Clear and engaging" is worse — no source on Earth could resolve it.',
  },
  {
    id: 'P3',
    prompt: 'Write a SQL query to find the top 10 customers by revenue in 2025. Must use a window function.',
    constraints: ['Filters to 2025', 'Returns top 10 by revenue', 'Must use a window function'],
    rubric: [
      { id: 'C1', statement: 'The query is syntactically valid SQL.' },
      { id: 'C2', statement: 'The query returns the top 10 customers by revenue.' },
    ],
    output: 'SELECT customer_id, SUM(revenue) AS total\nFROM orders\nWHERE EXTRACT(YEAR FROM placed_at) = 2025\nGROUP BY customer_id\nORDER BY total DESC\nLIMIT 10;\n',
    reviewers: [
      { id: 'A', scores: { C1: 'PASS', C2: 'PASS' } },
      { id: 'B', scores: { C1: 'PASS', C2: 'PASS' } },
    ],
    metaScores: { measurability: 2, coverage: 0, discrimination: 1, specificity: 2 },
    shortcutVerdict: 'sound',
    referenceVerdict: 'defective',
    defectClass: 'coverage-gap',
    fix: {
      replace: {},
      add: ['The query contains a window function (an OVER clause).'],
    },
    catches: 'The output is correct SQL and returns the top 10 customers. It also ignores the third constraint — no window function, just ORDER BY ... LIMIT. Both reviewers pass it, correctly, because the rubric never asks about the window function. The shortcut says the rubric is sound; the meta-rubric says coverage is 0 because a stated constraint is not represented by any criterion.',
  },
  {
    id: 'P4',
    prompt: 'Summarise the attached incident post-mortem in exactly 3 sentences.',
    constraints: ['Exactly 3 sentences', 'Names the root cause'],
    rubric: [
      { id: 'C1', statement: 'The summary is concise and captures the key points.' },
    ],
    output: 'The checkout service experienced elevated latency on 2026-11-02. The incident lasted approximately eight minutes. Service was restored by a rollback.',
    reviewers: [
      { id: 'A', scores: { C1: 'PASS' } },
      { id: 'B', scores: { C1: 'FAIL' } },
    ],
    // fix J: specificity changed from 0 to 1. The criterion does name *some*
    // evidence (concise = sentence count, key points = root cause). The
    // defect is that two reviewers apply it differently, which is calibration,
    // not specificity. Leaving specificity at 0 made the derivation pick the
    // wrong defect class.
    metaScores: { measurability: 1, coverage: 1, discrimination: 1, specificity: 1 },
    shortcutVerdict: 'sound',
    referenceVerdict: 'defective',
    defectClass: 'calibration',
    fix: {
      replace: {
        C1: 'The summary is exactly 3 sentences (count sentence-ending punctuation) and names the root cause from section "Root cause" of the post-mortem.',
      },
      add: [],
    },
    catches: 'Reviewer A counts sentences: three of them, so PASS. Reviewer B checks information: three sentences but no root cause named, so FAIL. Both are applying the criterion correctly — "concise and captures the key points" means two different things. The disagreement is the defect, not the reviewers. The shortcut says the rubric is sound because one reviewer passed it; the meta-rubric says calibration is 0 because the criterion cannot survive two applications.',
  },
]
