import { useMemo, useState } from 'react';
import { useAppStore } from '../store';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const placements = useAppStore((state) => state.report.placements);
  const select = useAppStore((state) => state.select);
  const suggestions = useMemo(() => {
    const value = query.trim().toLocaleUpperCase('tr-TR');
    return value ? placements.filter((item) => item.saseNo.toLocaleUpperCase('tr-TR').includes(value)).slice(0, 8) : [];
  }, [placements, query]);
  const choose = (saseNo: string): void => {
    const match = placements.find((item) => item.saseNo === saseNo);
    if (match) { select(match); setQuery(match.saseNo); setMessage(`${match.saseNo} bulundu.`); }
  };
  const search = (): void => {
    const exact = placements.find((item) => item.saseNo.toLocaleUpperCase('tr-TR') === query.trim().toLocaleUpperCase('tr-TR'));
    const match = exact ?? suggestions[0];
    if (match) choose(match.saseNo); else setMessage('Kayıt yok.');
  };
  return (
    <div className="search-wrap">
      <label className="sr-only" htmlFor="vin-search">Şase ara</label>
      <input id="vin-search" value={query} onChange={(event) => { setQuery(event.target.value); setMessage(''); }} onKeyDown={(event) => { if (event.key === 'Enter') search(); }} placeholder="Şase No ara…" autoComplete="off" aria-autocomplete="list" aria-controls="vin-suggestions" />
      <button type="button" onClick={search}>Ara</button>
      {suggestions.length > 0 && query && (
        <ul id="vin-suggestions" className="suggestions" role="listbox">
          {suggestions.map((item) => <li key={item.saseNo}><button type="button" onClick={() => choose(item.saseNo)}>{item.saseNo}<small>{item.category} · {item.blockId}</small></button></li>)}
        </ul>
      )}
      <span className="search-message" role="status">{message}</span>
    </div>
  );
}
