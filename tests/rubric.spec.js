import { test, expect } from '@playwright/test'
import { CASES } from '../corpus/index.mjs'
import { evaluateRubric, calibrationScore, metaVerdict } from '../rubric/index.mjs'

test('every case evaluates without error', () => {
  for (const c of CASES) {
    const r = evaluateRubric(c)
    expect(r.error, c.id).toBeUndefined()
    expect(['sound', 'weak', 'defective']).toContain(r.metaVerdict)
  }
})

test('the meta-rubric rejects the shortcut on every case where the shortcut is wrong', () => {
  for (const c of CASES) {
    const r = evaluateRubric(c)
    if (c.shortcutVerdict !== c.referenceVerdict) {
      expect(r.metaVerdict, c.id).not.toBe(c.shortcutVerdict)
      expect(r.metaVerdict, c.id).toBe(c.referenceVerdict)
    }
  }
})

test('the defect class matches the reference on every case', () => {
  for (const c of CASES) {
    const r = evaluateRubric(c)
    expect(r.derivedDefect, c.id).toBe(c.defectClass)
  }
})

test('calibration is 2 when reviewers agree, 1 on one disagreement, 0 when every criterion is disputed', () => {
  const rubric = [{ id: 'C1' }, { id: 'C2' }, { id: 'C3' }]
  expect(calibrationScore([{ scores: { C1: 'PASS', C2: 'PASS', C3: 'PASS' } }, { scores: { C1: 'PASS', C2: 'PASS', C3: 'PASS' } }], rubric)).toBe(2)
  expect(calibrationScore([{ scores: { C1: 'PASS', C2: 'PASS', C3: 'PASS' } }, { scores: { C1: 'PASS', C2: 'FAIL', C3: 'PASS' } }], rubric)).toBe(1)
  expect(calibrationScore([{ scores: { C1: 'PASS', C2: 'PASS', C3: 'PASS' } }, { scores: { C1: 'FAIL', C2: 'FAIL', C3: 'PASS' } }], rubric)).toBe(0)
  expect(calibrationScore([{ scores: { C1: 'PASS' } }, { scores: { C1: 'FAIL' } }], [{ id: 'C1' }])).toBe(0)
})

test('any dimension at 0 makes the verdict defective', () => {
  const scores = { measurability: 2, coverage: 2, discrimination: 0, specificity: 2, calibration: 2 }
  expect(metaVerdict(scores)).toBe('defective')
})

test('every dimension at least 1 and at least four at 2 is sound', () => {
  const scores = { measurability: 2, coverage: 2, discrimination: 2, specificity: 2, calibration: 1 }
  expect(metaVerdict(scores)).toBe('sound')
})

test('no zeros but fewer than four twos is weak', () => {
  const scores = { measurability: 1, coverage: 2, discrimination: 1, specificity: 2, calibration: 1 }
  expect(metaVerdict(scores)).toBe('weak')
})

test('evaluation is deterministic', () => {
  const c = CASES[0]
  expect(JSON.stringify(evaluateRubric(c))).toBe(JSON.stringify(evaluateRubric(c)))
})
