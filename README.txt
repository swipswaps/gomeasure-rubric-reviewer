GOMEASURE RUBRIC REVIEWER
=========================

A meta-rubric for evaluating the rubrics that evaluate AI outputs. The unit
of evaluation is a (prompt, rubric, model output) triple, and the artefact
scores the rubric, not the output.

THE POSTING
-----------

GoMeasure's Prompt Quality Reviewer role asks for a reviewer who will:

  Review prompts, constraints, rubrics and measurable evaluation criteria.
  Apply clear, consistent rubrics to score AI outputs and explain your
  judgement with concrete, cited evidence.
  Surface errors, risks, and edge cases the model misses.
  Recommend improvements to prompts, evaluation criteria, and reference
  ("gold") answers.
  Calibrate with other reviewers so quality standards stay consistent.

https://www.gomeasure.ai/talent-network/roles/prompt-quality-reviewer

The posting accepts a strong portfolio in lieu of professional tenure.

THE ARGUMENT
------------

A rubric can pass a bad model output and still be defective. The shortcut
says "the output passed, so the rubric is fine". The meta-rubric rejects that
shortcut on every case where it is wrong.

The meta-rubric scores the rubric 0-2 on five dimensions:

  measurability   can the criterion be checked against a cited source?
  coverage        does the rubric cover every stated constraint?
  discrimination  does the criterion reject a plausible wrong output?
  specificity     does the criterion name the evidence it requires?
  calibration     do two independent reviewers agree on each criterion?

Calibration is derived mechanically from the two reviewers' scores; the other
four are hand-scored. A rubric with any dimension at 0 is defective. The
dimension that is 0 identifies the defect class.

THE FOUR DEFECT CLASSES AND THE FOUR CASES
------------------------------------------

P1  vacuous (discrimination = 0)
    A rubric whose criterion is satisfied by `def f(): pass`.

P2  unmeasurable (measurability = 0)
    A rubric whose criterion is "clear and engaging" — no source could
    resolve it.

P3  coverage gap (coverage = 0)
    A rubric that ignores a stated constraint (the prompt says "must use a
    window function"; no criterion checks it).

P4  calibration failure (calibration = 0)
    A rubric whose criterion ("concise and captures the key points") cannot
    survive two independent applications.

In every case the shortcut says the rubric is sound, because the model
output passed it. In every case the meta-rubric names the defect and
proposes a specific fix.

RUN IT
------

    npm ci
    npm run review
    npm run build
    npm run preview

TEST IT
-------

    npx playwright install chromium
    npx playwright test

CITATIONS
---------

HELM (Stanford CRFM) — evaluation methodology
    https://crfm.stanford.edu/helm/
Diataxis — prompt-mode framing
    https://diataxis.fr/
"Concrete Problems in AI Safety" — edge cases and negative examples
    https://arxiv.org/abs/1606.06565
NIST AI Risk Management Framework — evidence-based review
    https://www.nist.gov/itl/ai-risk-management-framework
Cohen's kappa — inter-rater reliability
    https://en.wikipedia.org/wiki/Cohen%27s_kappa

KNOWN LIMITS
------------

- Four cases is a demonstration of the method, not a benchmark.
- The meta-scores other than calibration are authored, not measured.
- The four defect classes are not exhaustive.
- The reviewers are representative of the class, not captured live.
- Only English is evaluated.
