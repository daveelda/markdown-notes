"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkNote } from "./actions";
import DropdownMenu from "./dropdown-menu";
import MarkdownNoteBody from "./markdown-note-body";
import NoteEditor from "./note-editor";
import {
  NOTE_COLORS,
  createDraft,
  createEmptyDraft,
  createNoteId,
  parseStoredNotes,
  upsertNote,
  type Note,
  type NoteColor,
  type NoteDraft,
} from "./note-types";

type Theme = "light" | "dark" | "system";
type NotesView = "active" | "archive";

const NOTES_STORAGE_KEY = "markdown-notes";
const THEME_STORAGE_KEY = "markdown-notes-theme";
const RECOVERY_DRAFT_STORAGE_KEY = "markdown-notes-recovery-draft";

type RecoveryDraft = {
  draft: NoteDraft;
  editingNoteId: string | null;
  savedAt: number;
};

const colorStyles: Record<NoteColor, string> = {
  default: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
  lavender: "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950",
  mint: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950",
  peach: "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950",
  sky: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950",
  rose: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950",
};

const buttonClass =
  "min-h-11 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

const menuItemClass =
  "flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-200 dark:hover:bg-zinc-800";

const colorSwatchStyles: Record<NoteColor, string> = {
  default: "bg-white ring-1 ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-600",
  lavender: "bg-violet-300 dark:bg-violet-700",
  mint: "bg-emerald-300 dark:bg-emerald-700",
  peach: "bg-orange-300 dark:bg-orange-700",
  sky: "bg-sky-300 dark:bg-sky-700",
  rose: "bg-rose-300 dark:bg-rose-700",
};

