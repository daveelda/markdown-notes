"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import DropdownMenu from "./dropdown-menu";
import type { NoteDraft } from "./note-types";

type NoteEditorProps = {
  draft: NoteDraft;
  editing: boolean;
  disabled: boolean;
  saveStatus: string;
  error: string;
  onDraftChange: (draft: NoteDraft) => void;
  onSave: (formData: FormData) => void;
  onCancel: () => void;
};

type HistoryEntry = Pick<NoteDraft, "title" | "body" | "tags">;

const toolbarButtonClass =
  "min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

const formatMenuItemClass =
  "flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default function NoteEditor({
  draft,
  editing,
  disabled,
  saveStatus,
  error,
  onDraftChange,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);

  const historyRef = useRef<{
    undo: HistoryEntry[];
    redo: HistoryEntry[];
    lastAt: number;
    lastKind: string;
  }>({ undo: [], redo: [], lastAt: 0, lastKind: "" });
  const [historyFlags, setHistoryFlags] = useState({
    canUndo: false,
    canRedo: false,
  });

  function refreshHistoryFlags() {
    setHistoryFlags({
      canUndo: historyRef.current.undo.length > 0,
      canRedo: historyRef.current.redo.length > 0,
    });
  }

  function recordChange(kind: string, force = false) {
    const history = historyRef.current;
    const now = Date.now();
    if (force || kind !== history.lastKind || now - history.lastAt > 700) {
      history.undo.push({
        title: draftRef.current.title,
        body: draftRef.current.body,
        tags: draftRef.current.tags,
      });
      if (history.undo.length > 100) {
        history.undo.shift();
      }
    }
    history.redo = [];
    history.lastAt = now;
    history.lastKind = kind;
    refreshHistoryFlags();
  }

  function applyDraft(nextDraft: NoteDraft, kind: string, forceHistory = false) {
    recordChange(kind, forceHistory);
    draftRef.current = nextDraft;
    onDraftChange(nextDraft);
  }

  function handleUndo() {
    const history = historyRef.current;
    const previous = history.undo.pop();
    if (!previous) {
      return;
    }
    history.redo.push({
      title: draftRef.current.title,
      body: draftRef.current.body,
      tags: draftRef.current.tags,
    });
    const restored = { id: draftRef.current.id, ...previous };
    draftRef.current = restored;
    onDraftChange(restored);
    history.lastAt = 0;
    history.lastKind = "";
    refreshHistoryFlags();
  }

  function handleRedo() {
    const history = historyRef.current;
    const next = history.redo.pop();
    if (!next) {
      return;
    }
    history.undo.push({
      title: draftRef.current.title,
      body: draftRef.current.body,
      tags: draftRef.current.tags,
    });
    const restored = { id: draftRef.current.id, ...next };
    draftRef.current = restored;
    onDraftChange(restored);
    history.lastAt = 0;
    history.lastKind = "";
    refreshHistoryFlags();
  }

  function handleShortcut(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
      return false;
    }
    if (
      (event.shiftKey && historyRef.current.redo.length === 0) ||
      (!event.shiftKey && historyRef.current.undo.length === 0)
    ) {
      return false;
    }
    event.preventDefault();
    if (event.shiftKey) {
      handleRedo();
    } else {
      handleUndo();
    }
    return true;
  }

  function updateField(field: "title" | "body" | "tags", value: string) {
    applyDraft({ ...draftRef.current, [field]: value }, field);
  }

  function replaceBodySelection(
    transform: (
      selected: string,
      selectionStart: number,
      selectionEnd: number,
      value: string,
    ) => {
      replacement: string;
      from?: number;
      to?: number;
      selectionStart: number;
      selectionEnd: number;
    },
    action: string,
  ) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    const selected = textarea.value.slice(selectionStart, selectionEnd);
    const result = transform(selected, selectionStart, selectionEnd, textarea.value);
    const from = result.from ?? selectionStart;
    const to = result.to ?? selectionEnd;
    const nextBody =
      textarea.value.slice(0, from) +
      result.replacement +
      textarea.value.slice(to);
    applyDraft({ ...draftRef.current, body: nextBody }, action, true);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        from + result.selectionStart,
        from + result.selectionEnd,
      );
    });
  }

  function wrapSelection(
    before: string,
    after: string,
    placeholder: string,
    action: string,
  ) {
    replaceBodySelection((selected) => {
      const content = selected || placeholder;
      return {
        replacement: `${before}${content}${after}`,
        selectionStart: before.length,
        selectionEnd: before.length + content.length,
      };
    }, action);
  }

  function prefixLines(prefix: string, action: string, numbered = false) {
    replaceBodySelection((_, selectionStart, selectionEnd, value) => {
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const lineBreak = value.indexOf("\n", selectionEnd);
      const lineEnd = lineBreak === -1 ? value.length : lineBreak;
      const block = value.slice(lineStart, lineEnd);
      const lines = block.split("\n");
      let counter = 1;
      const transformed = lines
        .map((line) => {
          if (numbered) {
            return `${counter++}. ${line}`;
          }
          return `${prefix}${line}`;
        })
        .join("\n");
      const selectedStartInBlock = selectionStart - lineStart;
      const selectionHasText = selectionStart !== selectionEnd;
      const currentLineIndex = block
        .slice(0, selectedStartInBlock)
        .split("\n").length - 1;
      const prefixLengthBeforeCursor = numbered
        ? 3 * currentLineIndex +
          (currentLineIndex * (currentLineIndex - 1)) / 2
        : currentLineIndex * prefix.length;
      const currentLinePrefixLength = numbered
        ? `${currentLineIndex + 1}. `.length
        : prefix.length;
      return {
        replacement: transformed,
        from: lineStart,
        to: lineEnd,
        selectionStart: selectionHasText
          ? 0
          : selectedStartInBlock +
            prefixLengthBeforeCursor +
            currentLinePrefixLength,
        selectionEnd: selectionHasText
          ? transformed.length
          : selectedStartInBlock +
            prefixLengthBeforeCursor +
            currentLinePrefixLength,
      };
    }, action);
  }

  function handleBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (handleShortcut(event)) {
      return;
    }
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    if (selectionStart !== selectionEnd) {
      return;
    }

    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEndIndex = value.indexOf("\n", selectionEnd);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const currentLine = value.slice(lineStart, lineEnd);
    const listItem = currentLine.match(/^([ \t]*)(?:(\d+)\.\s+|-\s+)(.*)$/);
    if (!listItem) {
      return;
    }

    event.preventDefault();
    const [, indentation, number, itemContent] = listItem;
    recordChange("body");
    if (!itemContent.trim()) {
      textarea.setRangeText(`${indentation}\n`, lineStart, lineEnd, "end");
    } else {
      const nextMarker = number ? `${Number(number) + 1}. ` : "- ";
      textarea.setRangeText(
        `\n${indentation}${nextMarker}`,
        selectionStart,
        selectionEnd,
        "end",
      );
    }
    const nextDraft = { ...draftRef.current, body: textarea.value };
    draftRef.current = nextDraft;
    onDraftChange(nextDraft);
    refreshHistoryFlags();
  }

  const { canUndo, canRedo } = historyFlags;

  return (
    <form
      className="min-w-0 space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave(new FormData(event.currentTarget));
      }}
    >
      <fieldset
        className="min-w-0 space-y-5 border-0 p-0"
        disabled={disabled}
      >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          {editing ? "Edit note" : "New note"}
        </h2>
        {(saveStatus === "Saving..." || saveStatus === "Saved") && (
          <p
            aria-live="polite"
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            {saveStatus}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          htmlFor="title"
        >
          Title
        </label>
        <input
          className="min-h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          id="title"
          name="title"
          onChange={(event) => updateField("title", event.target.value)}
          onKeyDown={handleShortcut}
          type="text"
          value={draft.title}
        />
      </div>

      <div className="space-y-3">
        <label
          className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          htmlFor="body"
        >
          Body (Markdown supported)
        </label>
        <div aria-label="Markdown formatting" className="flex flex-wrap gap-2">
          <button
            aria-label="Bold"
            className={toolbarButtonClass}
            onClick={() => wrapSelection("**", "**", "bold text", "bold")}
            type="button"
          >
            <strong>B</strong>
          </button>
          <button
            aria-label="Italic"
            className={toolbarButtonClass}
            onClick={() => wrapSelection("*", "*", "italic text", "italic")}
            type="button"
          >
            <em>I</em>
          </button>
          <button
            aria-label="Heading"
            className={toolbarButtonClass}
            onClick={() => prefixLines("## ", "heading")}
            type="button"
          >
            H
          </button>
          <button
            aria-label="Numbered list"
            className={toolbarButtonClass}
            onClick={() => prefixLines("", "numbered-list", true)}
            type="button"
          >
            1.
          </button>
          <button
            aria-label="Bulleted list"
            className={toolbarButtonClass}
            onClick={() => prefixLines("- ", "bullet-list")}
            type="button"
          >
            •
          </button>
          <button
            aria-label="Link"
            className={toolbarButtonClass}
            onClick={() =>
              wrapSelection("[", "](https://)", "link text", "link")
            }
            type="button"
          >
            Link
          </button>
          <DropdownMenu
            label="More formatting options"
            trigger={
              <>
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <circle cx="4" cy="10" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="16" cy="10" r="1.5" />
                </svg>
                <span>More</span>
              </>
            }
            triggerClassName={`${toolbarButtonClass} inline-flex items-center gap-1.5`}
          >
            {(close) => (
              <>
                <button
                  className={formatMenuItemClass}
                  onClick={() => {
                    wrapSelection(
                      "++",
                      "++",
                      "underlined text",
                      "underline",
                    );
                    close();
                  }}
                  role="menuitem"
                  title="Stored as ++underlined text++"
                  type="button"
                >
                  <u>Underline</u>
                </button>
                <button
                  className={formatMenuItemClass}
                  onClick={() => {
                    prefixLines("> ", "blockquote");
                    close();
                  }}
                  role="menuitem"
                  type="button"
                >
                  Blockquote
                </button>
              </>
            )}
          </DropdownMenu>
          <button
            aria-label="Undo"
            className={toolbarButtonClass}
            disabled={!canUndo}
            onClick={handleUndo}
            type="button"
          >
            Undo
          </button>
          <button
            aria-label="Redo"
            className={toolbarButtonClass}
            disabled={!canRedo}
            onClick={handleRedo}
            type="button"
          >
            Redo
          </button>
        </div>
        <textarea
          className="min-h-48 w-full min-w-0 resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          id="body"
          name="body"
          onChange={(event) => updateField("body", event.target.value)}
          onKeyDown={handleBodyKeyDown}
          ref={textareaRef}
          rows={8}
          value={draft.body}
        />
      </div>

      <div className="space-y-2">
        <label
          className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          htmlFor="tags"
        >
          Tags
        </label>
        <input
          className="min-h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          id="tags"
          name="tags"
          onChange={(event) => updateField("tags", event.target.value)}
          onKeyDown={handleShortcut}
          placeholder="ideas, project, personal"
          type="text"
          value={draft.tags}
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Separate tags with commas.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 sm:w-auto"
          type="submit"
        >
          {editing ? "Save Changes" : "Save Note"}
        </button>
        {(editing ||
          draft.title.trim() ||
          draft.body.trim() ||
          draft.tags.trim()) && (
          <button
            className={toolbarButtonClass}
            onClick={onCancel}
            type="button"
          >
            {editing ? "Cancel" : "Discard Draft"}
          </button>
        )}
      </div>
      </fieldset>
    </form>
  );
}
