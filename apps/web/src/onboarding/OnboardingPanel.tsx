/**
 * The first-run onboarding panel (OPS-01).
 *
 * WHAT IT IS NOT, FIRST, BECAUSE THAT DECIDED EVERYTHING ELSE
 *
 * It is not a modal, and it does not use the ARIA modal or top-layer APIs. (The
 * names of those APIs are deliberately not written out in this file: the CUS-01
 * source gate forbids the constructs themselves anywhere under `src/`, and it
 * reads block comments too, so naming one here would fail the build that exists
 * to stop it being used.) It is a `<section>` in normal flow directly above the
 * settings row, and the typing field is usable while the panel is open and
 * unanswered — which is what makes "skippable" mean something rather than being a
 * claim.
 *
 * IT DOES NOT STEAL FOCUS ON LOAD, AND THAT IS A DECISION
 *
 * The panel appears on a visitor's first visit, before they have done anything.
 * Moving focus at that moment would break the app's own documented contract (13
 * §1: one key from page load to the typing field) and would be its own
 * accessibility problem — a page that grabs focus on arrival is disorienting
 * whatever else it is. So: no focus move on load, and the dismiss control is the
 * panel's FIRST focusable element, which puts it one Tab after the app's skip
 * link. Reachable immediately, without a focus steal.
 *
 * When the visitor opens the panel themselves, focus IS managed: it moves into the
 * panel on open, and on close it goes to the typing field (dismissed) or back to
 * the button that opened it (reopened then re-closed).
 *
 * STATE
 *
 * Three pieces of React state and nothing else: the view, and the draft answers.
 * All three change on a click or a selection — never in the key path (AGENTS.md
 * rule 2). The plan is derived on every render by `buildStartingPlan`, so there is
 * no second copy of the truth to drift.
 *
 * NO CADENCE, NO STREAKS, NO TARGETS
 *
 * The string table has rows for an if-then plan ("when will you practice?") and a
 * gamification question ("how do you feel about streaks?"). This panel asks
 * neither. Both belong to RET-M-08 (M5): a question about streaks has nothing
 * honest to point at until the streak system exists, and asking someone when they
 * will practise before they have done anything is how a product sets up the guilt
 * loop the retention playbook §7.3 warns against. The plan says what will be typed
 * and says nothing about how often.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Layout } from "@realtype/schemas";

import { COPY } from "../copy";
import {
  ONBOARDING_GOALS,
  ONBOARDING_LEVELS,
  TRACK_LANGUAGES,
  buildStartingPlan,
  type OnboardingGoal,
  type OnboardingLevel,
  type TrackLanguage,
} from "./plan";
import {
  plannedRecord,
  readOnboardingRecord,
  skippedRecord,
  writeOnboardingRecord,
  type OnboardingRecord,
} from "./storage";
import { readBaselineRecord } from "../baseline/storage";

export interface OnboardingPanelProps {
  /**
   * The layout LOC-01 already decided. Passed IN, never chosen here: onboarding
   * states the decision and points at the always-visible override in Settings,
   * which is the whole of its layout behaviour.
   */
  layout: Layout;
  /** Whether that layout is a confirmed choice or LOC-01's first-run guess. */
  layoutConfirmed: boolean;
  /**
   * Changes whenever a baseline is written (MOD-05), so the plan re-derives
   * with the measurement instead of the self-report it was shown before. A
   * plain prop rather than a store subscription: this component has no state
   * that changes while a test runs (rule 2), and one number that changes twice
   * in a session does not justify a subscription.
   */
  baselineVersion?: number;
}

/**
 * Which of the three faces is on screen. `closed` is not a rendering of the form —
 * it renders NOTHING at all, which is what "skip leaves no residue" means here: no
 * hidden node, no empty required field, no invisible gate for a later visitor or a
 * later test to trip over.
 */
type View = "form" | "summary" | "closed";

