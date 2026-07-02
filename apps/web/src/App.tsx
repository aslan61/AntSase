import { useCallback, useEffect, useState } from 'react';
import { placeVehicles, SAHALAR } from '@sase/shared';
import { API_URL } from './config';
import { ColumnMapping } from './components/ColumnMapping';
import { FileDrop } from './components/FileDrop';
import { History } from './components/History';
import { InfoPanel } from './components/InfoPanel';
import { SearchBar } from './components/SearchBar';
import { exportCsv, exportPng } from './lib/export';
import { getUpload, getUploads, saveSnapshot, saveUpload } from './lib/api';
import type { UploadSummary } from './lib/api';
import { downloadTemplate, guessMapping, mapRows, parseFile } from './lib/spreadsheet';
import { SahaScene } from './scene/SahaScene';
import { useAppStore } from './store';

const LOCAL_KEY = 'antsase-yerlesim-v2';

export default function App() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<readonly UploadSummary[]>([]);
  const sheet = useAppStore((state) => state.sheet);
  const mapping = useAppStore((state) => state.mapping);
  const rows = useAppStore((state) => state.rows);
  const report = useAppStore((state) => state.report);
  const uploadId = useAppStore((state) => state.uploadId);
  const viewMode = useAppStore((state) => state.viewMode);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const canvas = useAppStore((state) => state.canvas);
  const setSheet = useAppStore((state) => state.setSheet);
  const setMapping = useAppStore((state) => state.setMapping);
  const setPreview = useAppStore((state) => state.setPreview);
  const setReport = useAppStore((state) => state.setReport);
  const setUploadId = useAppStore((state) => state.setUploadId);
  const focus = useAppStore((state) => state.focus);
  const focusBlock = useAppStore((state) => state.focusBlock);
  const focusPeron = useAppStore((state) => state.focusPeron);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  const loadHistory = useCallback(async (): Promise<void> => {
    if (!API_URL) return;
    try { setHistory(await getUploads()); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Geçmiş yüklenemedi.'); }
  }, []);

  useEffect(() => {
    if (API_URL) void loadHistory();
    else {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) {
        try { setReport(JSON.parse(stored) as ReturnType<typeof placeVehicles>); } catch { localStorage.removeItem(LOCAL_KEY); }
      }
    }
  }, [loadHistory, setReport]);

  const preview = useCallback((): void => {
    if (!sheet || !mapping || mapping.saseColumn === mapping.categoryColumn || mapping.slotColumn === mapping.saseColumn || mapping.slotColumn === mapping.categoryColumn) return;
    try {
      const mapped = mapRows(sheet, mapping);
      const placement = placeVehicles(mapped);
      setPreview(mapped, placement);
      setNotice(`${mapped.length} satır okundu · ${placement.placements.length} yerleşti · ${placement.unplaced.length} yerleşemedi.`);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Önizleme oluşturulamadı.'); }
  }, [mapping, setPreview, sheet]);

  useEffect(() => { preview(); }, [preview]);

  const handleFile = async (file: File): Promise<void> => {
    setBusy(true); setError(''); setNotice('');
    try { const parsed = await parseFile(file); setSheet(parsed, guessMapping(parsed.headers)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Dosya okunamadı.'); }
    finally { setBusy(false); }
  };

  const persist = async (): Promise<void> => {
    if (!sheet) { setError('Önce bir tablo yükleyin.'); return; }
    setBusy(true); setError('');
    try {
      if (API_URL) {
        const saved = await saveUpload(sheet.filename, rows);
        setReport(saved.report); setUploadId(saved.upload.id); setNotice('Yerleşim sunucuya kaydedildi.'); await loadHistory();
      } else {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(report)); setNotice('Yerleşim bu tarayıcıya kaydedildi (yalnız-frontend modu).');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Kayıt tamamlanamadı.'); }
    finally { setBusy(false); }
  };

  const openUpload = async (id: string): Promise<void> => {
    setBusy(true); setError('');
    try { const result = await getUpload(id); setReport(result.report); setUploadId(id); setNotice(`${result.upload.filename} açıldı.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Yükleme açılamadı.'); }
    finally { setBusy(false); }
  };

  const snapshot = async (): Promise<void> => {
    if (!API_URL || !uploadId) { setError('Snapshot için önce sunucuya kayıtlı bir yükleme açın.'); return; }
    try { const id = await saveSnapshot(uploadId, `Görünüm ${new Date().toLocaleString('tr-TR')}`, { viewMode }); setNotice(`Snapshot kaydedildi: ${id}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Snapshot kaydedilemedi.'); }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">AS</span><div><strong>AntSase 3D</strong><small>1.242 araçlık canlı saha yerleşimi</small></div></div>
        <SearchBar />
        <span className={`mode-badge ${API_URL ? 'online' : ''}`}>{API_URL ? 'API bağlı' : 'Yalnız frontend'}</span>
      </header>
      {error && <div className="banner error" role="alert"><span>{error}</span><button aria-label="Hatayı kapat" onClick={() => setError('')}>×</button></div>}
      {notice && <div className="banner notice" role="status"><span>{notice}</span><button aria-label="Bildirimi kapat" onClick={() => setNotice('')}>×</button></div>}
      {busy && <div className="loading" role="status"><span />İşleniyor…</div>}
      <main id="main-content">
        <section className="workspace">
          <div className="scene-toolbar" aria-label="Sahne araçları">
            <div className="segmented"><button className={viewMode === '2d' ? 'active' : ''} onClick={() => setViewMode('2d')}>2D</button><button className={viewMode === '3d' ? 'active' : ''} onClick={() => setViewMode('3d')}>3D</button></div>
            {viewMode === '3d' && <div className="segmented camera-mode" aria-label="Kamera hareket modu"><button className={cameraMode === 'pan' ? 'active' : ''} aria-pressed={cameraMode === 'pan'} onClick={() => setCameraMode('pan')}>Taşı</button><button className={cameraMode === 'rotate' ? 'active' : ''} aria-pressed={cameraMode === 'rotate'} onClick={() => setCameraMode('rotate')}>Döndür</button></div>}
            <button onClick={() => focus('saha-1')}>Saha 1</button><button onClick={() => focus('saha-2')}>Saha 2</button><button onClick={() => focus(null)}>Tüm sahalar</button>
            <select aria-label="Perona git" value={focusBlock ? `${focusBlock.sahaId}|${focusBlock.blockId}` : ''} onChange={(event) => { const [sahaId, blockId] = event.target.value.split('|'); if (sahaId && blockId) focusPeron(sahaId, blockId); }}>
              <option value="">Perona git…</option>
              {SAHALAR.map((saha) => <optgroup key={saha.id} label={saha.name}>{saha.blocks.map((block) => <option key={block.id} value={`${saha.id}|${block.id}`}>{block.category} — {block.label}</option>)}</optgroup>)}
            </select>
            <button onClick={() => { try { exportPng(canvas); } catch (reason) { setError(reason instanceof Error ? reason.message : 'PNG alınamadı.'); } }}>PNG</button>
            <button onClick={() => exportCsv(report.placements)}>CSV</button>
          </div>
          <SahaScene />
          <div className="scene-help">{viewMode === '3d' ? `Tek parmak / sol sürükle: ${cameraMode === 'pan' ? 'taşı' : 'döndür'} · Sağ sürükle: ${cameraMode === 'pan' ? 'döndür' : 'taşı'} · İki parmak / tekerlek: yakınlaştır` : 'Tek parmak / sol sürükle: taşı · İki parmak / tekerlek: yakınlaştır'}</div>
          {report.placements.length === 0 && <div className="scene-empty"><strong>Sahalar hazır</strong><span>Araçları görmek için tablonuzu yükleyin.</span></div>}
        </section>
        <InfoPanel />
      </main>
      <section className="data-dock">
        <FileDrop onFile={handleFile} />
        {sheet && mapping ? <ColumnMapping sheet={sheet} mapping={mapping} onChange={setMapping} /> : <section className="mapping-card empty"><span className="eyebrow">2. adım</span><h2>Sütun eşleme</h2><p>Şasi ve ADRES sütunları dosya yüklenince otomatik tanınır.</p></section>}
        <section className="action-card"><span className="eyebrow">Önizle ve kaydet</span><h2>Önizle ve kaydet</h2><div className="metric-row"><span><strong>{report.placements.length}</strong> yerleşti</span><span><strong>{report.unplaced.length}</strong> yerleşemedi</span></div><button className="primary" disabled={!sheet || busy} onClick={() => void persist()}>Kaydet</button><button onClick={downloadTemplate}>Boş Excel şablonu</button><button disabled={!API_URL || !uploadId} onClick={() => void snapshot()}>Snapshot kaydet</button></section>
        <History items={history} onOpen={openUpload} loading={busy && history.length === 0} />
      </section>
    </div>
  );
}
