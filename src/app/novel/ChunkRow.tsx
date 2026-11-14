"use client";

export type ChunkStatus = "pending" | "running" | "done" | "error";

export interface ChunkState {
  source: string;
  output: string;
  status: ChunkStatus;
  error?: string;
}

const STATUS_LABEL: Record<ChunkStatus, string> = {
  pending: "⏳ antre",
  running: "✍️ nerjemahin…",
  done: "✅ beres",
  error: "⚠️ gagal",
};

export function ChunkRow({
  index,
  chunk,
  showSource,
  busy,
  onRetry,
  onEdit,
}: {
  index: number;
  chunk: ChunkState;
  showSource: boolean;
  busy: boolean;
  onRetry: (index: number) => void;
  onEdit: (index: number, text: string) => void;
}) {
  return (
    <div className={`grid gap-4 border-b border-zinc-200 py-4 dark:border-zinc-800 ${showSource ? "md:grid-cols-2" : ""}`}>
      {showSource && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-500">{chunk.source}</div>
      )}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
          <span>
            #{index + 1} · {STATUS_LABEL[chunk.status]}
          </span>
          {(chunk.status === "done" || chunk.status === "error") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRetry(index)}
              className="rounded px-2 py-0.5 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
              title="Terjemahkan ulang bagian ini"
            >
              🔄 ulang
            </button>
          )}
        </div>
        {chunk.status === "error" && <p className="mb-2 text-sm text-red-500">{chunk.error}</p>}
        {chunk.status === "done" ? (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onEdit(index, e.currentTarget.innerText)}
            className="whitespace-pre-wrap rounded leading-relaxed outline-none focus:ring-2 focus:ring-orange-400/50"
          >
            {chunk.output}
          </div>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">
            {chunk.output}
            {chunk.status === "running" && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-orange-500 align-middle" />}
          </div>
        )}
      </div>
    </div>
  );
}
