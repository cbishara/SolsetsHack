import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Plus } from 'lucide-react';
import ArrowField from './ArrowField.jsx';
import './landing.css';

const people = [
  { id: 'rodrigo', name: 'Rodrigo', role: 'Guardias, tickets y vida fuera del turno', caption: 'Un registro preparado. Un relevo por confirmar. Cada cosa en su lugar.', prompt: 'Terminé mi turno y necesito dejar un ticket de la VPN preparado. Sigue pendiente confirmar el relevo.' },
  { id: 'profesor', name: 'Para quien enseña', role: 'Cursos, clases y próximos pasos', caption: 'Tus cursos ordenados y la próxima clase con un punto de partida.', prompt: 'Soy profesor de matemáticas. Necesito organizar mis cursos y preparar la próxima clase de ecuaciones.' },
  { id: 'coach', name: 'Para quien acompaña', role: 'Alumnos, sesiones y seguimiento', caption: 'Un lugar para preparar sesiones y dar continuidad a cada alumno.', prompt: 'Soy coach de un gimnasio. Necesito ordenar mis alumnos y preparar el seguimiento de las próximas sesiones.' },
  { id: 'personal', name: 'Para tu día a día', role: 'Familia, planes y eso que no se te puede olvidar', caption: 'Lo que tienes dando vueltas en la cabeza, convertido en un siguiente paso.', prompt: 'Tengo varios pendientes personales para mañana y no sé por dónde empezar. Ayúdame a ordenarlos.' },
];

const workflows = [
  { id: 'ticket', category: 'Trabajo', title: 'De una incidencia a un registro preparado', subtitle: 'Deja contexto para el siguiente turno.', body: 'Cuéntale a SOL qué pasó y qué alcanzaste a hacer. Te ayuda a preparar el registro y separa lo que ya hiciste de lo que sigue pendiente.', result: 'Un borrador que puedes revisar y corregir.', persona: 'rodrigo', prompt: people[0].prompt },
  { id: 'relevo', category: 'Trabajo', title: 'Terminar el turno sin perder el hilo', subtitle: 'Un cierre que distingue lo hecho de lo que falta.', body: 'Reúne los pendientes del turno en un resumen claro. Si el relevo no está confirmado, sigue visible como algo que necesita tu atención.', result: 'Un cierre con responsables y próximos pasos por confirmar.', persona: 'rodrigo', prompt: 'Necesito preparar mi cierre de turno. Hay una incidencia abierta y todavía no he confirmado quién recibe el relevo.' },
  { id: 'cursos', category: 'Cursos', title: 'Cada curso con su próximo paso', subtitle: 'Organiza clases, material y tareas en un mismo contexto.', body: 'Empieza con un curso y una clase. SOL te ayuda a dar estructura a tus notas y preparar un plan que luego puedes ajustar a tus estudiantes.', result: 'Un plan de clase preparado para revisar.', persona: 'profesor', prompt: people[1].prompt },
  { id: 'alumnos', category: 'Alumnos', title: 'Acompañar a tus alumnos, sin perderte en mensajes', subtitle: 'Prepara el seguimiento de tus próximas sesiones.', body: 'Dile qué necesitas revisar y con quién. Conserva el contexto relevante y prepara el siguiente contacto; tú revisas cualquier mensaje antes de enviarlo.', result: 'Un seguimiento organizado y un borrador de mensaje.', persona: 'coach', prompt: people[2].prompt },
  { id: 'manana', category: 'Vida', title: 'Mañana empieza con una cosa menos en la cabeza', subtitle: 'Dale lugar a eso que te preocupa olvidar.', body: 'No necesitas llegar con una lista perfecta. Escribe una preocupación y conviértela en un pendiente con un siguiente paso concreto.', result: 'Un plan pequeño, claro y editable.', persona: 'personal', prompt: 'Mañana tengo que comprar algunas cosas y organizar mis horarios. Me preocupa olvidarme. Ayúdame a preparar un plan.' },
  { id: 'empezar', category: 'Vida', title: 'No saber por dónde empezar también es un comienzo', subtitle: 'Con una frase basta.', body: 'SOL te ayuda a acotar una preocupación. No hace falta explicar toda tu vida ni conectar todas tus cuentas para preparar la primera ayuda.', result: 'Una primera acción que puedes llevarte de aquí.', persona: 'personal', prompt: 'No sé por dónde empezar. Tengo varios pendientes y quiero ordenar solo uno primero.' },
];

