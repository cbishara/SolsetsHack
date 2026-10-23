import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Landing from './Landing.jsx';
import Dashboard from './Dashboard.jsx';
import './styles.css';

function routeFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return { dashboard: ['/app', '/demo'].includes(window.location.pathname) || params.has('connected'), localOnly: window.location.pathname === '/demo', persona: params.get('caso') || 'rodrigo', prompt: '' };
}
function App() {
  const [route, setRoute] = useState(routeFromLocation);
  useEffect(() => {
    const pop = () => { setRoute(routeFromLocation()); window.scrollTo(0, 0); };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => { document.title = route.dashboard ? 'Mi espacio · SOL by Solsets' : 'Solsets · Menos en tu cabeza. Más vida.'; }, [route.dashboard]);
  function start(options = {}) {
    if (!Object.keys(options).length) { window.location.assign('/app'); return; }
    const { persona = 'rodrigo', prompt = '' } = options;
    window.history.pushState({}, '', `/demo?caso=${encodeURIComponent(persona)}`);
    setRoute({ dashboard: true, localOnly: true, persona, prompt });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function home() { window.history.pushState({}, '', '/'); setRoute({ dashboard: false, persona: 'rodrigo', prompt: '' }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  return route.dashboard ? <Dashboard key={`${route.localOnly}-${route.persona}`} initialPersona={route.persona} initialPrompt={route.prompt} localOnly={route.localOnly} onHome={home}/> : <Landing onStart={start}/>;
}
createRoot(document.getElementById('root')).render(<App/>);
