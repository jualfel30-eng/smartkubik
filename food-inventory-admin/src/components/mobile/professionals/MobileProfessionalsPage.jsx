import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchApi } from '../../../lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useModuleAccess } from '../../../hooks/useModuleAccess';
import { Plus, Search, Edit2, Lock, Star, Clock, ChevronRight, LayoutGrid, List, RefreshCw, User } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';

// ── helpers ──────────────────────────────────────────────────────────────────
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYNUM_MAP = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };

function getTodaySchedule(professional) {
  const today = new Date().getDay(); // 0-6
  if (!professional.schedule) return null;

  if (Array.isArray(professional.schedule)) {
    const slot = professional.schedule.find(s => s.day === today);
    if (!slot || slot.isWorking === false) return null;
    return { start: slot.start, end: slot.end };
  }
  // Object schedule
  const key = DAYNUM_MAP[today];
  const slot = professional.schedule[key];
  if (!slot || slot.available === false) return null;
  return { start: slot.start, end: slot.end };
}

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

function StatusBadge({ active }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ── Professional card ─────────────────────────────────────────────────────────
function ProfessionalCard({ professional, onEdit, onBlock }) {
  const isActive = professional.isActive !== false;
  const todaySchedule = getTodaySchedule(professional);
  const specialties = professional.specializations || professional.specialties || [];
  const services = professional.allowedServiceIds || [];
  const photo = professional.images?.[0] || professional.profileImage || null;
  const color = professional.color || '#6366f1';

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden shadow-sm transition-all active:scale-[0.98] ${!isActive ? 'opacity-60' : ''}`}>
      {/* Top strip with color */}
      <div className="h-1.5 w-full" style={{ background: color }} />

      <div className="p-4">
        {/* Avatar + name row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-full flex-none flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-sm"
            style={{ background: photo ? 'transparent' : color }}
          >
            {photo
              ? <img src={photo} alt={professional.name} className="w-full h-full object-cover" />
              : getInitials(professional.name)
            }
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-semibold text-base leading-tight truncate">{professional.name}</h3>
              <StatusBadge active={isActive} />
            </div>
            {professional.email && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{professional.email}</p>
            )}
          </div>
        </div>

        {/* Specialties */}
        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {specialties.slice(0, 3).map((s, i) => (
              <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
            {specialties.length > 3 && (
              <span className="text-xs text-muted-foreground">+{specialties.length - 3}</span>
            )}
          </div>
        )}

        {/* Info row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          {services.length > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
            </span>
          )}
          {todaySchedule ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <Clock className="h-3 w-3" />
              Hoy {todaySchedule.start}–{todaySchedule.end}
            </span>
          ) : (
            <span className="text-gray-400">No trabaja hoy</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(professional)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border border-border hover:bg-accent transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            onClick={() => onBlock(professional)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border border-border hover:bg-accent transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Bloquear
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Professional list row ─────────────────────────────────────────────────────
function ProfessionalRow({ professional, onEdit }) {
  const isActive = professional.isActive !== false;
  const photo = professional.images?.[0] || professional.profileImage || null;
  const color = professional.color || '#6366f1';
  const specialties = professional.specializations || professional.specialties || [];

  return (
    <button
      onClick={() => onEdit(professional)}
      className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-accent/50 transition-colors text-left"
    >
      <div
        className="w-10 h-10 rounded-full flex-none flex items-center justify-center text-white font-semibold text-sm overflow-hidden"
        style={{ background: photo ? 'transparent' : color }}
      >
        {photo
          ? <img src={photo} alt={professional.name} className="w-full h-full object-cover" />
          : getInitials(professional.name)
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{professional.name}</p>
        {specialties.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">{specialties.slice(0, 2).join(' · ')}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-none">
        <StatusBadge active={isActive} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MobileProfessionalsPage() {
  const { tenant } = useAuth();
  const hasAccess = useModuleAccess('appointments');

  const [professionals, setProfessionals] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi('/professionals?includePricing=true');
      setProfessionals(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      setError('No se pudieron cargar los profesionales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter
  useEffect(() => {
    let result = [...professionals];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        (p.specializations || p.specialties || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (statusFilter === 'active') result = result.filter(p => p.isActive !== false);
    if (statusFilter === 'inactive') result = result.filter(p => p.isActive === false);
    setFiltered(result);
  }, [professionals, search, statusFilter]);

  const navigate = useNavigate();

  const handleEdit = (professional) => {
    navigate(`/resources?edit=${professional._id}`);
  };

  const handleBlock = (professional) => {
    navigate(`/resources?block=${professional._id}`);
  };

  const handleCreate = () => {
    haptics.tap();
    navigate('/resources?create=1');
  };

  const activeCount = professionals.filter(p => p.isActive !== false).length;
  const inactiveCount = professionals.filter(p => p.isActive === false).length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Profesionales</h1>
              <p className="text-xs text-muted-foreground">
                {activeCount} activo{activeCount !== 1 ? 's' : ''}{inactiveCount > 0 ? ` · ${inactiveCount} inactivo${inactiveCount !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* + Nuevo button */}
              <motion.button
                onClick={handleCreate}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: DUR.base, ease: EASE.out, delay: 0.1 }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground no-tap-highlight"
              >
                <Plus size={14} />
                <span className="hidden min-[360px]:inline">Nuevo</span>
              </motion.button>
              {/* View toggle */}
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              {/* Refresh */}
              <button onClick={load} className="p-2 rounded-lg hover:bg-accent transition-colors">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar profesional..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-muted rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Status filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Activos' },
              { value: 'inactive', label: 'Inactivos' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`flex-none text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-accent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && professionals.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={load} className="text-sm text-primary underline">Reintentar</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-6">
            <User className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-sm">
              {search || statusFilter !== 'all' ? 'Sin resultados' : 'Sin profesionales'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || statusFilter !== 'all'
                ? 'Ajusta los filtros de búsqueda'
                : 'Agrega tu primer profesional con el botón "Nuevo" arriba'}
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="p-4 grid grid-cols-1 gap-4">
            {filtered.map(p => (
              <ProfessionalCard
                key={p._id}
                professional={p}
                onEdit={handleEdit}
                onBlock={handleBlock}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card border-y divide-y">
            {filtered.map(p => (
              <ProfessionalRow key={p._id} professional={p} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
