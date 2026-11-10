import { useMemo, useState } from 'react'
import data from './generated/matrix.json'

const VERDICT_CLASS = { sound: 'verdict--sound', weak: 'verdict--weak', defective: 'verdict--defective' }
const DEFECT_CLASS = { vacuous: 'defect--vacuous', unmeasurable: 'defect--unmeasurable', 'coverage-gap': 'defect--coverage', calibration: 'defect--calibration' }

function VerdictBadge({ verdict }) { return <span className={`verdict ${VERDICT_CLASS[verdict] ?? ''}`}>{verdict}</span> }
function DefectBadge({ defect }) {
  if (!defect) return <span className="defect defect--none">none</span>
  return <span className={`defect ${DEFECT_CLASS[defect] ?? ''}`}>{defect}</span>
}
function ScoreBar({ score }) {
  const pct = (score / 2) * 100
  const cls = score === 0 ? 'bar--fail' : score === 1 ? 'bar--warn' : 'bar--pass'
  return <div className="bar-row"><span className="bar-track"><i className={cls} style={{ width: `${pct}%` }} /></span><span className="bar-num">{score}</span></div>
}

function TheCatch() {
  const defective = (data.matrix ?? []).filter((r) => r.metaVerdict === 'defective')
  if (defective.length === 0) return <p className="empty-state">No defective rubrics caught.</p>
  const first = defective[0]
  const entry = (data.cases ?? []).find((c) => c.id === first.caseId)
  return (
    <div className="catch" data-testid="catch">
      <p className="catch-kicker">{defective.length} rubric(s) that pass the model output and are still defective</p>
      <p><strong>{first.caseId}</strong> <span className="label">prompt</span> {entry?.prompt}</p>
      <p className="catch-shortcut"><span className="label">shortcut</span> {first.shortcutVerdict} · <span className="label">meta-rubric</span> {first.metaVerdict} · <span className="label">defect</span> <DefectBadge defect={first.derivedDefect} /></p>
      <p className="catch-note" data-testid="catch-note">{first.note}</p>
    </div>
  )
}

function CaseView({ entry, row }) {
  if (!entry || !row) return null
  const dims = data.dimensions ?? []
  return (
    <article className="case" data-testid="case-view">
      <p className="case-prompt"><span className="label">prompt</span> {entry.prompt}</p>
      <div className="case-two-col">
        <section><h3 className="sub-heading">Constraints</h3><ul className="plain-list">{entry.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul></section>
        <section><h3 className="sub-heading">Rubric under review</h3><ul className="plain-list">{entry.rubric.map((c) => <li key={c.id}><span className="criterion-id">{c.id}</span> {c.statement}</li>)}</ul></section>
      </div>
      <h3 className="sub-heading">Model output (what the rubric scores)</h3>
      <pre className="case-output">{entry.output}</pre>
      <h3 className="sub-heading">Two independent reviewers</h3>
      <div className="reviewers">
        {entry.reviewers.map((r) => (<div key={r.id} className="reviewer"><p className="reviewer-id">Reviewer {r.id}</p><ul className="plain-list">{entry.rubric.map((c) => <li key={c.id}><span className="criterion-id">{c.id}</span> {r.scores[c.id]}</li>)}</ul></div>))}
        <div className={`agreement ${row.scores.calibration === 2 ? 'agreement--ok' : row.scores.calibration === 1 ? 'agreement--warn' : 'agreement--bad'}`}>
          <p className="agreement-label">calibration</p>
          <p className="agreement-value">{row.scores.calibration} / 2</p>
          <p className="agreement-note">{row.scores.calibration === 2 ? 'reviewers agree on every criterion' : row.scores.calibration === 1 ? 'reviewers disagree on one criterion' : entry.rubric.length === 1 ? 'reviewers disagree on the only criterion' : 'reviewers disagree on two or more criteria'}</p>
        </div>
      </div>
      <h3 className="sub-heading">Meta-rubric scores (the rubric, not the output)</h3>
      <div className="meta-scores">
        {dims.map((d) => {
          const score = row.scores[d.id]
          return (
            <div key={d.id} className={`meta-row ${score === 0 ? 'meta-row--zero' : ''}`}>
              <span className="meta-label">{d.label}</span>
              <ScoreBar score={score} />
              <a className="meta-cite" href={d.citation} target="_blank" rel="noopener">[{d.citationLabel}]</a>
            </div>
          )
        })}
      </div>
      <h3 className="sub-heading">Proposed fix</h3>
      <div className="fix">
        {Object.entries(entry.fix.replace || {}).map(([id, replacement]) => (<div key={id} className="fix-row"><span className="criterion-id">replace {id}</span><span className="fix-text">{replacement}</span></div>))}
        {(entry.fix.add || []).map((statement, i) => (<div key={`add-${i}`} className="fix-row"><span className="criterion-id">add</span><span className="fix-text">{statement}</span></div>))}
      </div>
      <h3 className="sub-heading">What the meta-rubric catches</h3>
      <p className="case-catches">{entry.catches}</p>
    </article>
  )
}

function Matrix() {
  const rows = data.matrix ?? []
  const dims = data.dimensions ?? []
  if (rows.length === 0) return <p className="empty-state">No matrix yet. Run npm run review.</p>
  return (
    <div className="matrix-scroll"><table className="matrix" data-testid="matrix">
      <thead><tr><th>case</th>{dims.map((d) => <th key={d.id}>{d.label}</th>)}<th>meta</th><th>defect</th><th>shortcut</th><th>rejects?</th></tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.caseId} className={row.metaVerdict === 'defective' ? 'row-defect' : ''}>
            <th scope="row"><span className="case-id">{row.caseId}</span></th>
            {dims.map((d) => <td key={d.id} className={`num ${row.scores[d.id] === 0 ? 'num--zero' : ''}`}>{row.scores[d.id]}</td>)}
            <td><VerdictBadge verdict={row.metaVerdict} /></td>
            <td><DefectBadge defect={row.derivedDefect} /></td>
            <td className="num num--muted">{row.shortcutVerdict}</td>
            <td className={`num ${row.rejectsShortcut ? 'num--pass' : 'num--fail'}`}>{row.rejectsShortcut ? 'yes' : 'no'}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  )
}

