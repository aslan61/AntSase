import { SAHALAR } from '@sase/shared';
import { SCENE_CONFIG } from '../config';
import { useAppStore } from '../store';

export function InfoPanel() {
  const report = useAppStore((state) => state.report);
  const selected = useAppStore((state) => state.selected);
  const focusBlock = useAppStore((state) => state.focusBlock);
  const focusedDefinition = focusBlock
    ? SAHALAR.flatMap((saha) => saha.blocks.map((block) => ({ saha, block }))).find(({ saha, block }) => saha.id === focusBlock.sahaId && block.id === focusBlock.blockId)
    : undefined;
  const warningGroups = Object.entries(report.warnings.reduce<Record<string, number>>((groups, item) => ({ ...groups, [item.code]: (groups[item.code] ?? 0) + 1 }), {}));
  return (
    <aside className="info-panel" aria-label="Yerleşim bilgi paneli">
      {selected ? (
        <section>
          <span className="eyebrow">{selected.saseNo ? 'Seçili araç' : 'Seçili Boş Slot'}</span>
          <h2>{selected.saseNo || `${selected.blockId}-${selected.slotIndex}`}</h2>
          <dl className="details">
            {selected.category ? <div><dt>Kategori</dt><dd>{selected.category}</dd></div> : null}
            <div><dt>Saha</dt><dd>{selected.sahaId === 'saha-1' ? 'Saha 1' : 'Saha 2'}</dd></div>
            <div><dt>Blok</dt><dd>{selected.blockId}</dd></div><div><dt>Peron</dt><dd>{selected.requestedSlot ? `${selected.category ?? focusedDefinition?.block.category ?? ''}${selected.requestedSlot}` : `${selected.category ?? ''}${selected.col + 1}`}</dd></div>
            <div><dt>Peron / Derinlik</dt><dd>{selected.col + 1} / {selected.row + 1}</dd></div>
            {!selected.saseNo && <div><dt>Durum</dt><dd style={{ color: '#22c55e', fontWeight: 'bold' }}>Boş / Müsait</dd></div>}
          </dl>
        </section>
      ) : focusedDefinition ? (
        <section>
          <span className="eyebrow">Seçili peron</span>
          <h2>{focusedDefinition.block.label}</h2>
          <dl className="details">
            <div><dt>Saha</dt><dd>{focusedDefinition.saha.name}</dd></div>
            <div><dt>Kapasite</dt><dd>{focusedDefinition.block.capacity}</dd></div>
            <div><dt>Dolu</dt><dd>{report.placements.filter((item) => item.sahaId === focusedDefinition.saha.id && item.blockId === focusedDefinition.block.id).length}</dd></div>
            <div><dt>Peron kodu</dt><dd>{focusedDefinition.block.id}</dd></div>
          </dl>
          <p>Kare numaraları ve dolu karelerdeki şase numaraları sahnede gösteriliyor.</p>
        </section>
      ) : <section className="empty-panel"><span className="eyebrow">Sistem hazır</span><h2>Bir perona tıklayın</h2><p>Kamera perona yaklaşır; şase numaraları karelerin üzerinde görünür. Arama ile doğrudan araca da uçabilirsiniz.</p></section>}
      <section>
        <h3>Genel özet</h3>
        {SAHALAR.map((saha) => {
          const count = report.placements.filter((item) => item.sahaId === saha.id).length;
          return <div className="saha-summary" key={saha.id}><div><strong>{saha.name}</strong><span>{count}/{saha.total}</span></div><progress value={count} max={saha.total}>{count}</progress><small>{saha.total - count} boş slot</small></div>;
        })}
        <div className="warning-count"><span>Yerleştirilemeyen</span><strong>{report.unplaced.length}</strong></div>
        <div className="warning-count"><span>Uyarı / hatalı satır</span><strong>{report.warnings.length}</strong></div>
        {warningGroups.length > 0 && <div className="warning-breakdown">{warningGroups.map(([code, count]) => <span key={code}>{code}: {count}</span>)}</div>}
      </section>
      {report.warnings.length > 0 && <section><h3>İlk veri uyarıları</h3><ul className="warning-list">{report.warnings.slice(0, 8).map((item, index) => <li key={`${item.rowIndex}-${item.code}-${index}`}>{item.message}</li>)}</ul>{report.warnings.length > 8 && <small>+ {report.warnings.length - 8} uyarı daha</small>}</section>}
      <section>
        <h3>Blok doluluğu</h3>
        <div className="block-list">{SAHALAR.flatMap((saha) => saha.blocks.map((block) => {
          const count = report.placements.filter((item) => item.blockId === block.id).length;
          return <span key={`${saha.id}-${block.id}`}>{block.id}: {count}/{block.capacity}</span>;
        }))}</div>
      </section>
      <section>
        <h3>Renk lejandı</h3>
        <div className="legend">{Object.entries(SCENE_CONFIG.palette).map(([category, color]) => <span key={category}><i style={{ background: color }} />{category}</span>)}</div>
      </section>
    </aside>
  );
}
