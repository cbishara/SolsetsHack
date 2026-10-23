import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Dialog({ title, children, onClose }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const keyboard = e => {
      if (e.key === 'Escape') close.current();
      if (e.key !== 'Tab') return;
      const nodes = [...ref.current.querySelectorAll('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]')];
      const first = nodes[0], last = nodes.at(-1);
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, []);
  return <div className="sol-modal-backdrop" onClick={onClose}><section className="sol-modal" ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={e => e.stopPropagation()}><button className="sol-modal-close" aria-label="Cerrar ventana" onClick={onClose}><X size={22}/></button>{children}</section></div>;
}
