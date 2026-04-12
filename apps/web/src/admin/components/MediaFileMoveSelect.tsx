import { apiPatch, ApiError } from '@/lib/api';

type Opt = { id: number; label: string };

type Props = {
  fileId: number;
  options: Opt[];
  disabled?: boolean;
  onMoved: () => void;
  onError: (msg: string) => void;
  className?: string;
};

/** Выбор папки назначения → PATCH move (folderId -1 = корень). */
export default function MediaFileMoveSelect({
  fileId,
  options,
  disabled,
  onMoved,
  onError,
  className,
}: Props) {
  return (
    <select
      disabled={disabled}
      defaultValue=""
      className={className ?? 'text-xs border rounded-md px-1 py-1 bg-background max-w-[160px]'}
      onChange={async (e) => {
        const v = e.target.value;
        e.target.value = '';
        if (v === '') return;
        const folderId = Number.parseInt(v, 10);
        if (!Number.isFinite(folderId)) return;
        try {
          await apiPatch(`/admin/media/files/${fileId}/move`, { folderId });
          onMoved();
        } catch (err) {
          let msg = 'Не удалось переместить';
          if (err instanceof ApiError) {
            try {
              const j = JSON.parse(err.message) as { message?: string | string[] };
              if (Array.isArray(j.message)) msg = j.message.join(', ');
              else if (typeof j.message === 'string') msg = j.message;
            } catch {
              if (err.message) msg = err.message;
            }
          }
          onError(msg);
        }
      }}
    >
      <option value="">Переместить…</option>
      <option value="-1">Корень (без папки)</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