export default function App() {
  const s = data.summary ?? {}
  const cases = data.cases ?? []
  const rows = data.matrix ?? []
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? null)
  const entry = useMemo(() => cases.find((c) => c.id === selectedId) ?? cases[0] ?? null, [cases, selectedId])
  const row = useMemo(() => rows.find((r) => r.caseId === selectedId) ?? rows[0] ?? null, [rows, selectedId])

  return (
    <div className="app">
      <header className="page-header">
        <p className="eyebrow">Rubric review · measurability · coverage · discrimination · specificity · calibration</p>
        <h1>The output passed. That is not the question.</h1>
        <p className="page-sub">A meta-rubric for evaluating the rubrics that evaluate AI outputs. A rubric can pass a bad output and still be defective. This artefact scores the rubric on five properties, names the defect class, and proposes a specific fix. On every case where the shortcut says the rubric is fine, the meta-rubric says why it is not.</p>
        <dl className="stats">
          <div><dt>cases</dt><dd>{s.total ?? 0}</dd></div>
          <div><dt>sound</dt><dd className="stat-ok">{s.sound ?? 0}</dd></div>
          <div><dt>weak</dt><dd className="stat-warn">{s.weak ?? 0}</dd></div>
          <div><dt>defective</dt><dd className="stat-bad">{s.defective ?? 0}</dd></div>
          <div><dt>rejects shortcut</dt><dd className={s.soundFlag ? 'stat-ok' : 'stat-bad'}>{s.rejectsShortcut ?? 0}/{s.total ?? 0}</dd></div>
          <div><dt>sound</dt><dd className={s.soundFlag ? 'stat-ok' : 'stat-bad'}>{s.soundFlag ? 'yes' : 'no'}</dd></div>
        </dl>
      </header>
      <main>
        <section className="panel-block"><h2 className="panel-heading">The catch</h2><TheCatch /></section>
        <section className="panel-block">
          <h2 className="panel-heading">Cases</h2>
          <nav className="case-nav">{cases.map((c) => (<button key={c.id} type="button" className={`case-tab ${c.id === selectedId ? 'is-active' : ''}`} onClick={() => setSelectedId(c.id)} aria-pressed={c.id === selectedId}><span className="tab-id">{c.id}</span><span className="tab-prompt">{c.prompt.length > 64 ? c.prompt.slice(0, 64) + '…' : c.prompt}</span></button>))}</nav>
          <CaseView entry={entry} row={row} />
        </section>
        <section className="panel-block">
          <h2 className="panel-heading">Discrimination matrix</h2>
          <p className="panel-hint">Each dimension is scored 0–2. The meta-verdict is derived from the scores, not from whether the output passed. A rubric with any dimension at 0 is defective. The dimension that is 0 identifies the defect class.</p>
          <Matrix />
        </section>
        <section className="panel-block">
          <h2 className="panel-heading">Known limits</h2>
          <ul className="limits-list">
            <li>Four cases is a demonstration of the method, not a benchmark.</li>
            <li>The meta-scores other than calibration are authored, not measured. A production version needs inter-rater agreement data for those four.</li>
            <li>The four defect classes are not exhaustive.</li>
            <li>The reviewers are representative of the class, not captured from a live review session.</li>
            <li>Only English is evaluated.</li>
          </ul>
        </section>
      </main>
      <footer className="page-footer"><p>Source: <a href="https://github.com/swipswaps/gomeasure-rubric-reviewer">github.com/swipswaps/gomeasure-rubric-reviewer</a> · raw: <a href="matrix.json" download>matrix.json</a></p></footer>
    </div>
  )
}
