"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type DropdownMenuProps = {
  label: string;
  trigger: ReactNode;
  triggerClassName: string;
  children: (close: () => void) => ReactNode;
  onOpenChange?: (open: boolean) => void;
};

export default function DropdownMenu({
  label,
  trigger,
  triggerClassName,
  children,
  onOpenChange,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const changeOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  const close = useCallback(() => {
    changeOpen(false);
  }, [changeOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const menu = containerRef.current?.querySelector<HTMLElement>(
      '[role="menu"] [role^="menuitem"]:not([disabled])',
    );
    menu?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        close();
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      const items = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(
          '[role="menu"] [role^="menuitem"]:not([disabled])',
        ) ?? [],
      );
      if (items.length === 0) {
        return;
      }

      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open]);

  return (
    <div
      className="relative"
      onClick={(event) => event.stopPropagation()}
      ref={containerRef}
    >
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className={triggerClassName}
        onClick={() => changeOpen(!open)}
        ref={triggerRef}
        type="button"
      >
        {trigger}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-2 max-h-[min(70vh,28rem)] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          id={menuId}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Home" || event.key === "End") {
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  '[role^="menuitem"]:not([disabled])',
                ),
              );
              event.preventDefault();
              (event.key === "Home" ? items[0] : items.at(-1))?.focus();
            }
          }}
          role="menu"
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
