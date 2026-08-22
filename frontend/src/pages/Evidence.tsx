// Evidencias — Audios, fotos, documentos, ubicaciones y mensajes clave
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import api, { resolveMediaUrl } from '../api/client';
import type { TripEvidence } from '../types';
import {
  Image as ImageIcon, Mic, FileText, MapPin, RefreshCw, Search,
  Volume2, ExternalLink
} from 'lucide-react';

const KIND_META: Record<string, { label: string; color: string; icon: any }> = {
  audio:    { label: 'Audios',    color: '#a78bfa', icon: Mic },
  image:    { label: 'Fotos',     color: '#22d3ee', icon: ImageIcon },
  document: { label: 'Documentos',color: '#fbbf24', icon: FileText },
  location: { label: 'Ubicaciones', color: '#34d399', icon: MapPin },
  text:     { label: 'Mensajes',  color: '#94a3b8', icon: FileText },
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function EvidencePage() {
  const { companyId } = useAuth();
  const [items, setItems] = useState<TripEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getTripEvidence(companyId, { limit: 200 });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(it => {
      if (kind !== 'all' && it.kind !== kind) return false;
      if (!q) return true;
      return (
        it.title?.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q) ||
        it.transcript?.toLowerCase().includes(q) ||
        it.tripId?.toLowerCase().includes(q)
      );
    });
  }, [items, search, kind]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, audio: 0, image: 0, document: 0, location: 0, text: 0 };
    items.forEach(i => { c[i.kind] = (c[i.kind] || 0) + 1; });
    return c;
  }, [items]);

  return (
    <div className="page evidence-page">
      <div className="page-header">
        <div>
          <h1><ImageIcon size={28} className="page-icon" /> Evidencias</h1>
          <p className="page-subtitle">Audios, fotos, remitos, ubicaciones y mensajes clave asociados a cada viaje</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por descripción, transcripción o viaje…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          <button className={`pill ${kind === 'all' ? 'pill-active' : ''}`} onClick={() => setKind('all')}>
            Todas ({counts.all})
          </button>
          {Object.entries(KIND_META).map(([k, meta]) => {
            const Icon = meta.icon;
            return (
              <button key={k} className={`pill ${kind === k ? 'pill-active' : ''}`} onClick={() => setKind(k)}>
                <Icon size={12} /> {meta.label} ({counts[k] || 0})
              </button>
            );
          })}
        </div>
      </div>

      <div className="evidence-grid">
        {loading && <div className="inbox-empty">Cargando evidencias…</div>}
        {!loading && filtered.length === 0 && <div className="inbox-empty">No hay evidencias para mostrar.</div>}
        {filtered.map(ev => {
          const meta = KIND_META[ev.kind] || KIND_META.text;
          const Icon = meta.icon;
          const resolvedUrl = resolveMediaUrl(ev.mediaUrl);
          return (
            <div key={ev.id} className="evidence-card" style={{ borderLeftColor: meta.color }}>
              <div className="evidence-head">
                <span className="evidence-kind" style={{ background: meta.color }}>
                  <Icon size={12} /> {meta.label}
                </span>
                <span className="evidence-date">{formatDate(ev.capturedAt || ev.createdAt)}</span>
              </div>
              <div className="evidence-body">
                {ev.kind === 'audio' && (
                  <div className="evidence-audio">
                    {resolvedUrl && (
                      <audio controls preload="metadata" src={resolvedUrl}>
                        Tu navegador no soporta el elemento de audio.
                      </audio>
                    )}
                    {ev.transcript && (
                      <div className="evidence-transcript">
                        <Volume2 size={14} /> <em>"{ev.transcript}"</em>
                      </div>
                    )}
                  </div>
                )}
                {ev.kind === 'image' && resolvedUrl && (
                  <div className="evidence-image">
                    <a href={resolvedUrl} target="_blank" rel="noreferrer" title="Abrir imagen original">
                      <img 
                        src={resolvedUrl} 
                        alt={ev.description || 'evidencia'} 
                        loading="lazy" 
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMyZDI5M2IiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk0YTNiOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiPueUqOaBrOaIkeaUqOingeWkpuaIkTwvdGV4dD48L3N2Zz4=';
                          e.currentTarget.alt = 'Imagen no disponible';
                          e.currentTarget.style.filter = 'grayscale(100%)';
                        }}
                      />
                    </a>
                  </div>
                )}
                {ev.description && ev.kind !== 'audio' && (
                  <p className="evidence-desc">{ev.description}</p>
                )}
                {ev.kind === 'document' && resolvedUrl && (
                  <a className="evidence-doc" href={resolvedUrl} target="_blank" rel="noreferrer">
                    <FileText size={14} /> Ver documento <ExternalLink size={12} />
                  </a>
                )}
                {ev.kind === 'location' && ev.metadata && (() => {
                  try {
                    const loc = JSON.parse(ev.metadata);
                    if (loc.latitude && loc.longitude) {
                      return (
                        <a
                          className="evidence-loc"
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank" rel="noreferrer"
                        >
                          <MapPin size={14} /> {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)} <ExternalLink size={12} />
                        </a>
                      );
                    }
                  } catch { /* ignore */ }
                  return null;
                })()}
              </div>
              <div className="evidence-foot">
                <span className="td-mono">Viaje {ev.tripId ? `#${ev.tripId.replace(/^trip-/, '').slice(-6)}` : '—'}</span>
                <span className="td-muted">{ev.source}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
