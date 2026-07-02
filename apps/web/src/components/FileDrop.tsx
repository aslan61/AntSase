import { useRef, useState } from 'react';

interface Props { readonly onFile: (file: File) => Promise<void> }

export function FileDrop({ onFile }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const submit = async (files: FileList | null): Promise<void> => {
    const file = files?.[0];
    if (file) await onFile(file);
  };
  return (
    <section
      className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void submit(event.dataTransfer.files); }}
      aria-labelledby="upload-title"
    >
      <span className="eyebrow">1. adım</span>
      <h2 id="upload-title">Tabloyu sahaya bırak</h2>
      <p>.xlsx, .xls veya .csv · en fazla 5 MB / 5000 satır</p>
      <button className="primary" type="button" onClick={() => input.current?.click()}>Dosya seç</button>
      <input ref={input} className="sr-only" type="file" accept=".xlsx,.xls,.csv" aria-label="Tablo dosyası seç" onChange={(event) => void submit(event.target.files)} />
    </section>
  );
}
