import type { UploadSummary } from '../lib/api';

interface Props { readonly items: readonly UploadSummary[]; readonly onOpen: (id: string) => Promise<void>; readonly loading: boolean }

export function History({ items, onOpen, loading }: Props) {
  return (
    <section className="history" aria-labelledby="history-title">
      <h2 id="history-title">Yükleme geçmişi</h2>
      {loading ? <p role="status">Geçmiş yükleniyor…</p> : items.length === 0 ? <p>Henüz kayıtlı yükleme yok.</p> : (
        <ul>{items.map((item) => <li key={item.id}><div><strong>{item.filename}</strong><small>{new Date(item.createdAt).toLocaleString('tr-TR')} · {item.validCount}/{item.totalRows} yerleşti</small></div><button type="button" onClick={() => void onOpen(item.id)}>Aç</button></li>)}</ul>
      )}
    </section>
  );
}
