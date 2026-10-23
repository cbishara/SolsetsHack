import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { About, Goals, Welcome } from '../../features/onboarding/steps-intro';
import { Questions, Rules } from '../../features/onboarding/steps-learning';
import { Done, Night, Permissions, Pilot } from '../../features/onboarding/steps-night';
import { Chats, Connect, Reading } from '../../features/onboarding/steps-sources';
import type { Draft, StepNav } from '../../features/onboarding/types';

// Onboarding: get context, connect sources, let Sol learn from the history,
// agree on rules and the night, then start the 5-night trial (shadow mode).
// One idea per screen; the optional ones can be skipped.
const STEPS = ['welcome', 'goals', 'about', 'connect', 'chats', 'reading', 'rules', 'questions', 'night', 'permissions', 'pilot', 'done'] as const;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({ goals: [], permissions: { notifications: false, call: false } });

  const next = () => setStep((n) => Math.min(n + 1, STEPS.length - 1));
  const back = step > 0 ? () => setStep((n) => Math.max(n - 1, 0)) : undefined;

  // Android back goes to the previous step instead of leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep((n) => n - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const nav: StepNav = { index: step, total: STEPS.length - 1, next, back, stepKey: STEPS[step] };

  switch (STEPS[step]) {
    case 'welcome': return <Welcome next={next} />;
    case 'goals': return <Goals nav={nav} draft={draft} setDraft={setDraft} />;
    case 'about': return <About nav={nav} draft={draft} />;
    case 'connect': return <Connect nav={nav} />;
    case 'chats': return <Chats nav={nav} />;
    case 'reading': return <Reading nav={nav} />;
    case 'rules': return <Rules nav={nav} />;
    case 'questions': return <Questions nav={nav} />;
    case 'night': return <Night nav={nav} draft={draft} />;
    case 'permissions': return <Permissions nav={nav} draft={draft} setDraft={setDraft} />;
    case 'pilot': return <Pilot nav={nav} />;
    case 'done': return <Done nav={nav} draft={draft} />;
  }
}