const faqs = [
  { question: '¿Tengo que configurar todo antes de empezar?', answer: 'No. Empieza con un pendiente, escrito con tus palabras. SOL prepara una primera ayuda y solo te pide el dato que haga falta para avanzar. Puedes explorar la demostración sin conectar ninguna cuenta.' },
  { question: '¿Qué hace diferente a SOL de un chat de IA?', answer: 'La experiencia está organizada alrededor de tus pendientes: contexto que puedes corregir, borradores que puedes retomar y estados que distinguen lo preparado de lo resuelto. La idea es que no tengas que diseñar y mantener ese sistema por tu cuenta.' },
  { question: '¿SOL hace cosas sin preguntarme?', answer: 'Preparar y ordenar no equivale a enviar o ejecutar. Las acciones externas dependen de una conexión disponible y de tus permisos. Puedes revisar las propuestas, cambiar tus límites o pausar el asistente desde tu espacio.' },
  { question: '¿Esto ya funciona para cualquier profesión?', answer: 'La demostración incluye recorridos de guardias, docencia, coaching y vida personal. Son ejemplos para explorar el mismo núcleo de trabajo. Cada integración y proceso real requiere validar sus datos, permisos y alcance; no prometemos automatizar cualquier sistema.' },
];

function Wordmark() {
  return <span className="lp-wordmark">solsets<svg viewBox="0 0 37 32" aria-hidden="true"><path d="M3 27c16 0 24-9 27-22M20 6l11-2 1 11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
}

