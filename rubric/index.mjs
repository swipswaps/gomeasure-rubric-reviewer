// The meta-rubric.
//
// The posting asks the reviewer to "review prompts, constraints, rubrics and
// measurable evaluation criteria". That is a review of the rubric, not of the
// output. A rubric can pass a bad output and still be defective; this file
// scores the rubric on five properties that distinguish the two cases.
//
// Each dimension is scored 0 (absent), 1 (partial), or 2 (present). A rubric
// with any dimension at 0 is defective. The dimension that is at 0 identifies
// the defect class, which is why defectClass and zero-dimension are one-to-one.
//
// Dimensions, each citing the source that justifies the criterion:
//
//   measurability   HELM (Stanford CRFM)
//                   https://crfm.stanford.edu/helm/
//   coverage        Diataxis
//                   https://diataxis.fr/
//   discrimination  "Concrete Problems in AI Safety"
//                   https://arxiv.org/abs/1606.06565
//   specificity     NIST AI Risk Management Framework
//                   https://www.nist.gov/itl/ai-risk-management-framework
//   calibration     Cohen's kappa
//                   https://en.wikipedia.org/wiki/Cohen%27s_kappa
//
// calibration is DERIVED from reviewers, not hand-scored. The validation
// loop in evaluateRubric skips it; calibrationScore computes it afterwards.

export const DIMENSIONS = [
  { id: 'measurability', label: 'Measurability', question: 'Can each criterion be checked against a cited source, or is it a vibe?', weight: 0.25, citation: 'https://crfm.stanford.edu/helm/', citationLabel: 'HELM' },
  { id: 'coverage', label: 'Coverage', question: 'Does the rubric cover every constraint the prompt states?', weight: 0.20, citation: 'https://diataxis.fr/', citationLabel: 'Diataxis' },
  { id: 'discrimination', label: 'Discrimination', question: 'Does the criterion reject a plausible wrong output, or only a broken one?', weight: 0.25, citation: 'https://arxiv.org/abs/1606.06565', citationLabel: 'Concrete Problems in AI Safety' },
  { id: 'specificity', label: 'Specificity', question: 'Does the criterion name the evidence it requires?', weight: 0.15, citation: 'https://www.nist.gov/itl/ai-risk-management-framework', citationLabel: 'NIST AI RMF' },
  { id: 'calibration', label: 'Calibration', question: 'Do two independent reviewers agree on each criterion?', weight: 0.15, citation: 'https://en.wikipedia.org/wiki/Cohen%27s_kappa', citationLabel: "Cohen's kappa" },
]

export const DEFECT_CLASSES = ['vacuous', 'unmeasurable', 'coverage-gap', 'calibration']
export const META_VERDICTS = ['sound', 'weak', 'defective']

// 0 disagreements           -> 2
// every criterion disputed  -> 0 (a rubric that cannot survive two
//                              independent applications has no reliability,
//                              even when it has only one criterion)
// 1 disagreement            -> 1
// otherwise                 -> 0
export function calibrationScore(reviewers, criteria) {
  if (!Array.isArray(reviewers) || reviewers.length < 2) return 0
  if (!Array.isArray(criteria) || criteria.length === 0) return 0
  let disagreements = 0
  for (const c of criteria) {
    const a = reviewers[0].scores?.[c.id]
    const b = reviewers[1].scores?.[c.id]
    if (a === undefined || b === undefined) return 0
    if (a !== b) disagreements += 1
  }
  if (disagreements === 0) return 2
  if (disagreements === criteria.length) return 0
  if (disagreements === 1) return 1
  return 0
}

const DEFECT_FOR_ZERO = {
  measurability: 'unmeasurable',
  coverage: 'coverage-gap',
  discrimination: 'vacuous',
  specificity: 'unmeasurable',
  calibration: 'calibration',
}

export function metaVerdict(scores) {
  const values = DIMENSIONS.map((d) => scores[d.id])
  if (values.some((v) => v === 0)) return 'defective'
  const atLeastFourTwos = values.filter((v) => v === 2).length >= 4
  const allAtLeastOne = values.every((v) => v >= 1)
  if (allAtLeastOne && atLeastFourTwos) return 'sound'
  return 'weak'
}

export function evaluateRubric(entry) {
  const scores = {}
  for (const dim of DIMENSIONS) {
    // calibration is derived from reviewers below, not hand-scored (fix I)
    if (dim.id === 'calibration') continue
    const raw = entry.metaScores?.[dim.id]
    if (typeof raw !== 'number' || raw < 0 || raw > 2) {
      return { error: `invalid metaScore for ${dim.id}: ${raw}` }
    }
    scores[dim.id] = raw
  }

  const calibration = calibrationScore(entry.reviewers, entry.rubric)
  scores.calibration = calibration

  const verdict = metaVerdict(scores)
  const zeroDim = DIMENSIONS.find((d) => scores[d.id] === 0)
  const derivedDefect = zeroDim ? DEFECT_FOR_ZERO[zeroDim.id] : null

  return {
    caseId: entry.id,
    prompt: entry.prompt,
    constraints: entry.constraints,
    rubric: entry.rubric,
    output: entry.output,
    reviewers: entry.reviewers,
    shortcutVerdict: entry.shortcutVerdict,
    referenceVerdict: entry.referenceVerdict,
    referenceDefect: entry.defectClass,
    metaVerdict: verdict,
    derivedDefect,
    scores,
    fix: entry.fix,
    catches: entry.catches,
    rejectsShortcut: verdict !== entry.shortcutVerdict,
    matchesReference: verdict === entry.referenceVerdict,
    note: buildNote(verdict, derivedDefect, entry),
  }
}

function buildNote(verdict, derivedDefect, entry) {
  if (verdict === 'sound') {
    return `Sound rubric: every criterion is measurable, the constraints are covered, discrimination is tested, specificity is named, and reviewers agree.`
  }
  if (verdict === 'defective') {
    return `Defective rubric (${derivedDefect}): at least one dimension is 0. ${entry.catches}`
  }
  return `Weak rubric: no dimension is 0, but at least one is partial. ${entry.catches}`
}
