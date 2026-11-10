import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CASES } from '../corpus/index.mjs'
import { evaluateRubric, DIMENSIONS } from '../rubric/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

function main() {
  const rows = CASES.map((c) => evaluateRubric(c))
  const errors = rows.filter((r) => r.error)
  if (errors.length) {
    for (const e of errors) console.error('  !! ' + e.error)
    process.exit(3)
  }

  const defects = rows.filter((r) => r.metaVerdict === 'defective')
  const weak = rows.filter((r) => r.metaVerdict === 'weak')
  const sound = rows.filter((r) => r.metaVerdict === 'sound')

  const checks = rows.map((r) => ({
    caseId: r.caseId,
    shortcut: r.shortcutVerdict,
    reference: r.referenceVerdict,
    meta: r.metaVerdict,
    derivedDefect: r.derivedDefect,
    referenceDefect: r.referenceDefect,
    rejectsShortcut: r.rejectsShortcut,
    matchesReference: r.matchesReference,
    defectMatches: r.derivedDefect === r.referenceDefect,
  }))
  const failures = checks.filter((c) => !c.rejectsShortcut || !c.matchesReference || !c.defectMatches)

  const payload = {
    generatedAt: new Date().toISOString(),
    generator: 'scripts/review.mjs',
    buildId: process.env.GITHUB_SHA ?? null,
    dimensions: DIMENSIONS.map((d) => ({ id: d.id, label: d.label, question: d.question, weight: d.weight, citation: d.citation, citationLabel: d.citationLabel })),
    cases: CASES.map((c) => ({ id: c.id, prompt: c.prompt, constraints: c.constraints, rubric: c.rubric, output: c.output, reviewers: c.reviewers, shortcutVerdict: c.shortcutVerdict, referenceVerdict: c.referenceVerdict, defectClass: c.defectClass, fix: c.fix, catches: c.catches })),
    matrix: rows,
    checks,
    summary: {
      total: rows.length,
      sound: sound.length,
      weak: weak.length,
      defective: defects.length,
      rejectsShortcut: checks.filter((c) => c.rejectsShortcut).length,
      matchesReference: checks.filter((c) => c.matchesReference).length,
      defectClassMatches: checks.filter((c) => c.defectMatches).length,
      soundFlag: failures.length === 0,
    },
  }

  const json = JSON.stringify(payload, null, 2)
  mkdirSync(resolve(ROOT, 'src', 'generated'), { recursive: true })
  mkdirSync(resolve(ROOT, 'public'), { recursive: true })
  writeFileSync(resolve(ROOT, 'src', 'generated', 'matrix.json'), json)
  writeFileSync(resolve(ROOT, 'public', 'matrix.json'), json)

  for (const row of rows) {
    const mark = row.matchesReference && row.rejectsShortcut ? 'ok   ' : 'MISS '
    console.log(`  ${mark} ${row.caseId.padEnd(3)} meta=${row.metaVerdict.padEnd(10)} defect=${(row.derivedDefect || '-').padEnd(12)} shortcut=${row.shortcutVerdict.padEnd(8)} ref=${row.referenceVerdict}`)
  }
  console.log(`\nsound: ${sound.length}  weak: ${weak.length}  defective: ${defects.length}`)
  console.log(`rejects shortcut: ${checks.filter((c) => c.rejectsShortcut).length}/${checks.length}`)
  console.log(`matches reference: ${checks.filter((c) => c.matchesReference).length}/${checks.length}`)
  console.log(`defect class matches: ${checks.filter((c) => c.defectMatches).length}/${checks.length}`)
  console.log(`sound: ${payload.summary.soundFlag ? 'yes' : 'NO'}`)
  process.exit(0)
}

main()
