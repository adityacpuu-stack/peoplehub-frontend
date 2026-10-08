import { t, useLocale } from '@/i18n';
import { useEffect, useLayoutEffect, useId, useRef, type ReactNode, type PointerEvent } from 'react';

type Pan = { id: number; x: number; y: number; left: number; top: number; dragging: boolean };

/** Drag to pan, wheel to zoom; touch and keyboard scrolling stay native. */
export function OrgChartCanvas({ children, zoom, onZoomChange }: { children: ReactNode; zoom: number; onZoomChange: (zoom: number) => void }) {
  useLocale();
  const canvas = useRef<HTMLDivElement>(null);
  const pan = useRef<Pan | null>(null);
  const suppressClick = useRef(false);
  const zoomAnchor = useRef<{ left: number; top: number } | null>(null);
  const hintId = useId();

  const stop = () => {
    const element = canvas.current, gesture = pan.current;
    pan.current = null;
    if (!element) return;
    delete element.dataset.panning;
    if (gesture && element.hasPointerCapture(gesture.id)) element.releasePointerCapture(gesture.id);
  };

  useEffect(() => {
    window.addEventListener('blur', stop);
    return () => window.removeEventListener('blur', stop);
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      // Native listener is explicitly non-passive: only the chart owns this wheel gesture.
      event.preventDefault();
      stop();
      const next = Math.max(50, Math.min(150, zoom + (event.deltaY < 0 ? 10 : -10)));
      if (next === zoom) return;
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const x = event.clientX - bounds.left - element.clientLeft - parseFloat(style.paddingLeft);
      const y = event.clientY - bounds.top - element.clientTop - parseFloat(style.paddingTop);
      zoomAnchor.current = { left: (element.scrollLeft + x) * next / zoom - x, top: (element.scrollTop + y) * next / zoom - y };
      onZoomChange(next);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoom, onZoomChange]);

  useLayoutEffect(() => {
    if (canvas.current && zoomAnchor.current) {
      canvas.current.scrollLeft = zoomAnchor.current.left;
      canvas.current.scrollTop = zoomAnchor.current.top;
      zoomAnchor.current = null;
    }
  }, [zoom]);

  const start = (event: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return;
    const element = event.currentTarget;
    pan.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
      left: element.scrollLeft, top: element.scrollTop, dragging: false };
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = pan.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    if (!(event.buttons & 1)) { stop(); return; }
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.dragging && Math.hypot(dx, dy) < 5) return;
    if (!gesture.dragging) {
      gesture.dragging = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.panning = 'true';
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = gesture.left - dx;
    event.currentTarget.scrollTop = gesture.top - dy;
  };

  return <>
    <p className="org-pan-hint" id={hintId}>{t("Tarik untuk menggeser · Scroll untuk zoom · Klik kartu untuk detail")}</p>
    <div ref={canvas} className="org-canvas" tabIndex={0} role="region" aria-label={t("Scrollable organization chart")} aria-describedby={hintId}
      onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
      onPointerLeave={() => { if (!pan.current?.dragging) stop(); }}
      onDragStart={event => event.preventDefault()}
      onClickCapture={event => {
        // A completed drag must not open the employee underneath its release point.
        // Keyboard activation has detail=0 and remains available.
        if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
      }}>
      {children}
    </div>
  </>;
}