function NoteActionsMenu({
  note,
  view,
  onUpdate,
  onDelete,
}: {
  note: Note;
  view: NotesView;
  onUpdate: (update: (note: Note) => Note) => void;
  onDelete: () => void;
}) {
  const [showColors, setShowColors] = useState(false);
  const colorOptionsRef = useRef<HTMLDivElement>(null);
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setShowColors(false);
    }
  }, []);

  useEffect(() => {
    if (showColors) {
      colorOptionsRef.current
        ?.querySelector<HTMLElement>('[role="menuitemradio"]')
        ?.focus();
    }
  }, [showColors]);

  return (
    <DropdownMenu
      label={`Actions for ${note.title}`}
      onOpenChange={handleOpenChange}
      trigger={
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <circle cx="4" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="16" cy="10" r="1.6" />
        </svg>
      }
      triggerClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
    >
      {(close) =>
        showColors ? (
          <div aria-label="Note colors" ref={colorOptionsRef} role="group">
            <button
              className={menuItemClass}
              onClick={() => setShowColors(false)}
              role="menuitem"
              type="button"
            >
              <span aria-hidden="true" className="mr-2">
                ←
              </span>
              Back to actions
            </button>
            <div className="grid grid-cols-3 gap-2 p-2">
              {NOTE_COLORS.map((color) => (
                <button
                  aria-checked={note.color === color}
                  aria-label={
                    color === "default"
                      ? "Default color"
                      : `${color[0].toUpperCase()}${color.slice(1)} color`
                  }
                  className={`flex h-11 items-center justify-center rounded-lg border border-zinc-200 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:hover:bg-zinc-800 ${
                    note.color === color
                      ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-zinc-900"
                      : ""
                  }`}
                  key={color}
                  onClick={() => {
                    onUpdate((current) => ({ ...current, color }));
                    close();
                  }}
                  role="menuitemradio"
                  title={
                    color === "default"
                      ? "Default"
                      : `${color[0].toUpperCase()}${color.slice(1)}`
                  }
                  type="button"
                >
                  <span
                    className={`h-5 w-5 rounded-full ${colorSwatchStyles[color]}`}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <button
              aria-checked={note.pinned}
              className={menuItemClass}
              onClick={() => {
                onUpdate((current) => ({
                  ...current,
                  pinned: !current.pinned,
                }));
                close();
              }}
              role="menuitemcheckbox"
              type="button"
            >
              {note.pinned ? "Unpin note" : "Pin note"}
            </button>
            <button
              className={menuItemClass}
              onClick={() => {
                onUpdate((current) => ({
                  ...current,
                  archived: view === "active",
                }));
                close();
              }}
              role="menuitem"
              type="button"
            >
              {view === "active" ? "Archive note" : "Restore note"}
            </button>
            <button
              aria-expanded={showColors}
              className={menuItemClass}
              onClick={() => setShowColors(true)}
              role="menuitem"
              type="button"
            >
              <span className="mr-3">Change color</span>
              <span
                aria-hidden="true"
                className={`h-4 w-4 rounded-full ${colorSwatchStyles[note.color]}`}
              />
            </button>
            <div
              className="my-1 border-t border-zinc-100 dark:border-zinc-800"
              role="separator"
            />
            <button
              className={`${menuItemClass} text-red-700 hover:bg-red-50 focus-visible:ring-red-500 dark:text-red-300 dark:hover:bg-red-950`}
              onClick={() => {
                onDelete();
                close();
              }}
              role="menuitem"
              type="button"
            >
              {view === "active" ? "Delete note" : "Delete permanently"}
            </button>
          </>
        )
      }
    </DropdownMenu>
  );
}

function sameDraftValues(left: NoteDraft, right: NoteDraft): boolean {
  return (
    left.id === right.id &&
    left.title === right.title &&
    left.body === right.body &&
    left.tags === right.tags
  );
}

function parseRecoveryDraft(serialized: string): RecoveryDraft {
  const parsed: unknown = JSON.parse(serialized);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof parsed !== "object" ||
    !("draft" in parsed) ||
    typeof parsed.draft !== "object" ||
    parsed.draft === null ||
    !("title" in parsed.draft) ||
    typeof parsed.draft.title !== "string" ||
    !("body" in parsed.draft) ||
    typeof parsed.draft.body !== "string" ||
    !("tags" in parsed.draft) ||
    typeof parsed.draft.tags !== "string" ||
    !("id" in parsed.draft) ||
    !(typeof parsed.draft.id === "string" || parsed.draft.id === null) ||
    !("editingNoteId" in parsed) ||
    !(
      typeof parsed.editingNoteId === "string" ||
      parsed.editingNoteId === null
    ) ||
    !("savedAt" in parsed) ||
    typeof parsed.savedAt !== "number"
  ) {
    throw new Error("The saved recovery draft has an invalid format.");
  }

  return {
    draft: {
      id: parsed.draft.id,
      title: parsed.draft.title,
      body: parsed.draft.body,
      tags: parsed.draft.tags,
    },
    editingNoteId: parsed.editingNoteId,
    savedAt: parsed.savedAt,
  };
}

function hasDraftContent(draft: NoteDraft): boolean {
  return Boolean(
    draft.title.trim() || draft.body.trim() || draft.tags.trim(),
  );
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesStorageReady, setNotesStorageReady] = useState(false);
  const [draft, setDraft] = useState<NoteDraft>(createEmptyDraft);
  const [editOriginal, setEditOriginal] = useState<Note | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<RecoveryDraft | null>(
    null,
  );
  const [recoveryDraftLoaded, setRecoveryDraftLoaded] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<NotesView>("active");
  const [theme, setTheme] = useState<Theme>("system");
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [saveStatus, setSaveStatus] = useState("Ready");

  const notesRef = useRef(notes);
  const draftRef = useRef(draft);
  const notesLoadedRef = useRef(notesLoaded);
  const notesStorageReadyRef = useRef(notesStorageReady);
  const editingNoteIdRef = useRef<string | null>(null);
  const recoveryDraftRef = useRef(recoveryDraft);
  const recoveryDraftLoadedRef = useRef(recoveryDraftLoaded);

  useEffect(() => {
    notesRef.current = notes;
    draftRef.current = draft;
    notesLoadedRef.current = notesLoaded;
    notesStorageReadyRef.current = notesStorageReady;
    recoveryDraftRef.current = recoveryDraft;
    recoveryDraftLoadedRef.current = recoveryDraftLoaded;
  }, [
    draft,
    notes,
    notesLoaded,
    notesStorageReady,
    recoveryDraft,
    recoveryDraftLoaded,
  ]);

  const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visibleNotes = notes.filter((note) => {
    const matchesView = note.archived === (view === "archive");
    const matchesTag =
      activeTag === null ||
      note.tags.some((tag) => tag.trim().toLowerCase() === activeTag);
    const searchableText = `${note.title} ${note.body}`.toLowerCase();
    const matchesSearch = searchTerms.every((term) =>
      searchableText.includes(term),
    );
    return matchesView && matchesTag && matchesSearch;
  });
  const pinnedNotes =
    view === "active" ? visibleNotes.filter((note) => note.pinned) : [];
  const regularNotes =
    view === "active"
      ? visibleNotes.filter((note) => !note.pinned)
      : visibleNotes;

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }

      try {
        const savedNotes = window.localStorage.getItem(NOTES_STORAGE_KEY);
        if (savedNotes !== null) {
          setNotes(parseStoredNotes(savedNotes));
        }
        setNotesLoaded(true);
        setNotesStorageReady(true);
      } catch {
        setStorageError(
          "Unable to load saved notes. Your browser storage may be unavailable or contain invalid data.",
        );
        setNotesLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }

      try {
        const savedDraft = window.localStorage.getItem(
          RECOVERY_DRAFT_STORAGE_KEY,
        );
        if (savedDraft !== null) {
          setRecoveryDraft(parseRecoveryDraft(savedDraft));
        }
      } catch {
        setStorageError("Unable to load your recovery draft from this browser.");
      } finally {
        setRecoveryDraftLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notesLoaded || !notesStorageReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          NOTES_STORAGE_KEY,
          JSON.stringify(notesRef.current),
        );
        setStorageError("");
        setSaveStatus((status) => (status === "Saving..." ? "Saved" : status));
      } catch {
        setStorageError("Unable to save notes to this browser.");
        setSaveStatus("Could not save");
      }
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [notes, notesLoaded, notesStorageReady]);

  useEffect(() => {
    if (!notesLoaded || !recoveryDraftLoaded || recoveryDraft) {
      return;
    }

    const editingNoteId = editingNoteIdRef.current;
    if (!editingNoteId && !hasDraftContent(draft)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        const nextRecoveryDraft: RecoveryDraft = {
          draft: { ...draftRef.current },
          editingNoteId: editingNoteIdRef.current,
          savedAt: Date.now(),
        };
        window.localStorage.setItem(
          RECOVERY_DRAFT_STORAGE_KEY,
          JSON.stringify(nextRecoveryDraft),
        );
        setStorageError("");
        setSaveStatus("Saved");
      } catch {
        setStorageError("Unable to save your recovery draft to this browser.");
        setSaveStatus("Could not save");
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft, notesLoaded, recoveryDraft, recoveryDraftLoaded]);

  useEffect(() => {
    const flushStorage = () => {
      try {
        if (notesLoadedRef.current && notesStorageReadyRef.current) {
          window.localStorage.setItem(
            NOTES_STORAGE_KEY,
            JSON.stringify(notesRef.current),
          );
        }

        if (!recoveryDraftLoadedRef.current || recoveryDraftRef.current) {
          return;
        }

        const latestDraft = draftRef.current;
        const editingNoteId = editingNoteIdRef.current;
        if (!editingNoteId && !hasDraftContent(latestDraft)) {
          return;
        }
        window.localStorage.setItem(
          RECOVERY_DRAFT_STORAGE_KEY,
          JSON.stringify({
            draft: latestDraft,
            editingNoteId,
            savedAt: Date.now(),
          } satisfies RecoveryDraft),
        );
      } catch {
        setStorageError("Unable to save your work to this browser.");
      }
    };

    window.addEventListener("pagehide", flushStorage);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushStorage();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      flushStorage();
      window.removeEventListener("pagehide", flushStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }
      try {
        const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (
          savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "system"
        ) {
          setTheme(savedTheme);
        }
      } catch {
        setStorageError("Unable to load the saved theme preference.");
      } finally {
        setThemeLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!themeLoaded) {
      return;
    }
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const isDark =
        theme === "dark" || (theme === "system" && mediaQuery.matches);
      root.classList.toggle("dark", isDark);
      root.dataset.theme = theme;
    };
    applyTheme();

    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme();
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        setStorageError("Unable to save the theme preference.");
      }
    });

    return () => {
      cancelled = true;
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme, themeLoaded]);

  function updateDraft(nextDraft: NoteDraft) {
    if (
      nextDraft.id === null &&
      (nextDraft.title.trim() || nextDraft.body.trim() || nextDraft.tags.trim())
    ) {
      nextDraft = { ...nextDraft, id: createNoteId() };
    }
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveStatus(hasDraftContent(nextDraft) ? "Saving..." : "Ready");
    setError("");
  }

  function handleEdit(note: Note) {
    if (!recoveryDraftLoadedRef.current) {
      return;
    }
    if (recoveryDraftRef.current) {
      setError("Resume or discard the unfinished draft before opening another note.");
      return;
    }

    const noteDraft = createDraft(note);
    setDraft(noteDraft);
    draftRef.current = noteDraft;
    editingNoteIdRef.current = note.id;
    setEditOriginal(note);
    setEditorSession((session) => session + 1);
    setSaveStatus("Saving...");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearRecoveryDraft() {
    recoveryDraftRef.current = null;
    setRecoveryDraft(null);
    try {
      window.localStorage.removeItem(RECOVERY_DRAFT_STORAGE_KEY);
      setStorageError("");
    } catch {
      setStorageError("Unable to remove the recovery draft from this browser.");
    }
  }

  function resumeRecoveryDraft() {
    if (!recoveryDraft) {
      return;
    }

    const savedDraft = recoveryDraft.draft;
    draftRef.current = savedDraft;
    setDraft(savedDraft);
    editingNoteIdRef.current = recoveryDraft.editingNoteId;
    setEditOriginal(
      recoveryDraft.editingNoteId
        ? notesRef.current.find(
            ({ id }) => id === recoveryDraft.editingNoteId,
          ) ?? null
        : null,
    );
    recoveryDraftRef.current = null;
    setRecoveryDraft(null);
    setEditorSession((session) => session + 1);
    setSaveStatus("Saved");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetEditor() {
    const emptyDraft = createEmptyDraft();
    draftRef.current = emptyDraft;
    setDraft(emptyDraft);
    editingNoteIdRef.current = null;
    setEditOriginal(null);
    setEditorSession((session) => session + 1);
    setError("");
    setSaveStatus("Ready");
  }

  function handleCancel() {
    const hasChanges = editOriginal
      ? !sameDraftValues(draft, createDraft(editOriginal))
      : hasDraftContent(draft);
    if (
      hasChanges &&
      !window.confirm("Discard this unfinished draft? This cannot be undone.")
    ) {
      return;
    }

    clearRecoveryDraft();
    resetEditor();
  }

  function removeNote(noteId: string) {
    const updatedNotes = notesRef.current.filter(({ id }) => id !== noteId);
    notesRef.current = updatedNotes;
    setNotes(updatedNotes);
    setSaveStatus(notesStorageReadyRef.current ? "Saving..." : "Could not save");

    if (editingNoteIdRef.current === noteId) {
      clearRecoveryDraft();
      resetEditor();
    }
  }

  async function saveDraft(
    submittedDraft: NoteDraft,
    editingNoteId: string | null,
    requireCurrentDraft: boolean,
  ) {
    setError("");
    if (!notesLoadedRef.current) {
      setError("Saved notes are still loading. Please try again.");
      return false;
    }

    try {
      const formData = new FormData();
      formData.set("title", submittedDraft.title);
      formData.set("body", submittedDraft.body);
      formData.set("tags", submittedDraft.tags);
      const result = await checkNote(formData);
      if ("error" in result) {
        setError(result.error);
        return false;
      }

      if (
        requireCurrentDraft &&
        (!sameDraftValues(draftRef.current, submittedDraft) ||
          editingNoteIdRef.current !== editingNoteId)
      ) {
        return false;
      }

      const id = editingNoteId ?? submittedDraft.id ?? createNoteId();
      const existing = notesRef.current.find((note) => note.id === id);
      if (editingNoteId && !existing) {
        setError(
          "The note this draft was editing no longer exists. Discard this draft or create a new note.",
        );
        return false;
      }

      const note: Note = {
        ...result.note,
        id,
        pinned: existing?.pinned ?? false,
        archived: existing?.archived ?? false,
        color: existing?.color ?? "default",
      };
      const updatedNotes = upsertNote(notesRef.current, note);
      notesRef.current = updatedNotes;
      setNotes(updatedNotes);
      clearRecoveryDraft();
      resetEditor();
      setSaveStatus(notesStorageReadyRef.current ? "Saving..." : "Could not save");
      return true;
    } catch {
      setError("Unable to save your note. Please try again.");
      return false;
    }
  }

  function handleSave(_formData: FormData) {
    const submittedDraft = {
      ...draftRef.current,
      title: String(_formData.get("title") ?? ""),
      body: String(_formData.get("body") ?? ""),
      tags: String(_formData.get("tags") ?? ""),
    };
    void saveDraft(
      submittedDraft,
      editingNoteIdRef.current,
      true,
    );
  }

  function saveRecoveredDraft() {
    if (!recoveryDraft) {
      return;
    }

    resumeRecoveryDraft();
    void saveDraft(
      { ...recoveryDraft.draft },
      recoveryDraft.editingNoteId,
      true,
    );
  }

  function discardRecoveredDraft() {
    if (
      !window.confirm("Discard this recovered draft? This cannot be undone.")
    ) {
      return;
    }

    clearRecoveryDraft();
    setSaveStatus("Ready");
  }

  function updateNote(noteId: string, update: (note: Note) => Note) {
    const updatedNotes = notesRef.current.map((note) =>
      note.id === noteId ? update(note) : note,
    );
    notesRef.current = updatedNotes;
    setNotes(updatedNotes);
    setSaveStatus(
      notesStorageReadyRef.current ? "Saving..." : "Could not save",
    );
  }

  const activeNotesExist = notes.some((note) => !note.archived);
  const archivedNotesExist = notes.some((note) => note.archived);
  const tags = [
    ...new Set(
      notes.flatMap((note) =>
        note.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const editing = editOriginal !== null;
  const recoveredNote =
    recoveryDraft?.editingNoteId === null
      ? null
      : notes.find(({ id }) => id === recoveryDraft?.editingNoteId) ?? null;

  function renderNote(note: Note) {
    return (
      <li
        className={`min-w-0 cursor-pointer space-y-4 rounded-2xl border p-4 text-zinc-800 transition-shadow hover:shadow-md dark:text-zinc-100 sm:p-5 ${colorStyles[note.color]}`}
        onClick={(event) => {
          if (
            (event.target instanceof Element &&
              event.target.closest("button, a, input, select")) ||
            window.getSelection()?.toString()
          ) {
            return;
          }
          handleEdit(note);
        }}
        key={note.id}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-lg font-semibold [overflow-wrap:anywhere]">
            <button
              aria-label={`Open ${note.title} for editing`}
              className="rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => handleEdit(note)}
              type="button"
            >
              {note.title}
            </button>
          </h3>
          <NoteActionsMenu
            note={note}
            onDelete={() => removeNote(note.id)}
            onUpdate={(update) => updateNote(note.id, update)}
            view={view}
          />
        </div>
        <MarkdownNoteBody body={note.body} />
        {note.tags.length > 0 && (
          <ul aria-label="Tags" className="flex flex-wrap gap-2">
            {note.tags.map((tag, index) => {
              const normalizedTag = tag.trim().toLowerCase();
              return (
                <li key={`${note.id}-tag-${index}`}>
                  <button
                    aria-pressed={activeTag === normalizedTag}
                    className={`min-h-11 max-w-full rounded-full px-3 py-2 text-xs font-medium [overflow-wrap:anywhere] ${
                      activeTag === normalizedTag
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTag(normalizedTag);
                    }}
                    type="button"
                  >
                    {tag}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <main className="min-h-screen w-full bg-zinc-50 px-3 py-6 font-sans dark:bg-zinc-950 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Markdown Notes
            </p>
            <h1 className="break-words text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
              Your notes
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Write, organize, and find your ideas.
            </p>
          </div>
          <DropdownMenu
            label={`Theme options, current theme ${theme}`}
            trigger={
              <>
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path
                    d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Theme</span>
              </>
            }
            triggerClassName="flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {(close) =>
              (["light", "dark", "system"] as const).map((option) => (
                <button
                  aria-checked={theme === option}
                  className={menuItemClass}
                  key={option}
                  onClick={() => {
                    setTheme(option);
                    close();
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  <span className="flex-1">
                    {option === "system"
                      ? "System"
                      : `${option[0].toUpperCase()}${option.slice(1)} Mode`}
                  </span>
                  {theme === option && (
                    <span aria-hidden="true" className="text-indigo-600 dark:text-indigo-400">
                      ✓
                    </span>
                  )}
                </button>
              ))
            }
          </DropdownMenu>
        </header>

        {recoveryDraft && (
          <section
            aria-labelledby="recovery-draft-heading"
            className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/60 sm:p-5"
          >
            <div className="space-y-1">
              <h2
                className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
                id="recovery-draft-heading"
              >
                Unfinished draft found
              </h2>
              <p className="break-words text-sm text-zinc-700 dark:text-zinc-300 [overflow-wrap:anywhere]">
                {recoveryDraft.editingNoteId
                  ? `Draft changes for “${recoveredNote?.title ?? (recoveryDraft.draft.title || "an existing note")}”. The saved note is unchanged. Resume, save, or discard it before opening another note.`
                  : recoveryDraft.draft.title.trim() ||
                    recoveryDraft.draft.body.trim() ||
                    recoveryDraft.draft.tags.trim()
                    ? `“${recoveryDraft.draft.title.trim() || "Untitled note"}” is saved separately and has not been added to your notes.`
                    : "A new note draft is saved separately and has not been added to your notes."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                onClick={resumeRecoveryDraft}
                type="button"
              >
                Resume Draft
              </button>
              <button
                className={buttonClass}
                disabled={
                  !recoveryDraft.draft.title.trim() ||
                  !recoveryDraft.draft.body.trim()
                }
                onClick={saveRecoveredDraft}
                type="button"
              >
                Save Draft
              </button>
              <button
                className={buttonClass}
                onClick={discardRecoveredDraft}
                type="button"
              >
                Discard Draft
              </button>
            </div>
          </section>
        )}

        <NoteEditor
          draft={draft}
          disabled={
            !notesLoaded || !recoveryDraftLoaded || recoveryDraft !== null
          }
          editing={editing}
          error={error}
          key={editorSession}
          onCancel={handleCancel}
          onDraftChange={updateDraft}
          onSave={handleSave}
          saveStatus={
            !notesLoaded || !recoveryDraftLoaded
              ? "Loading saved notes..."
              : saveStatus
          }
        />
        {storageError && (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {storageError}
          </p>
        )}

        <section aria-labelledby="notes-heading" className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2
              className="text-xl font-semibold text-zinc-950 dark:text-zinc-50"
              id="notes-heading"
            >
              Notes
            </h2>
            <label
              className="block w-full space-y-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:max-w-sm"
              htmlFor="note-search"
            >
              Search notes
              <input
                className="min-h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                id="note-search"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search titles and note bodies"
                type="search"
                value={searchQuery}
              />
            </label>
          </div>

          <div aria-label="Notes view" className="flex flex-wrap gap-2">
            <button
              aria-pressed={view === "active"}
              className={`${buttonClass} ${view === "active" ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500 dark:border-indigo-500 dark:bg-indigo-600 dark:text-white" : ""}`}
              onClick={() => setView("active")}
              type="button"
            >
              Active{activeNotesExist ? ` (${notes.filter((note) => !note.archived).length})` : ""}
            </button>
            <button
              aria-pressed={view === "archive"}
              className={`${buttonClass} ${view === "archive" ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500 dark:border-indigo-500 dark:bg-indigo-600 dark:text-white" : ""}`}
              onClick={() => setView("archive")}
              type="button"
            >
              Archive{archivedNotesExist ? ` (${notes.filter((note) => note.archived).length})` : ""}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Filter by tag
            </p>
            <div aria-label="Filter notes by tag" className="flex flex-wrap gap-2">
              <button
                aria-pressed={activeTag === null}
                className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium ${
                  activeTag === null
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
                onClick={() => setActiveTag(null)}
                type="button"
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  aria-pressed={activeTag === tag}
                  className={`min-h-11 max-w-full rounded-full px-3 py-2 text-sm font-medium [overflow-wrap:anywhere] ${
                    activeTag === tag
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800"
                  }`}
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  type="button"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {!notesLoaded ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              Loading saved notes...
            </p>
          ) : visibleNotes.length === 0 &&
            notes.length === 0 &&
            !searchTerms.length &&
            activeTag === null ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              Your saved notes will appear here.
            </p>
          ) : visibleNotes.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              No notes match.
            </p>
          ) : (
            <div className="space-y-7">
              {pinnedNotes.length > 0 && (
                <section aria-labelledby="pinned-heading" className="space-y-3">
                  <h3
                    className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
                    id="pinned-heading"
                  >
                    Pinned
                  </h3>
                  <ul className="space-y-4">{pinnedNotes.map(renderNote)}</ul>
                </section>
              )}
              {regularNotes.length > 0 && (
                <section
                  aria-labelledby={
                    view === "archive" ? "archived-heading" : "active-heading"
                  }
                  className="space-y-3"
                >
                  <h3
                    className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
                    id={view === "archive" ? "archived-heading" : "active-heading"}
                  >
                    {view === "archive" ? "Archived" : pinnedNotes.length ? "Other notes" : "All notes"}
                  </h3>
                  <ul className="space-y-4">{regularNotes.map(renderNote)}</ul>
                </section>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
