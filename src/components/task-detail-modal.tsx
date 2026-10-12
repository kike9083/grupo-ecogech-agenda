import type { Task } from '@/lib/appwrite/tasks';
import {
  CALENDAR_TASK_MODAL_CLOSE_LABEL,
  CALENDAR_TASK_MODAL_LABEL,
  buildCalendarHref,
} from '@/lib/calendar';
import { sanitizeNoteHtml } from '@/lib/rich-text';
import {
  formatCreatedAt,
  formatCreatedBy,
  statusLabel,
  typeLabel,
} from '@/lib/task-view';
import { ModalShell } from '@/components/modal-shell';
import { NoteForm } from '@/components/note-form';
import { StatusControls } from '@/components/status-controls';
import { TaskForm } from '@/components/task-form';

/**
 * Calendar detail modal (spec `calendar-view` → "Task detail modal"): the
 * record opened by `?task=<id>`. It shows the record's metadata and the
 * matching edit form — `TaskForm` for tasks/requests/events, `NoteForm` for
 * notes, exactly like `/editar` — plus the status transitions.
 *
 * The form is seeded with the same values the edit route uses and posts a
 * `returnTo` back to this calendar, so a save closes the modal and refreshes
 * the grid instead of jumping to the home list.
 */
export function TaskDetailModal({
  task,
  monthKey,
}: {
  task: Task;
  /** Canonical `YYYY-MM` of the displayed month — the modal closes back here. */
  monthKey: string;
}) {
  const closeHref = buildCalendarHref({ month: monthKey, day: task.date });
  // `closeHref` always carries month and day, so `&` is safe here.
  const returnTo = `${closeHref}&updated=1`;
  const isNote = task.type === 'note';

  return (
    <ModalShell
      closeHref={closeHref}
      label={CALENDAR_TASK_MODAL_LABEL}
      closeLabel={CALENDAR_TASK_MODAL_CLOSE_LABEL}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-accent">{typeLabel(task.type)}</span>
          <span
            className={
              'badge ' +
              (task.status === 'done'
                ? 'badge-done'
                : task.status === 'cancelled'
                  ? 'badge-cancelled'
                  : 'badge-pending')
            }
          >
            {statusLabel(task.status)}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="meta">{formatCreatedBy(task.createdByEmail)}</span>
          <span className="meta">{formatCreatedAt(task.$createdAt)}</span>
        </div>

        {isNote ? (
          <NoteForm
            recordId={task.$id}
            createdBy={task.createdBy}
            initial={{
              title: task.title,
              date: task.date,
              bodyHtml: sanitizeNoteHtml(task.bodyHtml ?? ''),
            }}
            cancelHref={closeHref}
            returnTo={returnTo}
          />
        ) : (
          <TaskForm
            recordId={task.$id}
            createdBy={task.createdBy}
            initial={{
              type: task.type,
              title: task.title,
              description: task.description,
              date: task.date,
              time: task.time,
            }}
            cancelHref={closeHref}
            returnTo={returnTo}
          />
        )}

        {isNote ? null : (
          <StatusControls
            task={{
              $id: task.$id,
              status: task.status,
              createdBy: task.createdBy,
            }}
          />
        )}
      </div>
    </ModalShell>
  );
}
