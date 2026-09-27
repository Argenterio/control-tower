// OnboardingImport.tsx - Importar datos de onboarding desde Excel
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';
import { useToast } from '../components/Toast';
import { Download, Upload, FileText, CheckCircle, Loader2, X } from 'lucide-react';

export default function OnboardingImportPage() {
  const { companyId } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const downloadTemplate = async () => {
    try {
      const blob = await api.getOnboardingTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ControlTower_Onboarding_Template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      addToast('Plantilla descargada', 'success');
    } catch {
      addToast('Error al descargar plantilla', 'error');
    }
  };

  const handleImport = async () => {
    if (!file) { addToast('Seleccioná un archivo .xlsx', 'error'); return; }
    if (!file.name.endsWith('.xlsx')) { addToast('El archivo debe ser .xlsx', 'error'); return; }

    setImporting(true);
    try {
      const res = await api.importOnboarding(file, companyId, dryRun);
      if (res.success) {
        setResult(res);
        setStep(dryRun ? 'review' : 'complete');
        addToast(dryRun ? 'Simulación completada' : 'Importación completada', 'success');
      } else {
        addToast(res.error || 'Error en la importación', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Error de conexión', 'error');
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!file) return;
    setDryRun(false);
    await handleImport();
  };

  const formatErrors = (errors: string[]) => errors.slice(0, 10).map(e => <div key={e} style={{ color: 'var(--accent-rose)', fontSize: '13px', padding: '4px 0' }}>{e}</div>);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><FileText size={28} className="page-icon" /> Importar Onboarding</h1>
          <p className="page-subtitle">Cargá unidades, choferes, clientes y vencimientos desde un Excel único</p>
        </div>
        <button className="btn btn-secondary" onClick={downloadTemplate}><Download size={18} /> Descargar Plantilla</button>
      </div>

      {step === 'upload' && (
        <div className="card" style={{ maxWidth: '600px' }}>
          <div
            style={{
              border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: dragActive ? 'rgba(56,189,248,0.05)' : 'transparent',
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('xlsx-file')?.click()}
          >
            <input type="file" id="xlsx-file" accept=".xlsx" onChange={handleFileChange} style={{ display: 'none' }} />
            <Upload size={48} style={{ marginBottom: '16px', opacity: 0.6 }} />
            <h3>Arrastrá tu archivo .xlsx acá</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>o hacé clic para seleccionar</p>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '16px' }}>Archivo: {file?.name || 'ninguno'}</p>
          </div>
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
              <span>Modo simulación (dry-run) - No guarda cambios, solo valida</span>
            </label>
            <button className="btn btn-primary" onClick={handleImport} disabled={!file || importing} style={{ justifyContent: 'center' }}>
              {importing ? <><Loader2 size={18} className="spinner" /> Procesando...</> : <><Upload size={18} /> {dryRun ? 'Validar (Dry-run)' : 'Importar Definitivo'}</>}
            </button>
          </div>
        </div>
      )}

      {step === 'review' && result && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <CheckCircle size={32} style={{ color: 'var(--accent-emerald)' }} />
            <div>
              <h2 style={{ margin: 0 }}>Validación exitosa</h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>Revisá el resumen y confirmá para importar definitivamente</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { key: 'vehicles', label: 'Unidades', icon: '🚛' },
              { key: 'drivers', label: 'Choferes', icon: '👨‍✈️' },
              { key: 'customers', label: 'Clientes', icon: '🏢' },
              { key: 'expirations', label: 'Vencimientos', icon: '📅' },
            ].map(s => {
              const data = result.summary[s.key as keyof typeof result.summary];
              return (
                <div key={s.key} className="kpi-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                  <div className="kpi-value" style={{ fontSize: '28px' }}>{(data.created || 0) + (data.updated || 0)}</div>
                  <div className="kpi-label">{s.label}</div>
                  {data.created > 0 && <div className="kpi-trend positive" style={{ marginTop: '8px', fontSize: '12px' }}>+{data.created} nuevos</div>}
                  {data.updated > 0 && <div className="kpi-trend neutral" style={{ marginTop: '4px', fontSize: '12px' }}>↻{data.updated} actualizados</div>}
                  {data.errors.length > 0 && <div className="kpi-trend negative" style={{ marginTop: '4px', fontSize: '12px' }}>{data.errors.length} errores</div>}
                </div>
              );
            })}
          </div>

          {['vehicles', 'drivers', 'customers', 'expirations'].map(key => {
            const data = result.summary[key];
            if (data.errors.length === 0) return null;
            return (
              <details key={key} style={{ marginBottom: '16px', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--accent-rose)' }}>{key} - {data.errors.length} errores</summary>
                <div style={{ marginTop: '8px' }}>{formatErrors(data.errors)}</div>
              </details>
            );
          })}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { setStep('upload'); setFile(null); setResult(null); }}><X size={16} /> Volver</button>
            <button className="btn btn-primary" onClick={confirmImport} style={{ justifyContent: 'center' }}><CheckCircle size={16} /> Confirmar e Importar</button>
          </div>
        </div>
      )}

      {step === 'complete' && result && (
        <div className="card" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h2>Importación completada</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Los datos se guardaron correctamente en tu empresa.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {['vehicles', 'drivers', 'customers', 'expirations'].map(key => {
              const data = result.summary[key];
              return (
                <div key={key} style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <div className="kpi-value" style={{ fontSize: '24px' }}>{(data.created || 0) + (data.updated || 0)}</div>
                  <div className="kpi-label">{key}</div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" onClick={() => { setStep('upload'); setFile(null); setResult(null); }} style={{ justifyContent: 'center', maxWidth: '200px' }}>Importar otro archivo</button>
        </div>
      )}
    </div>
  );
}