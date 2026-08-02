"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ChevronDownIcon, CloseIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useTaskStore } from "@/stores/task.store";
import type { Task } from "@/types/task";

export interface TaskPanelProps {
  open: boolean;
  onClose: () => void;
}

interface TaskTreeNode {
  task: Task;
  children: TaskTreeNode[];
}

/** Groups the flat repository list into a parent/child tree, siblings ordered by `position`. */
function buildTaskTree(tasks: readonly Task[]): TaskTreeNode[] {
  const byParent = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const bucket = byParent.get(task.parentId) ?? [];
    bucket.push(task);
    byParent.set(task.parentId, bucket);
  }
  for (const bucket of byParent.values()) bucket.sort((a, b) => a.position - b.position);

  function build(parentId: string | null): TaskTreeNode[] {
    return (byParent.get(parentId) ?? []).map((task) => ({ task, children: build(task.id) }));
  }

  return build(null);
}

/**
 * `TaskPanel` -- task CRUD, ordering, hierarchy, selection (doc
 * 05_Frontend_Specification.pdf section 4; Phase 4 scope: wired to the real
 * `tasks` IndexedDB store via `stores/task.store.ts`, replacing the Phase 3
 * local-demo-state placeholder). Rendered as a bottom sheet on mobile /
 * right-hand drawer on wider viewports (`Dialog`'s `placement="end"`).
 *
 * Selection is the same task the running/next focus session attaches to
 * (`hooks/useTimerEngine.ts` reads `useTaskStore.getState().selectedTaskId`
 * at completion time) -- break time never touches a task's focus total
 * (completeFocusSession.ts only credits `taskId` for `type === "focus"`).
 */
export function TaskPanel({ open, onClose }: TaskPanelProps) {
  const titleId = useId();
  const inputId = useId();

  const tasks = useTaskStore((state) => state.tasks);
  const hasLoaded = useTaskStore((state) => state.hasLoaded);
  const selectedTaskId = useTaskStore((state) => state.selectedTaskId);
  const loadTasks = useTaskStore((state) => state.loadTasks);
  const addTask = useTaskStore((state) => state.addTask);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const selectTask = useTaskStore((state) => state.selectTask);
  const reorderTask = useTaskStore((state) => state.reorderTask);

  const [draftTitle, setDraftTitle] = useState("");
  const [subtaskParentId, setSubtaskParentId] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");

  useEffect(() => {
    if (!hasLoaded) void loadTasks();
  }, [hasLoaded, loadTasks]);

  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;
    void addTask({ title });
    setDraftTitle("");
  }

  function handleAddSubtask(event: FormEvent<HTMLFormElement>, parentId: string) {
    event.preventDefault();
    const title = subtaskTitle.trim();
    if (!title) return;
    void addTask({ title, parentId });
    setSubtaskTitle("");
    setSubtaskParentId(null);
  }

  function renderNode(node: TaskTreeNode, depth: number, siblingIndex: number, siblingCount: number) {
    const { task } = node;
    const selected = task.id === selectedTaskId;

    return (
      <li key={task.id} className="flex flex-col gap-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2",
            selected ? "border-focus" : "border-border"
          )}
          style={{ marginLeft: `${depth * 1.25}rem` }}
        >
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => void toggleComplete(task.id)}
            aria-label={`Mark "${task.title}" ${task.completed ? "incomplete" : "complete"}`}
            className="control size-5 shrink-0"
          />
          <button
            type="button"
            onClick={() => selectTask(selected ? null : task.id)}
            aria-pressed={selected}
            className={cn(
              "flex-1 text-left text-sm",
              task.completed ? "text-text-secondary line-through" : "text-text-primary",
              selected && "font-semibold"
            )}
          >
            {task.title}
            {/* Leading space is a real text node, not just visual `ml-2` margin --
                without it the button's accessible name concatenates to
                "{title}Selected" with no word boundary for screen readers. */}
            {selected ? <span className="ml-2 text-xs font-semibold text-focus"> Selected</span> : null}
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => void reorderTask(task.id, "up")}
              disabled={siblingIndex === 0}
              aria-label={`Move "${task.title}" up`}
              className="control text-text-secondary hover:text-text-primary disabled:opacity-30"
            >
              <ChevronDownIcon className="size-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => void reorderTask(task.id, "down")}
              disabled={siblingIndex === siblingCount - 1}
              aria-label={`Move "${task.title}" down`}
              className="control text-text-secondary hover:text-text-primary disabled:opacity-30"
            >
              <ChevronDownIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setSubtaskParentId(subtaskParentId === task.id ? null : task.id)}
              aria-label={`Add subtask under "${task.title}"`}
              aria-pressed={subtaskParentId === task.id}
              className="control text-text-secondary hover:text-text-primary"
            >
              <PlusIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => void deleteTask(task.id)}
              aria-label={`Delete "${task.title}"`}
              className="control text-text-secondary hover:text-danger"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        </div>

        {subtaskParentId === task.id ? (
          <form
            onSubmit={(event) => handleAddSubtask(event, task.id)}
            className="flex gap-2"
            style={{ marginLeft: `${(depth + 1) * 1.25}rem` }}
          >
            <label htmlFor={`${inputId}-sub-${task.id}`} className="sr-only">
              New subtask title
            </label>
            <input
              id={`${inputId}-sub-${task.id}`}
              autoFocus
              value={subtaskTitle}
              onChange={(event) => setSubtaskTitle(event.target.value)}
              placeholder="Add a subtask"
              className="control flex-1 rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            />
            <Button type="submit" variant="secondary" size="sm">
              Add
            </Button>
          </form>
        ) : null}

        {node.children.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {node.children.map((child, index) => renderNode(child, depth + 1, index, node.children.length))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} placement="end">
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="text-lg font-semibold text-text-primary">
          Tasks
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close tasks">
          <CloseIcon className="size-5" />
        </Button>
      </div>

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          New task title
        </label>
        <input
          id={inputId}
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          placeholder="Add a task"
          className="control flex-1 rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        />
        <Button type="submit" variant="secondary" size="sm">
          Add
        </Button>
      </form>

      <ul className="mt-4 flex flex-col gap-2">
        {hasLoaded && tree.length === 0 ? <p className="text-sm text-text-secondary">No tasks yet.</p> : null}
        {tree.map((node, index) => renderNode(node, 0, index, tree.length))}
      </ul>
    </Dialog>
  );
}
