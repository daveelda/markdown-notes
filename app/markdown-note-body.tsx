import ReactMarkdown from "react-markdown";

type MarkdownNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: MarkdownNode[];
};

function rehypeUnderline() {
  return (tree: MarkdownNode) => {
    function visit(node: MarkdownNode): void {
      if (node.type === "element" && (node.tagName === "code" || node.tagName === "pre")) {
        return;
      }

      if (!node.children) {
        return;
      }

      node.children = node.children.flatMap((child) => {
        if (child.type !== "text" || !child.value?.includes("++")) {
          visit(child);
          return [child];
        }

        const parts: MarkdownNode[] = [];
        const pattern = /\+\+([^+\n](?:[^+\n]|(?<!\+)\+(?!\+))*)\+\+/g;
        let lastIndex = 0;
        let match = pattern.exec(child.value);
        while (match) {
          if (match.index > lastIndex) {
            parts.push({
              type: "text",
              value: child.value.slice(lastIndex, match.index),
            });
          }
          parts.push({
            type: "element",
            tagName: "u",
            properties: {},
            children: [{ type: "text", value: match[1] }],
          });
          lastIndex = match.index + match[0].length;
          match = pattern.exec(child.value);
        }
        if (lastIndex === 0) {
          return [child];
        }
        if (lastIndex < child.value.length) {
          parts.push({ type: "text", value: child.value.slice(lastIndex) });
        }
        return parts;
      });
    }

    visit(tree);
  };
}

export default function MarkdownNoteBody({ body }: { body: string }) {
  return (
    <div className="min-w-0 space-y-3 break-words text-zinc-700 dark:text-zinc-300 [overflow-wrap:anywhere]">
      <ReactMarkdown
        rehypePlugins={[rehypeUnderline]}
        components={{
          h1: ({ children }) => (
            <h1 className="break-words text-2xl font-bold text-zinc-950 dark:text-zinc-50 [overflow-wrap:anywhere]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="break-words text-xl font-semibold text-zinc-950 dark:text-zinc-50 [overflow-wrap:anywhere]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="break-words text-lg font-semibold text-zinc-950 dark:text-zinc-50 [overflow-wrap:anywhere]">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-4 sm:pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-4 sm:pl-6">
              {children}
            </ol>
          ),
          a: ({ children, href }) => (
            <a
              className="text-indigo-600 underline underline-offset-2 [overflow-wrap:anywhere] hover:text-indigo-500 dark:text-indigo-400"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          u: ({ children }) => (
            <u className="underline decoration-2 underline-offset-2">
              {children}
            </u>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