export function OnboardingPanel({
  layout,
  layoutConfirmed,
  baselineVersion = 0,
}: OnboardingPanelProps) {
  /**
   * One lazy read of the stored record, and the initial view derived from it. Held
   * in a single `useState` rather than four so localStorage is touched exactly
   * once and the three answers and the view can never disagree about which visit
   * this is.
   */
  const [initial] = useState(() => {
    const record = readOnboardingRecord();
    const answers =
      record !== null && record.state === "planned"
        ? { goal: record.goal, level: record.level, languages: record.languages }
        : { goal: null, level: null, languages: [] as readonly TrackLanguage[] };
    return {
      view: (record === null ? "form" : record.state === "planned" ? "summary" : "closed") as View,
      ...answers,
    };
  });

  const [view, setView] = useState<View>(initial.view);
  const [goal, setGoal] = useState<OnboardingGoal | null>(initial.goal);
  const [level, setLevel] = useState<OnboardingLevel | null>(initial.level);
  const [languages, setLanguages] = useState<readonly TrackLanguage[]>(initial.languages);

  const panelRef = useRef<HTMLElement>(null);
  /** The button that reopened the panel, so focus can go back to exactly it. */
  const openerRef = useRef<HTMLButtonElement | null>(null);
  /**
   * What the pending focus move is FOR. Set on open and on close, consumed by the
   * effect after the view has actually committed — the same discipline the results
   * panel uses for its replay, and for the same reason: a `requestAnimationFrame`
   * or an inline call can land before the element exists, or after the next key
   * press, and a focus move that arrives late is worse than none.
   */
  const pendingFocusRef = useRef<"open" | "plan" | "close" | null>(null);

  // `useId` for the three field groups, so two panels on one page could never
  // share an id. No test targets these ids — everything is addressed by
  // data-testid or by accessible name.
  const uid = useId();
  const formTitleId = `${uid}-form-title`;
  const planTitleId = `${uid}-plan-title`;
  const goalName = `${uid}-goal`;
  const levelName = `${uid}-level`;
  const languagesNoteId = `${uid}-languages-note`;

  const plan = useMemo(
    () =>
      buildStartingPlan({
        goal,
        level,
        languages,
        layout,
        layoutConfirmed,
        // MOD-05 / LRN-01: a completed baseline beats the self-report, and the
        // plan names its basis so the two cannot be confused. Read once per
        // open, not per keystroke.
        measuredBand: readBaselineRecord()?.band ?? null,
      }),
    [goal, level, languages, layout, layoutConfirmed, baselineVersion],
  );

  /** Reopen from the collapsed summary, remembering who opened it. */
  const open = useCallback((opener: HTMLButtonElement) => {
    openerRef.current = opener;
    pendingFocusRef.current = "open";
    setView("form");
  }, []);

  /**
   * Produce the plan: persist the answers and show the plan, which takes the
   * panel's place. Focus goes to the plan itself rather than to the typing field —
   * the visitor pressed a button to see this, and moving focus somewhere else would
   * announce nothing at all about what they just got.
   */
  const finish = useCallback((record: OnboardingRecord) => {
    writeOnboardingRecord(record);
    pendingFocusRef.current = "plan";
    setView("summary");
  }, []);

  /**
   * Dismiss for good, recording why. A dismissal writes `skipped` and nothing
   * else: no half-answers, no implied goal. Either way the panel is gone from the
   * tree and the app is exactly as it would have been without OPS-01.
   */
  const dismiss = useCallback((record: OnboardingRecord) => {
    writeOnboardingRecord(record);
    pendingFocusRef.current = "close";
    setView("closed");
  }, []);

  // Focus follows the commit that changed the view — see the note on
  // pendingFocusRef. One effect for all three transitions, so none can drift.
  useEffect(() => {
    const why = pendingFocusRef.current;
    if (why === null) return;
    pendingFocusRef.current = null;

    if (why === "open") {
      panelRef.current?.focus();
      return;
    }
    if (why === "plan") {
      panelRef.current?.focus();
      return;
    }
    // Dismissed. The typing field is the one thing a visitor can usefully do next,
    // and #surface is the app's own documented anchor (the skip link points at it),
    // so this is a place in the document rather than a component's internals.
    const surface = document.getElementById("surface");
    if (surface instanceof HTMLElement) {
      surface.focus();
      return;
    }
    // No typing field in the tree (SSR, or a host rendering the panel alone):
    // back to the opener if it is still mounted, and never to <body>.
    openerRef.current?.focus();
  }, [view]);

  const toggleLanguage = useCallback((id: TrackLanguage) => {
    setLanguages((current) =>
      current.includes(id) ? current.filter((l) => l !== id) : [...current, id],
    );
  }, []);

  if (view === "closed") return null;

  const layoutName = COPY.layoutOptions[plan.layout.value];

  if (view === "summary") {
    return (
      <section
        className="onboarding onboarding-summary"
        ref={panelRef}
        tabIndex={-1}
        aria-labelledby={planTitleId}
        data-testid="onboarding-summary"
      >
        <h2 className="onboarding-title" id={planTitleId}>
          {COPY.onboarding.planTitle}
        </h2>

        {/*
          The emitted plan as a real definition list, so each label and its value
          are announced as a pair. Every row below is a field of the typed plan in
          ./plan.ts, placed as a string and derived as nothing: the component
          computes no value of its own.
        */}
        <dl className="onboarding-plan" data-testid="onboarding-plan">
          <div className="onboarding-plan-row">
            <dt>{COPY.onboarding.planRows.focus}</dt>
            <dd data-testid="onboarding-plan-focus">
              {COPY.onboarding.planFocus[plan.goal.id ?? "unsure"]}
            </dd>
          </div>
          <div className="onboarding-plan-row">
            <dt>{COPY.onboarding.planRows.content}</dt>
            <dd data-testid="onboarding-plan-content">
              {COPY.onboarding.planProseValue(COPY.onboarding.planBandNames[plan.content.band])}
            </dd>
          </div>
          <div className="onboarding-plan-row">
            <dt>{COPY.onboarding.planRows.level}</dt>
            <dd data-testid="onboarding-plan-level">
              {plan.level.selfReported === null
                ? COPY.onboarding.planLevelNone
                : COPY.onboarding.planSelfReported(
                    COPY.onboarding.levelOptions[plan.level.selfReported],
                  )}
            </dd>
          </div>
          <div className="onboarding-plan-row">
            <dt>{COPY.onboarding.planRows.layout}</dt>
            <dd data-testid="onboarding-plan-layout">
              {COPY.onboarding.planLayoutValue(
                layoutName,
                layoutConfirmed
                  ? COPY.onboarding.planLayoutSource.confirmed
                  : COPY.onboarding.planLayoutSource.guessed,
              )}
            </dd>
          </div>
          <div className="onboarding-plan-row">
            <dt>{COPY.onboarding.planRows.languages}</dt>
            <dd data-testid="onboarding-plan-languages">
              {plan.languages.selected.length === 0
                ? COPY.onboarding.planLanguagesNone
                : COPY.onboarding.planSelfReported(
                    plan.languages.selected
                      .map((id) => TRACK_LANGUAGES.find((l) => l.id === id)?.label ?? id)
                      .join(", "),
                  )}
            </dd>
          </div>
        </dl>

        {/*
          THE HONESTY PAYLOAD, and the reason this is not a results screen. Three
          sentences, in this order: what the plan is not (a measurement), what the
          band covers and does not (prose and quotes; code carries no band), and
          what is named as pending. CNT-02 deliberately scores prose and quotes
          only, so a plan that mentioned a difficulty band without saying so would
          read as if it covered code too.
        */}
        <p className="note" data-testid="onboarding-plan-provisional">
          {COPY.onboarding.planProvisional}
        </p>
        <p className="note" data-testid="onboarding-plan-band-note">
          {COPY.onboarding.planBandNote}
        </p>
        <p className="note" data-testid="onboarding-plan-languages-note">
          {COPY.onboarding.planLanguagesNote}
        </p>
        <p className="note" data-testid="onboarding-plan-pending">
          {COPY.onboarding.planPending}
        </p>

        <p className="onboarding-actions">
          <button
            type="button"
            data-testid="onboarding-plan-change"
            onClick={(event) => open(event.currentTarget)}
          >
            {COPY.onboarding.planChange}
          </button>
        </p>
      </section>
    );
  }

  return (
    <section
      className="onboarding"
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby={formTitleId}
      data-testid="onboarding"
      data-view="form"
    >
      <h2 className="onboarding-title" id={formTitleId}>
        {COPY.onboarding.title}
      </h2>
      <p className="onboarding-intro" data-testid="onboarding-intro">
        {COPY.onboarding.intro}
      </p>

      {/*
        SKIP IS FIRST IN THE TAB ORDER, ON PURPOSE. It is the first focusable
        element inside the panel, and the panel is the first thing in `main`, so
        the dismiss control is one Tab after the app's own skip link — reachable
        before any question is answered. It is a plain `type="button"`, so it can
        never be triggered by pressing Enter while a radio group has focus, and it
        sits ABOVE the form rather than after it, because a dismiss control that
        follows the primary action makes skipping read as the harder route.
      */}
      <p className="onboarding-actions">
        <button
          type="button"
          data-testid="onboarding-skip"
          onClick={() => dismiss(skippedRecord())}
        >
          {COPY.onboarding.skip}
        </button>
      </p>

      {/*
        A real <form>, so the layout is what a keyboard user expects and the
        submit button is a submit button. Nothing in it is `required`: there is no
        empty field that can block a test, and the plan is emitted either way.
      */}
      <form
        className="onboarding-form"
        onSubmit={(event) => {
          event.preventDefault();
          finish(plannedRecord({ goal, level, languages }));
        }}
      >
        <fieldset className="onboarding-group">
          <legend>{COPY.onboarding.goalPrompt}</legend>
          <div className="onboarding-options">
            {ONBOARDING_GOALS.map((id) => (
              <label className="onboarding-option" key={id} htmlFor={`${uid}-goal-${id}`}>
                <input
                  type="radio"
                  id={`${uid}-goal-${id}`}
                  name={goalName}
                  value={id}
                  data-testid={`onboarding-goal-${id}`}
                  checked={goal === id}
                  onChange={() => setGoal(id)}
                />
                <span>{COPY.onboarding.goalOptions[id]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="onboarding-group">
          <legend>{COPY.onboarding.levelPrompt}</legend>
          <div className="onboarding-options">
            {ONBOARDING_LEVELS.map((id) => (
              <label className="onboarding-option" key={id} htmlFor={`${uid}-level-${id}`}>
                <input
                  type="radio"
                  id={`${uid}-level-${id}`}
                  name={levelName}
                  value={id}
                  data-testid={`onboarding-level-${id}`}
                  checked={level === id}
                  onChange={() => setLevel(id)}
                />
                <span>{COPY.onboarding.levelOptions[id]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="onboarding-group" aria-describedby={languagesNoteId}>
          <legend>{COPY.onboarding.languagesPrompt}</legend>
          <div className="onboarding-options">
            {TRACK_LANGUAGES.map((language) => (
              <label
                className="onboarding-option"
                key={language.id}
                htmlFor={`${uid}-lang-${language.id}`}
              >
                <input
                  type="checkbox"
                  id={`${uid}-lang-${language.id}`}
                  data-testid={`onboarding-language-${language.id}`}
                  checked={languages.includes(language.id)}
                  onChange={() => toggleLanguage(language.id)}
                />
                <span>{language.label}</span>
              </label>
            ))}
          </div>
          <p className="note" id={languagesNoteId} data-testid="onboarding-languages-note">
            {COPY.onboarding.languagesNote}
          </p>
        </fieldset>

        {/*
          THE LAYOUT, STATED AND NOT ASKED. LOC-01 has already guessed it (or the
          visitor has already chosen it) and the override is always visible in
          Settings beside the typing field. Re-asking here would ask a question the
          app has already answered, and a second control for one setting is a
          second thing that can disagree with the first. So this is a sentence:
          what the app decided, whether that was a guess or a choice, and where to
          change it. There is no input in this panel for the layout at all.
        */}
        <p className="onboarding-layout" data-testid="onboarding-layout-note">
          <span className="onboarding-layout-label">{COPY.onboarding.layoutLabel}</span>{" "}
          {layoutConfirmed
            ? COPY.onboarding.layoutConfirmed(layoutName)
            : COPY.onboarding.layoutGuess(layoutName)}
        </p>

        <p className="onboarding-actions">
          <button type="submit" data-variant="primary" data-testid="onboarding-submit">
            {COPY.onboarding.submit}
          </button>
        </p>
      </form>
    </section>
  );
}
