import type { AsyncState } from "../../types/ui";
import Button from "./Button";

type StatusPanelProps = {
  state: AsyncState;
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

const STATE_CLASS: Record<AsyncState, string> = {
  idle: "status-panel--idle",
  loading: "status-panel--loading",
  success: "status-panel--success",
  error: "status-panel--error",
};

export default function StatusPanel({
  state,
  title,
  message,
  onRetry,
  retryLabel = "다시 시도",
}: StatusPanelProps) {
  return (
    <section className={`card status-panel ${STATE_CLASS[state]}`} role={state === "error" ? "alert" : "status"}>
      <h2 className="status-panel__title">{title}</h2>
      {message ? <p className="status-panel__message">{message}</p> : null}
      {state === "loading" ? (
        <div className="actions-row">
          <span className="btn btn--ghost" aria-hidden="true">
            <span className="btn__spinner" />
            로딩 중...
          </span>
        </div>
      ) : null}
      {state === "error" && onRetry ? (
        <div className="actions-row">
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
