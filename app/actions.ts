"use server";

type Note = {
  title: string;
  body: string;
  tags: string[];
};

export async function checkNote(
  formData: FormData,
): Promise<{ note: Note } | { error: string }> {
  const rawTitle = formData.get("title");
  const rawBody = formData.get("body");
  const rawTags = formData.get("tags");

  if (typeof rawTitle !== "string" || !rawTitle.trim()) {
    return { error: "Title is required." };
  }

  if (typeof rawBody !== "string" || !rawBody.trim()) {
    return { error: "Body is required." };
  }

  const tags =
    typeof rawTags === "string"
      ? [...new Set(rawTags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
      : [];

  return {
    note: {
      title: rawTitle.trim(),
      body: rawBody.trim(),
      tags,
    },
  };
}
