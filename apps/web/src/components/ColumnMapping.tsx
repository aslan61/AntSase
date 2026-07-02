import type { ColumnMapping as Mapping, ParsedSheet } from '../lib/spreadsheet';

interface Props {
  readonly sheet: ParsedSheet;
  readonly mapping: Mapping;
  readonly onChange: (mapping: Mapping) => void;
}

export function ColumnMapping({ sheet, mapping, onChange }: Props) {
  return (
    <section className="mapping-card" aria-labelledby="mapping-title">
      <div>
        <span className="eyebrow">2. adım</span>
        <h2 id="mapping-title">Sütunları eşle</h2>
        <p>{sheet.filename} · {sheet.records.length} veri satırı</p>
      </div>
      <label>
        Şase No sütunu
        <select aria-label="Şase No sütunu" value={mapping.saseColumn} onChange={(event) => onChange({ ...mapping, saseColumn: Number(event.target.value) })}>
          {sheet.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Adsız sütun ${index + 1}`}</option>)}
        </select>
      </label>
      <label>
        Adres / Peron sütunu
        <select aria-label="Adres / Peron sütunu" value={mapping.categoryColumn} onChange={(event) => onChange({ ...mapping, categoryColumn: Number(event.target.value) })}>
          {sheet.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Adsız sütun ${index + 1}`}</option>)}
        </select>
      </label>
      <label>
        Ayrı peron numarası sütunu
        <select aria-label="Ayrı peron numarası sütunu" value={mapping.slotColumn ?? ''} onChange={(event) => onChange({ ...mapping, slotColumn: event.target.value === '' ? null : Number(event.target.value) })}>
          <option value="">Yok — H10 gibi adresten ayır</option>
          {sheet.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Adsız sütun ${index + 1}`}</option>)}
        </select>
      </label>
      <p className="mapping-help">“ADRES” hücresindeki A3, H10, N12 gibi değerler otomatik olarak harf ve peron numarasına ayrılır.</p>
      {(mapping.saseColumn === mapping.categoryColumn || mapping.slotColumn === mapping.saseColumn || mapping.slotColumn === mapping.categoryColumn) && <p className="inline-error" role="alert">Her alan için farklı bir sütun seçin.</p>}
    </section>
  );
}
