'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

const ScheduleCalendarWrapper = forwardRef(function ScheduleCalendarWrapper(
  { events, onDateClick, onEventClick },
  ref
) {
  const calendarRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getApi: () => calendarRef.current?.getApi(),
  }));

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      initialView="dayGridMonth"
      headerToolbar={false}
      events={events}
      timeZone="UTC"
      editable={false}
      selectable={true}
      selectMirror={false}
      dayMaxEvents={3}
      dateClick={onDateClick}
      eventClick={onEventClick}
      slotMinTime="06:00:00"
      slotMaxTime="23:00:00"
      allDaySlot={true}
      slotDuration="00:30:00"
      slotLabelInterval="01:00:00"
      expandRows={true}
      height="auto"
      contentHeight={620}
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
  );
});

export default ScheduleCalendarWrapper;
