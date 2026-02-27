import Button from "./Button";

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <section className="card empty-state" role="status">
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__message">{message}</p>
      {actionLabel && onAction ? (
        <div className="actions-row" style={{ justifyContent: "center" }}>
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </section>
  );
}
