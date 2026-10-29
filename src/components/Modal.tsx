import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      aria-label={title}
    >
      <header>
        <h2>{title}</h2>
        {onClose && (
          <button className="icon" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        )}
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
