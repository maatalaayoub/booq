'use client';

import { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

const EDGE_SIZE = 60; // px from left/right edge to trigger auto-scroll
const SCROLL_INTERVAL = 800; // ms between each day shift while at edge

const FullCalendarWrapper = forwardRef(function FullCalendarWrapper(
  { events, onEventClick, onDateClick, onSelect, onEventDrop, onEventResize, onDatesSet },
  ref
) {
  const calendarRef = useRef(null);
  const containerRef = useRef(null);
  const dragNavRef = useRef({
    active: false,
    interval: null,
    direction: 0,     // -1 = left, 0 = none, 1 = right
    cleanup: null,
  });

  useImperativeHandle(ref, () => ({
    getApi: () => calendarRef.current?.getApi(),
  }));

  // Start / stop the repeating day-shift interval
  const setEdgeDirection = useCallback((dir) => {
    const ref_ = dragNavRef.current;
    if (ref_.direction === dir) return; // already scrolling this way
    ref_.direction = dir;

    // Clear any running interval
    if (ref_.interval) { clearInterval(ref_.interval); ref_.interval = null; }

    if (dir === 0) return; // stopped — nothing to start

    // Shift immediately, then keep shifting every SCROLL_INTERVAL ms
    const api = calendarRef.current?.getApi();
    if (api) api.incrementDate({ days: dir });

    ref_.interval = setInterval(() => {
      if (!ref_.active) { clearInterval(ref_.interval); ref_.interval = null; return; }
      const api2 = calendarRef.current?.getApi();
      if (api2) api2.incrementDate({ days: dir });
    }, SCROLL_INTERVAL);
  }, []);

  // ── Auto-navigate when dragging near left/right edges ──
  const handleDragStart = useCallback(() => {
    dragNavRef.current.active = true;
    dragNavRef.current.direction = 0;

    const onPointerMove = (e) => {
      if (!dragNavRef.current.active) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (clientX > rect.right - EDGE_SIZE) {
        setEdgeDirection(1);
      } else if (clientX < rect.left + EDGE_SIZE) {
        setEdgeDirection(-1);
      } else {
        setEdgeDirection(0);
      }
    };

    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('touchmove', onPointerMove, { passive: true });
    dragNavRef.current.cleanup = () => {
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('touchmove', onPointerMove);
    };
  }, [setEdgeDirection]);

  const handleDragStop = useCallback(() => {
    dragNavRef.current.active = false;
    setEdgeDirection(0);
    dragNavRef.current.cleanup?.();
    dragNavRef.current.cleanup = null;
  }, [setEdgeDirection]);

  // ── Touch scroll-lock for long-press drags ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timer = null;
    let isDragging = false;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length > 1) return; // ignore multi-touch
      
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      timer = setTimeout(() => {
        // After 400ms (matchingFC delay), lock scrolling
        isDragging = true;
      }, 400); 
    };

    const handleTouchMove = (e) => {
      if (!isDragging) {
        if (!e.touches.length) return;
        // Check if user is scrolling before 400ms
        const touch = e.touches[0];
        const moveX = Math.abs(touch.clientX - touchStartX);
        const moveY = Math.abs(touch.clientY - touchStartY);

        // If moved more than 8px, it's a swipe/scroll. Cancel the drag lock.
        if (moveX > 8 || moveY > 8) {
          clearTimeout(timer);
        }
      } else {
        // We are confirmed to be dragging (long press achieved).
        // Block browser scrolling so dragging is smooth.
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      clearTimeout(timer);
      isDragging = false;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      clearTimeout(timer);
    };
  }, []);

  // Custom event rendering to show "modified by client" indicator
  const renderEventContent = useCallback((eventInfo) => {
    const { rescheduled_by } = eventInfo.event.extendedProps || {};
    return (
      <div className="fc-event-main-inner" style={{ overflow: 'hidden', height: '100%' }}>
        <div className="fc-event-time">{eventInfo.timeText}</div>
        <div className="fc-event-title">{eventInfo.event.title}</div>
        {rescheduled_by === 'client' && (
          <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />
            Modified by client
          </div>
        )}
      </div>
    );
  }, []);

  return (
    <div ref={containerRef}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        events={events}
        timeZone="UTC"
        editable={true}
        droppable={true}
        selectable={true}
        selectMirror={true}
        longPressDelay={400}
        selectLongPressDelay={400}
        eventLongPressDelay={400}
        dayMaxEvents={3}
        eventClick={onEventClick}
        dateClick={onDateClick}
        select={onSelect}
        eventDrop={onEventDrop}
        eventResize={onEventResize}
        datesSet={onDatesSet}
        eventDragStart={handleDragStart}
        eventDragStop={handleDragStop}
        eventContent={renderEventContent}
        slotMinTime="08:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        expandRows={true}
        height="auto"
        contentHeight={600}
        nowIndicator={true}
        eventDisplay="block"
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        dayHeaderFormat={{
          weekday: 'short',
          day: 'numeric',
        }}
      />
    </div>
  );
});

export default FullCalendarWrapper;