export default function Landing({ onStart }) {
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState('Todos');
  const [expanded, setExpanded] = useState(null);
  const [faq, setFaq] = useState(null);
  const [persona, setPersona] = useState('rodrigo');
  const [prompt, setPrompt] = useState('');
  const categories = ['Todos', 'Trabajo', 'Cursos', 'Alumnos', 'Vida'];
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > Math.min(window.innerHeight * .62, 520));
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  function choosePerson(person) {
    setPersona(person.id);
    setPrompt(person.prompt);
    document.getElementById('empezar')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <div className="landing">
    <a className="lp-skip" href="#como-funciona">Ir al contenido</a>
    <header className={`lp-header ${scrolled ? 'lp-header-scrolled' : ''}`}>
      <a href="#inicio" aria-label="Solsets, inicio"><Wordmark/></a>
      <span className="lp-header-tagline">Tu vida. Un poco más ligera.</span>
      <div className="lp-header-actions"><button className="lp-login" onClick={() => onStart({})}>Mi espacio <ArrowUpRight size={15}/></button><a className="lp-button lp-yellow" href="#empezar">Empieza con SOL</a></div>
    </header>

    <section className="lp-hero" id="inicio" aria-labelledby="lp-hero-title">
      <ArrowField variant="hero" className="lp-arrow-field"/>
      <div className="lp-hero-content"><span className="lp-hero-kicker">UN ASISTENTE PARA TODO ESO QUE LLEVAS CONTIGO</span><h1 id="lp-hero-title">Suelta.</h1><p>Menos en tu cabeza.<br/>Más vida fuera de la pantalla.</p></div>
      <a className="lp-hero-discover" href="#como-funciona">Conoce a SOL <ArrowDown size={17}/></a>
    </section>

    <main className="lp-main">
      <section className="lp-section lp-benefits" id="como-funciona" aria-labelledby="lp-benefits-title">
        <div className="lp-section-intro"><span className="lp-kicker">DEJA DE LLEVARLO TODO TÚ</span><h2 id="lp-benefits-title">Una cosa menos.<br/>Un poco más de vida.</h2><p>Un ticket que falta. Una clase por preparar. Un alumno al que dar seguimiento. Cuéntaselo a SOL: te ayuda a ordenarlo, preparar el siguiente paso y retomarlo sin empezar de cero.</p></div>
        <div className="lp-benefit-grid">
          <article><span className="lp-symbol lp-symbol-arrow" aria-hidden="true">↗</span><h3>Empieza como hablas</h3><p>Sin aprender comandos ni escribir el prompt perfecto. Una preocupación es suficiente.</p></article>
          <article><span className="lp-symbol lp-symbol-circle" aria-hidden="true"/><h3>El contexto se queda</h3><p>Retoma lo que dejaste preparado. Revisa y corrige lo que SOL usa para ayudarte.</p></article>
          <article><span className="lp-symbol lp-symbol-plus" aria-hidden="true">+</span><h3>Tú pones los límites</h3><p>Sabes qué está preparado, qué falta y qué necesita tu decisión. Cada paso, a la vista.</p></article>
        </div>
      </section>

      <section className="lp-statement lp-section" aria-label="Nuestra propuesta"><p>Ya tienes suficiente que hacer.<br/><span>No necesitas otro sistema<br className="lp-desktop-break"/> que aprender a construir.</span><br/>Necesitas uno que empiece contigo.</p></section>

      <section className="lp-section lp-workflows" id="posibilidades" aria-labelledby="lp-workflows-title">
        <div className="lp-section-intro"><span className="lp-kicker">DE LA PREOCUPACIÓN AL PRÓXIMO PASO</span><h2 id="lp-workflows-title">Así empieza a sentirse más fácil.</h2><p>Una misma forma de ayudarte, distintos momentos de tu vida. Explora un ejemplo y llévalo a tu espacio.</p></div>
        <div className="lp-filter-bar" aria-label="Filtrar ejemplos">{categories.map(category => <button key={category} className={filter === category ? 'lp-filter-active' : ''} aria-pressed={filter === category} onClick={() => { setFilter(category); setExpanded(null); }}>{category}<span>{category === 'Todos' ? workflows.length : workflows.filter(w => w.category === category).length}</span></button>)}</div>
        <div className="lp-workflow-list">{workflows.filter(w => filter === 'Todos' || w.category === filter).map(w => <article className={`lp-workflow ${expanded === w.id ? 'lp-workflow-open' : ''}`} key={w.id}>
          <button className="lp-workflow-toggle" aria-expanded={expanded === w.id} aria-controls={`workflow-${w.id}`} onClick={() => setExpanded(expanded === w.id ? null : w.id)}><span className="lp-workflow-number">{String(workflows.indexOf(w) + 1).padStart(2, '0')}<small>Con SOL</small></span><span className="lp-workflow-name"><strong>{w.title}</strong><small>{w.subtitle}</small></span><span className="lp-category">{w.category}</span><ChevronDown className="lp-chevron" size={21}/></button>
          {expanded === w.id && <div className="lp-workflow-detail" id={`workflow-${w.id}`}><p>{w.body}</p><div><span><Check size={17}/>{w.result}</span><button className="lp-text-link" onClick={() => onStart({ persona: w.persona, prompt: w.prompt })}>Probar este ejemplo <ArrowUpRight size={18}/></button></div></div>}
        </article>)}</div>
        <p className="lp-disclosure">Ejemplos de demostración. Las acciones externas requieren una conexión disponible y tus permisos.</p>
      </section>

      <section className="lp-section lp-people" id="para-ti" aria-labelledby="lp-people-title">
        <div className="lp-section-intro"><span className="lp-kicker">DISTINTAS VIDAS. UN MISMO RESPIRO.</span><h2 id="lp-people-title">Hay un lugar para tu día.</h2><p>Tu contexto cambia. La forma de empezar sigue siendo simple.<br/>Elige un ejemplo para conocer a SOL desde tu mundo.</p></div>
        <div className="lp-people-grid">{people.map((person, index) => <button className="lp-person" key={person.id} onClick={() => choosePerson(person)} aria-label={`Explorar ${person.name}: ${person.role}`}><span className="lp-person-portrait"><ArrowField variant="portrait" persona={index} className="lp-arrow-field"/><span className="lp-person-index">0{index + 1} / SOL</span><span className="lp-person-tip">{person.caption}<ArrowUpRight size={20}/></span></span><span className="lp-person-name">{person.name}<ArrowUpRight size={20}/></span><span className="lp-person-role">{person.role}</span></button>)}</div>
        <p className="lp-disclosure">Casos ilustrativos con datos ficticios; no son testimonios.</p>
      </section>

      <section className="lp-section lp-faq" id="preguntas" aria-labelledby="lp-faq-title"><div><span className="lp-kicker">SIN LETRA PEQUEÑA</span><h2 id="lp-faq-title">Antes de<br/>soltar.</h2><p>Lo importante,<br/>con claridad.</p></div><div className="lp-faq-list">{faqs.map((item, i) => <article key={item.question}><button aria-expanded={faq === i} aria-controls={`faq-${i}`} onClick={() => setFaq(faq === i ? null : i)}><span>{item.question}</span><Plus size={23} className={faq === i ? 'lp-faq-expanded' : ''}/></button>{faq === i && <p id={`faq-${i}`}>{item.answer}</p>}</article>)}</div></section>
    </main>

    <section className="lp-start" id="empezar" aria-labelledby="lp-start-title"><ArrowField variant="panel" className="lp-arrow-field"/><div className="lp-start-copy"><span className="lp-kicker">NO HACE FALTA ORDENAR TODA TU VIDA HOY</span><h2 id="lp-start-title">Empieza<br/>por una cosa.</h2><p>SOL te ayuda con el primer paso.<br/>Lo demás lo vamos viendo.</p><div className="lp-start-points"><span><Check size={17}/> Sin conectar cuentas para empezar</span><span><Check size={17}/> Tú revisas lo que se prepara</span><span><Check size={17}/> Puedes salir y retomar después</span></div></div><form className="lp-start-form" onSubmit={e => { e.preventDefault(); onStart({ persona, prompt: prompt.trim() || people.find(person => person.id === persona).prompt }); }}><div className="lp-form-heading"><span className="lp-sol-mark" aria-hidden="true">↗</span><div><strong>Hola, soy SOL.</strong><p>Vamos de a una cosa.</p></div></div><label htmlFor="lp-persona">¿Por dónde empezamos?</label><div className="lp-select-wrap"><select id="lp-persona" value={persona} onChange={e => setPersona(e.target.value)}><option value="rodrigo">Mi trabajo y mis turnos</option><option value="profesor">Mis cursos y mis clases</option><option value="coach">Mis alumnos y sus sesiones</option><option value="personal">Mi vida fuera del trabajo</option></select><ChevronDown size={20}/></div><label htmlFor="lp-prompt">¿Qué te gustaría dejar encaminado?</label><textarea id="lp-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Cuéntamelo con tus palabras. No hace falta tenerlo claro del todo." maxLength={4000} rows={4}/><button className="lp-button lp-yellow" type="submit">Preparar mi primer paso <ArrowUpRight size={21}/></button><button type="button" className="lp-unsure" onClick={() => onStart({ persona: 'personal', prompt: 'No sé por dónde empezar. Ayúdame a elegir un primer pendiente.' })}>No sé por dónde empezar <ArrowRight size={16}/></button><p className="lp-form-note">Explorarás una demostración con datos ficticios.<br/>No se enviarán mensajes ni se harán cambios externos.</p></form></section>

    <footer className="lp-footer"><div className="lp-footer-top"><a href="#inicio" aria-label="Solsets, volver al inicio"><Wordmark/></a><nav aria-label="Navegación del pie"><a href="#como-funciona">Cómo funciona</a><a href="#para-ti">Para ti</a><a href="#preguntas">Preguntas</a><button onClick={() => onStart({})}>Mi espacio <ArrowUpRight size={15}/></button></nav></div><p>© 2026 Solsets. Menos pendientes. Más espacio para ti.</p><div className="lp-footer-word" aria-hidden="true">Suelta.</div></footer>
  </div>;
}
