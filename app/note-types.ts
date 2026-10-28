export type NoteColor =
  | "default"
  | "lavender"
  | "mint"
  | "peach"
  | "sky"
  | "rose";

export type Note = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  color: NoteColor;
};

export type NoteDraft = {
  id: string | null;
  title: string;
  body: string;
  tags: string;
};

export const NOTE_COLORS: NoteColor[] = [
  "default",
  "lavender",
  "mint",
  "peach",
  "sky",
  "rose",
];

export function createNoteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyDraft(): NoteDraft {
  return { id: null, title: "", body: "", tags: "" };
}

export function createDraft(note: Note): NoteDraft {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags.join(", "),
  };
}

export function hasRequiredNoteContent(
  draft: NoteDraft,
): draft is NoteDraft & { id: string } {
  return Boolean(draft.id && draft.title.trim() && draft.body.trim());
}

export function parseStoredNotes(serialized: string): Note[] {
  const parsed: unknown = JSON.parse(serialized);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        typeof value.title === "string" &&
        typeof value.body === "string" &&
        Array.isArray(value.tags) &&
        value.tags.every((tag: unknown) => typeof tag === "string"),
    )
  ) {
    throw new Error("Saved notes have an invalid format.");
  }

  const usedIds = new Set<string>();
  return parsed.map((value: Record<string, unknown>) => {
    const storedId =
      typeof value.id === "string" && value.id.length > 0 ? value.id : null;
    const id = storedId && !usedIds.has(storedId) ? storedId : createNoteId();
    usedIds.add(id);

    return {
      id,
      title: value.title as string,
      body: value.body as string,
      tags: value.tags as string[],
      pinned: typeof value.pinned === "boolean" ? value.pinned : false,
      archived: typeof value.archived === "boolean" ? value.archived : false,
      color: NOTE_COLORS.includes(value.color as NoteColor)
        ? (value.color as NoteColor)
        : "default",
    };
  });
}

export function upsertNote(notes: Note[], note: Note): Note[] {
  const existingIndex = notes.findIndex(({ id }) => id === note.id);
  if (existingIndex === -1) {
    return [...notes, note];
  }

  return notes.map((currentNote) =>
    currentNote.id === note.id ? note : currentNote,
  );
}
