
import React, { useState, useMemo, memo, useEffect, useCallback, useDeferredValue, useRef } from 'react';
import { List as VirtualizedList } from 'react-window';
import { LandingForm, Fisherman, Species, ProductionItem } from '../types';
import { safeFormatDate, parseToISODate } from '../utils/dateUtils';
import { parsePortugueseNumber } from '../utils/numberUtils';
import { standardizeText, standardizeScientificName } from '../utils/textUtils';
import { GEAR_STRUCTURE, getGeneralGearType, ALL_GENERAL_GEARS, ALL_SPECIFIC_GEARS } from '../utils/gearUtils';
import { 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Calendar, 
  Info, 
  FileSpreadsheet, 
  Edit2, 
  Filter, 
  X, 
  RotateCcw, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  Search,
  Anchor,
  User,
  Compass,
  Sparkles,
  Ship,
  Settings,
  Plus,
  Tag,
  Camera,
  Image,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Folder,
  List,
  SlidersHorizontal
} from 'lucide-react';
import { exportToExcel } from '../utils/export';
import { getMoonPhasesForRange } from '../utils/moonPhase';
import FishermanRegistrationForm from './FishermanRegistrationForm';
import { isSupabaseConfigured, uploadSpeciesPhotoToSupabase } from '../utils/supabase';
import ImageEditorModal from './ImageEditorModal';
import { EditFormModal } from './EditFormModal';

interface Props {
  forms: LandingForm[];
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onUpdate: (form: LandingForm) => void;
  onClearAll: () => void;
  fishermen: Fisherman[];
  onUpdateFisherman: (fisherman: Fisherman) => void;
  onDeleteFisherman: (id: string) => void;
  speciesList: Species[];
  onUpdateSpecies: (species: Species) => void;
  onDeleteSpecies: (id: string) => void;
}

// Função para verificar se a ficha possui informações faltando
const isFormIncomplete = (form: LandingForm): boolean => {
  if (!form) return true;
  // 1. Identificação Básica
  if (!form.idNumber || form.idNumber.trim() === '') return true;
  if (!form.identification?.fishermanName || form.identification.fishermanName.trim() === '') return true;
  if (!form.identification?.collectorName || form.identification.collectorName.trim() === '') return true;
  if (!form.identification?.location || form.identification.location.trim() === '') return true;
  if (!form.identification?.month || form.identification.month.trim() === '') return true;
  if (!form.identification?.year) return true;

  // 2. Dados da Pesca
  if (!form.fishing?.gearType || form.fishing.gearType.trim() === '') return true;
  if (!form.fishing?.departureDate || form.fishing.departureDate.trim() === '') return true;
  if (!form.fishing?.arrivalDate || form.fishing.arrivalDate.trim() === '') return true;
  if (!form.fishing?.fisherCount || form.fishing.fisherCount <= 0) return true;
  if (!form.fishing?.fishingDays || form.fishing.fishingDays <= 0) return true;

  // 3. Produção/Espécies
  if (!form.production || form.production.length === 0) return true;
  
  // Se algum item de produção estiver com campos importantes em branco ou inválidos
  const hasEmptyProduction = form.production.some(item => 
    !item.species || item.species.trim() === '' || !item.weight || item.weight <= 0
  );
  if (hasEmptyProduction) return true;

  return false;
};

// Componente de item isolado e memoizado para performance extrema
const FormItem = memo(({ 
  form, 
  isSelected, 
  isExpanded, 
  onToggleExpand, 
  onToggleSelect, 
  onEdit, 
  onDelete,
  onView
}: { 
  form: LandingForm; 
  isSelected: boolean; 
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (e: React.MouseEvent, id: string) => void;
  onEdit: (e: React.MouseEvent, form: LandingForm) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onView: (form: LandingForm) => void;
}) => {
  const incomplete = isFormIncomplete(form);

  return (
    <div className={`group rounded-2xl border transition-all overflow-hidden ${
      isSelected 
        ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20' 
        : incomplete 
          ? 'border-red-300 bg-red-50/30 dark:bg-red-950/10 shadow-sm hover:bg-red-50/45' 
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md'
    }`}>
      <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => onView(form)}>
        <div className="flex items-center gap-5 flex-1">
          <button 
            type="button" 
            onClick={(e) => onToggleSelect(e, form.id)} 
            className={`transition-colors p-1 ${isSelected ? 'text-blue-600' : 'text-slate-300 dark:text-slate-500 hover:text-slate-400 dark:hover:text-slate-300'}`}
          >
            {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
          </button>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 relative ${
                isSelected 
                  ? 'bg-blue-600 text-white' 
                  : incomplete
                    ? 'bg-red-500 text-white shadow shadow-red-200 dark:shadow-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                #{form.idNumber || '?'}
                {/* Floating dot representing synchronization status */}
                <span 
                  className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                    form.isOfflinePending 
                      ? 'bg-amber-500 animate-pulse' 
                      : 'bg-emerald-500'
                  }`} 
                  title={form.isOfflinePending ? 'Ficha pendente de sincronização local' : 'Ficha sincronizada com o servidor'}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Coletor</p>
                  {incomplete && (
                    <span className="bg-red-100 dark:bg-red-950/55 text-red-700 dark:text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Incompleto</span>
                  )}
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{form.identification.collectorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User size={18} className="text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Digitado por</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-1" title={form.identification.createdByEmail || 'Administrador'}>
                  {form.identification.createdByUsername || (form.identification.createdByEmail ? form.identification.createdByEmail.split('@')[0] : 'Administrador')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Localidade</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{form.identification.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Chegada</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {safeFormatDate(form.fishing.arrivalDate)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <button 
            type="button" 
            onClick={(e) => onEdit(e, form)} 
            className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all"
            title="Editar Ficha"
          >
            <Edit2 size={18} />
          </button>
          <button 
            type="button" 
            onClick={(e) => onDelete(e, form.id)} 
            className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-all"
            title="Excluir Ficha"
          >
            <Trash2 size={18} />
          </button>
          <button 
            type="button" 
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(form.id);
            }} 
            className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Estender Ficha (Visualização Rápida)"
          >
            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-5 pb-6 border-t border-slate-50 dark:border-slate-800 pt-6 bg-slate-50/50 dark:bg-slate-900/50 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-4 rounded-2xl border transition-all ${
              incomplete ? 'bg-red-50/15 dark:bg-red-950/10 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Infos da Ficha</h4>
                {incomplete && <span className="text-[9px] font-black text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-900/40 px-2 py-0.5 rounded-full uppercase">Ficha Incompleto</span>}
              </div>
              <div className="space-y-2 text-xs">
                {(() => {
                  const missingSpan = <span className="inline-flex items-center gap-1 text-[8px] font-extrabold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 px-1 py-0.5 rounded tracking-wider animate-pulse">⚠️ FALTANDO</span>;
                  return (
                    <>
                      <p><span className="text-slate-500 dark:text-slate-400">N° da Ficha:</span> {form.idNumber?.trim() ? <span className="font-bold text-slate-800 dark:text-slate-100">#{form.idNumber}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Proprietário:</span> {form.identification.fishermanName?.trim() ? <span className="font-bold text-blue-700 dark:text-blue-400">{form.identification.fishermanName}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Coletor:</span> {form.identification.collectorName?.trim() ? <span className="font-bold text-slate-700 dark:text-slate-200">{form.identification.collectorName}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Localidade:</span> {form.identification.location?.trim() ? <span className="font-bold text-slate-700 dark:text-slate-200">{form.identification.location}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Ano:</span> {form.identification.year ? <span className="font-bold text-slate-700 dark:text-slate-200">{form.identification.year}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Mês:</span> {form.identification.month?.trim() ? <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{form.identification.month}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Arte de pesca:</span> {form.fishing.gearType?.trim() ? <span className="font-bold text-slate-700 dark:text-slate-200">{form.fishing.gearType}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Data de Saída:</span> {form.fishing.departureDate?.trim() ? <span className="font-bold text-slate-700 dark:text-slate-200">{form.fishing.departureDate}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Data de Chegada:</span> {form.fishing.arrivalDate?.trim() ? <span className="font-bold text-slate-700 dark:text-slate-200">{form.fishing.arrivalDate}</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Qtd. de Pescadores:</span> {form.fishing.fisherCount && form.fishing.fisherCount > 0 ? <span className="font-bold text-slate-700 dark:text-slate-200">{form.fishing.fisherCount} pax</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Dias de Pesca:</span> {form.fishing.fishingDays && form.fishing.fishingDays > 0 ? <span className="font-bold text-slate-700 dark:text-slate-200">{form.fishing.fishingDays} d</span> : missingSpan}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Período:</span> {form.identification.period ? <span className="font-bold text-indigo-700 dark:text-indigo-400 capitalize">{form.identification.period}</span> : <span className="font-medium text-slate-400 dark:text-slate-500">Não informado (Opcional)</span>}</p>
                      <p><span className="text-slate-500 dark:text-slate-400">Pesqueiro:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{form.identification.fishingGround || 'Não informado (Opcional)'}</span></p>
                      <p><span className="text-slate-500 dark:text-slate-400">Tipo Embarcação:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{form.fishing.vesselType || 'Não informado (Opcional)'}</span></p>
                      <p><span className="text-slate-500 dark:text-slate-400">Nome Embarcação:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{form.identification.vesselName || 'Não informado (Opcional)'}</span></p>
                      <p><span className="text-slate-500 dark:text-slate-400">Digitado por:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{form.identification.createdByEmail || 'Administrador'}</span></p>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className={`md:col-span-2 p-4 rounded-2xl border overflow-x-auto transition-all ${
              incomplete && (!form.production || form.production.length === 0 || form.production.some(it => !it.species || !it.weight || it.weight <= 0))
                ? 'bg-red-50/15 dark:bg-red-950/10 border-red-200 dark:border-red-900/30' 
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Tabela de Produção e Capturas</h4>
                {(!form.production || form.production.length === 0) && (
                  <span className="text-[9px] font-black text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full uppercase">Falta Produção</span>
                )}
              </div>
              <table className="w-full text-xs min-w-[450px] md:min-w-full">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="text-left py-2 px-3">Espécie</th>
                    <th className="text-left py-2 px-3">Nome Científico</th>
                    <th className="text-center py-2 px-3">Peso</th>
                    <th className="text-right py-2 px-3">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {!form.production || form.production.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-red-650 bg-red-100/40 dark:bg-red-950/20 rounded-xl border border-dashed border-red-300 font-bold p-3">
                        ⚠️ NENHUMA ESPÉCIE DE PRODUÇÃO REGISTRADA NESTA FICHA! <br/>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">Fichas válidas precisam ter pelo menos 1 registro de espécie com peso preenchido.</span>
                      </td>
                    </tr>
                  ) : (
                    form.production.map(item => {
                      const speciesMissing = !item.species || item.species.trim() === '';
                      const weightMissing = !item.weight || item.weight <= 0;
                      return (
                        <tr key={item.id} className={`border-b border-slate-50 dark:border-slate-800 transition-colors ${speciesMissing || weightMissing ? 'bg-red-100/30' : ''}`}>
                          <td className="py-2 px-3">
                            {speciesMissing ? (
                              <span className="text-red-700 font-extrabold bg-red-100 px-1.5 py-0.5 rounded-md text-[10px]">⚠️ ESPÉCIE FALTANDO</span>
                            ) : (
                              <>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{item.species}</span>
                                {item.groupType === 'caranguejo_siri' && (
                                  <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 px-1.5 py-0.5 rounded-md w-max mt-0.5">
                                    🦀 {item.numCordas} cordas × {item.numExemplares} expl. × {item.pesoIndividual} kg | Preço: R$ {item.originalPrice?.toFixed(2)}/corda
                                  </span>
                                )}
                                {item.groupType === 'ostra' && (
                                  <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/40 px-1.5 py-0.5 rounded-md w-max mt-0.5">
                                    🦪 {item.numSacos} sacos × {item.pesoSaco} kg | Preço: R$ {item.originalPrice?.toFixed(2)}/saco
                                  </span>
                                )}
                                {item.groupType === 'marisco' && (
                                  <span className="block text-[10px] text-teal-600 dark:text-teal-400 font-medium bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/40 px-1.5 py-0.5 rounded-md w-max mt-0.5">
                                    🐚 {item.numSacos} sacos × {item.pesoSaco} kg | Polpa: {item.rendimentoPolpa} kg × R$ {item.originalPrice?.toFixed(2)}/kg
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-2 px-3 italic text-slate-500 dark:text-slate-450">{item.scientificName || '---'}</td>
                          <td className="py-2 px-3 text-center">
                            {weightMissing ? (
                              <span className="text-red-700 font-extrabold bg-red-100 px-1.5 py-0.5 rounded-md text-[10px]">⚠️ PESO FALTANDO / INVÁLIDO</span>
                            ) : (
                              <span className="font-bold text-slate-700 dark:text-slate-300">{item.weight.toFixed(1)} KG</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-blue-600 dark:text-blue-450">
                            {weightMissing ? (
                              <span className="text-slate-400">---</span>
                            ) : (
                              <span>R$ {(item.weight * item.price).toFixed(2)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const parseIdNumber = (idNum?: string): number => {
  if (!idNum) return 0;
  const match = idNum.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const MONTH_MAP: Record<string, number> = {
  'janeiro': 1, 'jan': 1,
  'fevereiro': 2, 'fev': 2,
  'março': 3, 'marco': 3, 'mar': 3,
  'abril': 4, 'abr': 4,
  'maio': 5, 'mai': 5,
  'junho': 6, 'jun': 6,
  'julho': 7, 'jul': 7,
  'agosto': 8, 'ago': 8,
  'setembro': 9, 'set': 9,
  'outubro': 10, 'out': 10,
  'novembro': 11, 'nov': 11,
  'dezembro': 12, 'dez': 12
};

const getMonthIndex = (month?: string): number => {
  if (!month) return 0;
  const m = month.toLowerCase().trim();
  const direct = MONTH_MAP[m];
  if (direct !== undefined) return direct;
  for (const [key, val] of Object.entries(MONTH_MAP)) {
    if (m.includes(key)) {
      return val;
    }
  }
  return 0;
};

const getFormCycleStartYear = (form: LandingForm): number => {
  const year = form.identification?.year || 0;
  const monthIdx = getMonthIndex(form.identification?.month);
  if (monthIdx === 0) return year;
  return (monthIdx >= 5) ? year : (year - 1);
};

const MyFormsList: React.FC<Props> = ({ 
  forms, 
  onDelete, 
  onDeleteMultiple, 
  onUpdate, 
  onClearAll,
  fishermen = [],
  onUpdateFisherman,
  onDeleteFisherman,
  speciesList = [],
  onUpdateSpecies,
  onDeleteSpecies
}) => {
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [logoError, setLogoError] = useState(false);

  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    forms.forEach(f => {
      const y = f.identification?.year;
      if (y) counts[y] = (counts[y] || 0) + 1;
    });
    return counts;
  }, [forms]);

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    forms.forEach(f => {
      const loc = f.identification?.location;
      if (loc) counts[loc] = (counts[loc] || 0) + 1;
    });
    return counts;
  }, [forms]);

  const handleYearCardClick = (year: number) => {
    clearFilters();
    setFilterYear(year.toString());
    setViewMode('list');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleLocationCardClick = (location: string) => {
    clearFilters();
    setFilterLocation(location);
    setViewMode('list');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<LandingForm | null>(null);
  const [viewingForm, setViewingForm] = useState<LandingForm | null>(null);
  const [editingFisherman, setEditingFisherman] = useState<Fisherman | null>(null);
  const [editingSpecies, setEditingSpecies] = useState<Species | null>(null);
  const [isAddingSpecies, setIsAddingSpecies] = useState(false);
  const [filterSpeciesSearch, setFilterSpeciesSearch] = useState('');
  
  // Photo states for species
  const [selectedSpeciesForView, setSelectedSpeciesForView] = useState<Species | null>(null);
  const [activeSpeciesPhotoIndex, setActiveSpeciesPhotoIndex] = useState<number>(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [addSpeciesImages, setAddSpeciesImages] = useState<string[]>([]);

  // Image Editor States
  const [editorImageSrc, setEditorImageSrc] = useState<string>('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorCallback, setEditorCallback] = useState<((b64: string) => void) | null>(null);

  // Base64 converter helper
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Unified image upload handler utilizing storage bucket and base64 fallback
  const handlePhotoUpload = async (speciesId: string, files: FileList, currentImages: string[] = []): Promise<string[]> => {
    const newImages = [...currentImages];
    setIsUploading(true);
    setUploadError(null);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await convertToBase64(file);
        
        if (isSupabaseConfigured) {
          try {
            const publicUrl = await uploadSpeciesPhotoToSupabase(speciesId, base64);
            newImages.push(publicUrl);
          } catch (supabaseError: any) {
            console.error("Erro no upload do Supabase Storage. Usando base64 local:", supabaseError);
            const errMsg = supabaseError?.message || String(supabaseError);
            if (errMsg.includes("Bucket not found") || errMsg.includes("bucket_not_found") || errMsg.includes("does not exist")) {
              setUploadError("O bucket 'species-photos' não existe. Crie o bucket 'species-photos' como público (Public) no menu Storage do painel do seu Supabase para ativar a gravação em tempo real.");
            } else {
              setUploadError(`Erro no upload (salvo localmente): ${errMsg}`);
            }
            newImages.push(base64);
          }
        } else {
          newImages.push(base64);
        }
      }
    } catch (err: any) {
      console.error("Erro no processamento de fotos:", err);
      setUploadError("Não foi possível processar algumas fotos. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
    
    return newImages;
  };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renderLimit, setRenderLimit] = useState(30);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'single-form' | 'bulk-form' | 'fisherman' | 'species' | 'clear-all';
    id?: string;
    ids?: string[];
    message: string;
  } | null>(null);
  
  // Filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterIncompleteOnly, setFilterIncompleteOnly] = useState(false);

  // Advanced Filters for Landing Forms List
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMainSpecies, setFilterMainSpecies] = useState('');
  const [filterFishermanName, setFilterFishermanName] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fisherman Filters
  const [filterFishermanSearch, setFilterFishermanSearch] = useState('');
  const [filterFishermanLocation, setFilterFishermanLocation] = useState('');
  const [filterFishermanGear, setFilterFishermanGear] = useState('');

  // useDeferredValue hooks to make search and table updates extremely fluid and non-blocking
  const deferredForms = useDeferredValue(forms);
  const deferredFishermen = useDeferredValue(fishermen);
  const deferredGlobalSearch = useDeferredValue(globalSearch);
  const deferredFilterStartDate = useDeferredValue(filterStartDate);
  const deferredFilterEndDate = useDeferredValue(filterEndDate);
  const deferredFilterMainSpecies = useDeferredValue(filterMainSpecies);
  const deferredFilterFishermanName = useDeferredValue(filterFishermanName);
  const deferredFilterFishermanSearch = useDeferredValue(filterFishermanSearch);
  const deferredFilterSpeciesSearch = useDeferredValue(filterSpeciesSearch);

  const years = useMemo(() => Array.from(new Set(deferredForms.map(f => f.identification?.year))).filter((y): y is number => typeof y === 'number').sort((a, b) => b - a), [deferredForms]);
  const locations = useMemo(() => Array.from(new Set(deferredForms.map(f => f.identification?.location))).filter((l): l is string => typeof l === 'string').sort(), [deferredForms]);
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  const fishermanLocations = useMemo(() => Array.from(new Set(deferredFishermen.map(f => f.location))).sort(), [deferredFishermen]);
  const fishermanGears = useMemo(() => Array.from(new Set(deferredFishermen.map(f => f.gearType))).sort(), [deferredFishermen]);

  // Unique species and fishermen across all landing forms
  const allUniqueSpecies = useMemo(() => {
    const set = new Set<string>();
    deferredForms.forEach(f => f.production?.forEach(p => {
      if (p.species) set.add(p.species);
    }));
    return Array.from(set).sort();
  }, [deferredForms]);

  const allUniqueFishermen = useMemo(() => {
    const set = new Set<string>();
    deferredForms.forEach(f => {
      if (f.identification?.fishermanName) {
        set.add(f.identification.fishermanName);
      }
    });
    return Array.from(set).sort();
  }, [deferredForms]);

  const filteredForms = useMemo(() => {
    const list = deferredForms.filter(f => {
      const matchYear = !filterYear || (f.identification?.year && f.identification.year.toString() === filterYear);
      const matchLocation = !filterLocation || f.identification?.location === filterLocation;
      const matchMonth = !filterMonth || (f.identification?.month && f.identification.month.toLowerCase() === filterMonth.toLowerCase());
      const matchIncomplete = !filterIncompleteOnly || isFormIncomplete(f);
      
      const searchLower = deferredGlobalSearch.toLowerCase().trim();
      const matchSearch = !searchLower || (
        (f.identification?.fishermanName || '').toLowerCase().includes(searchLower) ||
        (f.identification?.collectorName || '').toLowerCase().includes(searchLower) ||
        (f.identification?.vesselName || '').toLowerCase().includes(searchLower) ||
        (f.identification?.location || '').toLowerCase().includes(searchLower) ||
        (f.identification?.month || '').toLowerCase().includes(searchLower) ||
        (f.identification?.year || '').toString().includes(searchLower) ||
        (f.identification?.period || '').toLowerCase().includes(searchLower) ||
        (f.idNumber || '').toLowerCase().includes(searchLower) ||
        (f.fishing?.gearType || '').toLowerCase().includes(searchLower) ||
        (f.production || []).some(item => 
          (item.species || '').toLowerCase().includes(searchLower) ||
          (item.scientificName || '').toLowerCase().includes(searchLower)
        )
      );

      // Start date / end date validation
      let matchDate = true;
      const recordDateStr = f.fishing?.arrivalDate || f.fishing?.departureDate || f.createdAt;
      if (recordDateStr) {
        const recordDatePart = recordDateStr.substring(0, 10);
        if (deferredFilterStartDate && recordDatePart < deferredFilterStartDate) {
          matchDate = false;
        }
        if (deferredFilterEndDate && recordDatePart > deferredFilterEndDate) {
          matchDate = false;
        }
      }

      // Main species validation
      const matchSpecies = !deferredFilterMainSpecies || (f.production || []).some(p => p.species === deferredFilterMainSpecies);

      // Fisherman name validation
      const matchFisherman = !deferredFilterFishermanName || f.identification?.fishermanName === deferredFilterFishermanName;

      return matchYear && matchLocation && matchMonth && matchIncomplete && matchSearch && matchDate && matchSpecies && matchFisherman;
    });

    // Otimização de Performance Extrema via Schwartzian transform:
    // Mapeia cada elemento compilando suas chaves de ordenação caras e faz a ordenação O(N).
    // Evita repetir chamadas lentas de regex, parsing de data, lowercase e de trim em múltiplos de N log N.
    const mapped = list.map(item => {
      const monthIdx = getMonthIndex(item.identification?.month);
      const year = item.identification?.year || 0;
      const cycleYear = monthIdx === 0 ? year : (monthIdx >= 5 ? year : year - 1);
      const idNumVal = parseIdNumber(item.idNumber);
      const locKey = (item.identification?.location || '').toLowerCase().trim();
      return {
        item,
        cycleYear,
        idNumVal,
        locKey
      };
    });

    mapped.sort((a, b) => {
      if (a.cycleYear !== b.cycleYear) {
        return b.cycleYear - a.cycleYear;
      }
      if (a.idNumVal !== b.idNumVal) {
        return a.idNumVal - b.idNumVal;
      }
      if (a.locKey !== b.locKey) {
        return a.locKey.localeCompare(b.locKey, 'pt');
      }
      return b.item.id.localeCompare(a.item.id);
    });

    return mapped.map(x => x.item);
  }, [deferredForms, filterYear, filterLocation, filterMonth, filterIncompleteOnly, deferredGlobalSearch, deferredFilterStartDate, deferredFilterEndDate, deferredFilterMainSpecies, deferredFilterFishermanName]);

  useEffect(() => {
    setRenderLimit(30);
  }, [filterYear, filterLocation, filterMonth, filterIncompleteOnly, deferredGlobalSearch, viewMode, deferredFilterStartDate, deferredFilterEndDate, deferredFilterMainSpecies, deferredFilterFishermanName]);

  const filteredFishermen = useMemo(() => {
    return deferredFishermen.filter(f => {
      const matchSearch = !deferredFilterFishermanSearch || f.name.toLowerCase().includes(deferredFilterFishermanSearch.toLowerCase());
      const matchLocation = !filterFishermanLocation || f.location === filterFishermanLocation;
      const matchGear = !filterFishermanGear || f.gearType === filterFishermanGear;
      return matchSearch && matchLocation && matchGear;
    });
  }, [deferredFishermen, deferredFilterFishermanSearch, filterFishermanLocation, filterFishermanGear]);

  const filteredSpeciesList = useMemo(() => {
    return (speciesList || []).filter(s => {
      const matchSearch = !deferredFilterSpeciesSearch || 
        (s.commonName && s.commonName.toLowerCase().includes(deferredFilterSpeciesSearch.toLowerCase())) ||
        (s.scientificName && s.scientificName.toLowerCase().includes(deferredFilterSpeciesSearch.toLowerCase()));
      return matchSearch;
    });
  }, [speciesList, deferredFilterSpeciesSearch]);

  useEffect(() => {
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        if (renderLimit < filteredForms.length) {
          setRenderLimit(prev => prev + 30);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [renderLimit, filteredForms.length]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const toggleSelect = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      return newSelected;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const allFilteredSelected = filteredForms.length > 0 && filteredForms.every(f => selectedIds.has(f.id));
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredForms.forEach(f => next.delete(f.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredForms.forEach(f => next.add(f.id));
        return next;
      });
    }
  }, [filteredForms, selectedIds]);

  const handleEditTrigger = useCallback((e: React.MouseEvent, form: LandingForm) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingForm({ ...form });
  }, []);

  const handleSingleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({
      type: 'single-form',
      id,
      message: "Tem certeza que deseja excluir esta ficha permanentemente? Esta ação não pode ser desfeita."
    });
  }, []);

  // Virtualized List Helpers for ultra-smooth rendering of hundreds/thousands of forms
  const listRef = useRef<any>(null);

  const getItemSize = useCallback((index: number) => {
    const form = filteredForms[index];
    if (!form) return 108;
    
    if (expandedId === form.id) {
      // Estimated height when expanded: 360px details base + ~52px per row in the production table
      const prodCount = form.production?.length || 0;
      return 360 + Math.max(1, prodCount) * 52;
    }
    
    return 108; // default collapsed card height (96px + 12px padding)
  }, [filteredForms, expandedId]);

  const Row = useCallback(({ index, style, ariaAttributes, selectedIds, expandedId }: { 
    index: number; 
    style: React.CSSProperties; 
    ariaAttributes: any;
    selectedIds: Set<string>;
    expandedId: string | null;
  }) => {
    const form = filteredForms[index];
    if (!form) return null;
    return (
      <div style={{ ...style, paddingBottom: '12px' }} {...ariaAttributes}>
        <FormItem 
          form={form}
          isSelected={selectedIds.has(form.id)}
          isExpanded={expandedId === form.id}
          onToggleExpand={toggleExpand}
          onToggleSelect={toggleSelect}
          onEdit={handleEditTrigger}
          onDelete={handleSingleDelete}
          onView={setViewingForm}
        />
      </div>
    );
  }, [filteredForms, toggleExpand, toggleSelect, handleEditTrigger, handleSingleDelete, setViewingForm]);

  const rowProps = useMemo(() => ({ selectedIds, expandedId }), [selectedIds, expandedId]);

  const clearFilters = () => {
    setFilterYear('');
    setFilterLocation('');
    setFilterMonth('');
    setFilterIncompleteOnly(false);
    setGlobalSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMainSpecies('');
    setFilterFishermanName('');
  };

  const handleBulkDelete = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (selectedIds.size === 0) return;
    setDeleteConfirm({
      type: 'bulk-form',
      ids: Array.from(selectedIds),
      message: `Tem certeza que deseja excluir as ${selectedIds.size} fichas selecionadas permanentemente? Esta ação não pode ser desfeita.`
    });
  };

  const handleBulkExport = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const toExport = forms.filter(f => selectedIds.has(f.id));
    exportToExcel(toExport, `MPA_Piaui_Selecao_${new Date().toISOString().split('T')[0]}`);
  };

  const handleGlobalClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({
      type: 'clear-all',
      message: isSupabaseConfigured
        ? "ATENÇÃO: Todas as fichas serão excluídas PERMANENTEMENTE tanto localmente no navegador quanto do banco de dados na nuvem (Supabase). Esta ação de limpeza é irreversível e limpará tudo para que você possa testar do zero. Deseja continuar?"
        : "ATENÇÃO: Todas as fichas serão excluídas permanentemente do navegador. Esta ação não pode ser desfeita. Deseja continuar?"
    });
  };

  const allSelected = filteredForms.length > 0 && filteredForms.every(f => selectedIds.has(f.id));

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-32 font-sans">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-10 pointer-events-none">
          <Anchor size={220} className="stroke-[1.5]" />
        </div>
        <div className="space-y-2 relative z-10 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Painel de Fichas</h2>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
            Gerencie e explore os seus registros e relatórios de desembarque pesqueiro. Navegue pelas pastas e anos de coleta ou visualize a listagem completa de todas as fichas enviadas.
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 self-start mt-6 max-w-md w-full sm:w-80 relative z-10">
          <button
            type="button"
            onClick={() => {
              setViewMode('grouped');
              clearFilters();
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all font-bold text-xs select-none w-1/2 justify-center cursor-pointer ${
              viewMode === 'grouped' 
                ? 'bg-white text-blue-800 shadow-md' 
                : 'text-white hover:bg-white/5'
            }`}
          >
            <Folder size={14} />
            <span>Diretórios</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all font-bold text-xs select-none w-1/2 justify-center cursor-pointer ${
              viewMode === 'list' 
                ? 'bg-white text-blue-800 shadow-md' 
                : 'text-white hover:bg-white/5'
            }`}
          >
            <List size={14} />
            <span>Lista Completa</span>
          </button>
        </div>
      </div>

      <div>
        <>
          {forms.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4"><Info size={32} /></div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Nenhuma ficha encontrada</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2 text-[13px] md:text-sm leading-relaxed">
                Suas fichas e registros de desembarque aparecerão nesta aba após os envios.
              </p>
            </div>
          ) : viewMode === 'grouped' ? (
            <div className="space-y-8 animate-in fade-in duration-300 animate-out duration-300">
              {/* Blocos do diretório organizados verticalmente */}
              <div className="flex flex-col gap-10">
                {/* Diretório de anos */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Calendar size={18} className="text-blue-500" />
                    <span>Filtrar por Ano</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {years.map((y) => {
                      const count = yearCounts[y] || 0;
                      return (
                        <button
                           key={y}
                           type="button"
                           onClick={() => handleYearCardClick(y)}
                           className="flex flex-col justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md rounded-2xl transition-all text-left group"
                        >
                           <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">Ano</span>
                           <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{y}</span>
                           <span className="text-xs text-slate-500 dark:text-slate-400 mt-3 bg-slate-50 dark:bg-slate-800/60 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 px-2.5 py-1 rounded-lg w-fit transition-colors">
                            {count} {count === 1 ? 'ficha' : 'fichas'}
                           </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Diretório de Localidades */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <MapPin size={18} className="text-emerald-500" />
                    <span>Filtrar por Localidade</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {locations.map(loc => {
                      const count = locationCounts[loc] || 0;
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => handleLocationCardClick(loc)}
                          className="flex flex-col justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md rounded-2xl transition-all text-left group"
                        >
                          <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">Localidade</span>
                          <span className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1 truncate max-w-full group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" title={loc}>{loc}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-3 bg-slate-50 dark:bg-slate-800/60 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 px-2.5 py-1 rounded-lg w-fit transition-colors">
                            {count} {count === 1 ? 'ficha' : 'fichas'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Botão de Voltar para painel de pastas */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('grouped');
                    clearFilters();
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  className="flex items-center gap-2 text-slate-650 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow"
                >
                  <ChevronLeft size={16} /> Voltar para Diretórios
                </button>
                 {(filterYear || filterLocation || filterMonth || filterIncompleteOnly || globalSearch || filterStartDate || filterEndDate || filterMainSpecies || filterFishermanName) && (
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-xl uppercase flex items-center gap-1.5 flex-wrap">
                    {globalSearch && <span>Busca: <strong>"{globalSearch}"</strong></span>}
                    {filterYear && <span> {globalSearch ? '•' : ''} Ano: <strong>{filterYear}</strong></span>}
                    {filterLocation && <span> • Local: <strong>{filterLocation}</strong></span>}
                    {filterMonth && <span> • Mês: <strong>{filterMonth}</strong></span>}
                    {filterStartDate && <span> • Início: <strong>{filterStartDate}</strong></span>}
                    {filterEndDate && <span> • Fim: <strong>{filterEndDate}</strong></span>}
                    {filterMainSpecies && <span> • Espécie: <strong>{filterMainSpecies}</strong></span>}
                    {filterFishermanName && <span> • Pescador: <strong>{filterFishermanName}</strong></span>}
                    {filterIncompleteOnly && <span className="text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30 animate-pulse"> • Faltando Informações</span>}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {allSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                      {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-black animate-in zoom-in">{selectedIds.size} SELECIONADOS</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest"><Filter size={14} /> Filtros Rápidos</div>
                </div>

                {/* Campo de Busca Global */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={e => setGlobalSearch(e.target.value)}
                    placeholder="Busca global: pesquise por nome do pescador, coletor, espécie de peixe, embarcação, período ou N° da ficha..."
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 font-semibold transition-all outline-none"
                  />
                  {globalSearch && (
                    <button
                      type="button"
                      onClick={() => setGlobalSearch('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-50" value={filterYear} onChange={e => setFilterYear(e.target.value)}><option value="" className="dark:bg-slate-900">Todos os Anos</option>{years.map(y => <option key={y} value={y} className="dark:bg-slate-900">{y}</option>)}</select>
                  <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-50" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}><option value="" className="dark:bg-slate-900">Todas as Localidades</option>{locations.map(l => <option key={l} value={l} className="dark:bg-slate-900">{l}</option>)}</select>
                  <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-50" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}><option value="" className="dark:bg-slate-900">Todos os Meses</option>{months.map(m => <option key={m} value={m} className="dark:bg-slate-900">{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}</select>
                  <select 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-50"
                    value={filterIncompleteOnly ? 'incomplete' : 'all'}
                    onChange={e => setFilterIncompleteOnly(e.target.value === 'incomplete')}
                  >
                    <option value="all" className="dark:bg-slate-900">Todos os Status</option>
                    <option value="incomplete" className="dark:bg-slate-900">⚠️ Faltando Dados (Alerta Vermelho)</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm transition-all ${showAdvancedFilters ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <SlidersHorizontal size={16} /> 
                    {showAdvancedFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
                  </button>
                </div>

                {/* Filtros Avançados Expansíveis */}
                {showAdvancedFilters && (
                  <div className="p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Filtros Avançados de Fichas</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Data Início</label>
                        <input 
                          type="date" 
                          value={filterStartDate} 
                          onChange={e => setFilterStartDate(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Data Fim</label>
                        <input 
                          type="date" 
                          value={filterEndDate} 
                          onChange={e => setFilterEndDate(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Espécie Principal</label>
                        <select 
                          value={filterMainSpecies} 
                          onChange={e => setFilterMainSpecies(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">Todas as Espécies</option>
                          {allUniqueSpecies.map(sp => (
                            <option key={sp} value={sp}>{sp.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Pescador</label>
                        <select 
                          value={filterFishermanName} 
                          onChange={e => setFilterFishermanName(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">Todos os Pescadores</option>
                          {allUniqueFishermen.map(fName => (
                            <option key={fName} value={fName}>{fName.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <button 
                          type="button" 
                          onClick={clearFilters} 
                          className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <X size={14} /> Limpar Filtros
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 w-full">
                <button 
                  type="button" 
                  onClick={handleGlobalClear} 
                  className="flex items-center gap-2 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 px-5 py-2.5 rounded-xl font-bold border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/10 transition-all text-sm group shadow-sm"
                >
                  <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> Apagar Tudo
                </button>
                <button 
                  type="button" 
                  onClick={() => exportToExcel(filteredForms, `MPA_Piaui_Filtro_${new Date().toISOString().split('T')[0]}`)} 
                  className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 dark:shadow-none transition-all text-sm"
                >
                  <FileSpreadsheet size={18} /> Exportar Filtrados
                </button>
              </div>

              {/* Legenda de Status de Sincronização */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Sincronização:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Sincronizada (Servidor)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Pendente (Dispositivo Local)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Qualidade:</span>
                  <span className="bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 font-bold px-2 py-0.5 rounded text-[10px] border border-red-100 dark:border-red-900/30">⚠️ Dados Incompletos</span>
                </div>
              </div>

              <div className="space-y-3">
                {filteredForms.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-3xl border border-slate-150">
                    <Search size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium">Nenhum registro encontrado para os filtros.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100/80 dark:border-slate-800/80 rounded-3xl bg-slate-50/10 dark:bg-slate-950/20 p-2 overflow-hidden">
                    <VirtualizedList
                      listRef={listRef}
                      height={750}
                      rowCount={filteredForms.length}
                      rowHeight={getItemSize}
                      width="100%"
                      className="scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
                      rowComponent={Row}
                      rowProps={rowProps}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-10 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[55] animate-in slide-in-from-bottom duration-300 max-w-full">
            <div className="bg-slate-900 text-white p-1.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl flex items-center justify-between sm:justify-start gap-2 sm:gap-4 border border-slate-700">
                <div className="px-3 sm:px-4 py-1 border-r border-slate-700/60 shrink-0">
                    <span className="text-xs sm:text-sm font-black text-blue-400">{selectedIds.size}</span>
                    <span className="ml-1 sm:ml-2 text-[10px] font-bold text-slate-400 uppercase">Itens</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-grow sm:flex-grow-0 justify-end">
                    <button 
                      type="button" 
                      onClick={handleBulkExport} 
                      className="flex items-center gap-1 bg-slate-800 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all hover:bg-slate-700"
                    >
                      <FileSpreadsheet size={14} className="text-green-500" /> 
                      <span className="hidden xs:inline sm:inline">Exportar</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleBulkDelete} 
                      className="flex items-center gap-1 bg-red-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all hover:bg-red-700"
                    >
                      <Trash2 size={14} /> 
                      <span>Excluir <span className="hidden sm:inline">Selecionados</span></span>
                    </button>
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="p-1.5 sm:p-2.5 text-slate-400 hover:text-white transition-colors shrink-0">
                      <X size={16} />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Modal de Confirmação Customizado (Resolve bloqueios de iframes) */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl sm:rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 p-4 sm:p-6 space-y-4 sm:space-y-6 font-sans">
            <div className="flex items-center gap-3 text-red-650">
              <div className="p-3 bg-red-50 rounded-full">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-black tracking-tight text-slate-800">Confirmar Exclusão</h3>
            </div>
            
            <p className="text-slate-600 text-sm leading-relaxed">
              {deleteConfirm.message}
            </p>
            
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'single-form' && deleteConfirm.id) {
                    onDelete(deleteConfirm.id);
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      next.delete(deleteConfirm.id!);
                      return next;
                    });
                  } else if (deleteConfirm.type === 'bulk-form' && deleteConfirm.ids) {
                    onDeleteMultiple(deleteConfirm.ids);
                    setSelectedIds(new Set());
                  } else if (deleteConfirm.type === 'fisherman' && deleteConfirm.id) {
                    onDeleteFisherman(deleteConfirm.id);
                  } else if (deleteConfirm.type === 'species' && deleteConfirm.id) {
                    onDeleteSpecies(deleteConfirm.id);
                  } else if (deleteConfirm.type === 'clear-all') {
                    onClearAll();
                  }
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-100 dark:shadow-none transition-all text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingForm && (
        <div id="viewing-form-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Eye size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">Visualização Detalhada da Ficha</h2>
                  <p className="text-[10px] text-blue-100 font-bold uppercase">Código Identificador: #{viewingForm.idNumber || 'S/N'}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setViewingForm(null)} 
                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors font-bold"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              {/* Status Banner */}
              {(() => {
                const incomplete = isFormIncomplete(viewingForm);
                return (
                  <div className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                    incomplete 
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-350' 
                      : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-350'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{incomplete ? '⚠️' : '✅'}</span>
                      <div>
                        <p className="font-bold text-sm">Status do Formulário: {incomplete ? 'Incompleto' : 'Completo e Válido'}</p>
                        <p className="text-[11px] opacity-90">
                          {incomplete 
                            ? 'Esta ficha possui algumas informações obrigatórias ausentes ou valores zerados.' 
                            : 'Todos os campos obrigatórios estão devidamente preenchidos e validados.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. IDENTIFICAÇÃO BÁSICA */}
                <div className="bg-slate-50 dark:bg-slate-800/45 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 font-bold">
                    <User size={18} className="text-blue-500" />
                    <h3 className="text-xs uppercase tracking-wider">Dados de Identificação</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">N° da Ficha</p>
                      <p className="font-bold text-slate-850 dark:text-slate-200 text-sm">#{viewingForm.idNumber || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Localidade/Porto</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.identification.location || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Coletor Responsável</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.identification.collectorName || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Proprietário/Pescador</p>
                      <p className="font-bold text-blue-600 dark:text-blue-400">{viewingForm.identification.fishermanName || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Mês de Referência</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{viewingForm.identification.month || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Ano de Referência</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.identification.year || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Período</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{viewingForm.identification.period || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Pesqueiro</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.identification.fishingGround || 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                {/* 2. DADOS DA PESCA E ESFORÇO */}
                <div className="bg-slate-50 dark:bg-slate-800/45 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 font-bold">
                    <Compass size={18} className="text-emerald-500" />
                    <h3 className="text-xs uppercase tracking-wider">Esforço de Pesca & Embarcação</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Tipo de Embarcação</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.fishing.vesselType || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Nome da Embarcação</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.identification.vesselName || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Meio de Propulsão</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.fishing.propulsionType || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Arte de Pesca</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{viewingForm.fishing.gearType || '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Data de Saída</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{safeFormatDate(viewingForm.fishing.departureDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Data de Chegada</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{safeFormatDate(viewingForm.fishing.arrivalDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Qtd. Pescadores</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.fishing.fisherCount ? `${viewingForm.fishing.fisherCount} pax` : '---'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Dias de Pesca</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{viewingForm.fishing.fishingDays ? `${viewingForm.fishing.fishingDays} dias` : '---'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. GEAR SPECIFICS (Apetrechos) */}
              {viewingForm.gear && Object.keys(viewingForm.gear).some(key => viewingForm.gear![key] !== undefined && viewingForm.gear![key] !== null && viewingForm.gear![key] !== '') && (
                <div className="bg-slate-50 dark:bg-slate-800/45 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 font-bold">
                    <Settings size={16} className="text-purple-500" />
                    <h3 className="text-xs uppercase tracking-wider">Especificações do Apetrecho ({viewingForm.fishing.gearType})</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    {Object.entries(viewingForm.gear).map(([key, value]) => {
                      if (value === undefined || value === null || value === '') return null;
                      
                      // Traduz as chaves para rótulos legíveis
                      const labels: Record<string, string> = {
                        meshSize: 'Tamanho da Malha (mm)',
                        meshSizeInches: 'Tamanho da Malha (Pol.)',
                        length: 'Comprimento (m)',
                        height: 'Altura (m)',
                        hookCount: 'Quantidade de Anzóis',
                        hookSize: 'Tamanho do Anzol',
                        lineType: 'Tipo de Linha',
                        trapCount: 'Quantidade de Armadilhas/Manjais',
                        numLeds: 'Quantidade de LEDs',
                        collectType: 'Tipo de Coleta'
                      };

                      return (
                        <div key={key}>
                          <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{labels[key] || key}</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. TABELA DE PRODUÇÃO */}
              <div className="bg-slate-50 dark:bg-slate-800/45 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 font-sans">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 font-bold">
                  <Tag size={18} className="text-indigo-500" />
                  <h3 className="text-xs uppercase tracking-wider">Produção Detalhada</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black text-left">
                        <th className="py-2 px-3">Espécie</th>
                        <th className="py-2 px-3">Nome Científico</th>
                        <th className="py-2 px-3 text-center">Peso</th>
                        <th className="py-2 px-3 text-right">Preço Unitário</th>
                        <th className="py-2 px-3 text-right">Valor Total Estimado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {!viewingForm.production || viewingForm.production.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-red-500 font-bold">
                            Nenhuma espécie de produção registrada nesta ficha!
                          </td>
                        </tr>
                      ) : (
                        viewingForm.production.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.species}</span>
                              {item.groupType === 'caranguejo_siri' && (
                                <span className="block text-[10px] text-indigo-600 dark:text-indigo-450 mt-0.5 font-medium">
                                  🦀 {item.numCordas} cordas × {item.numExemplares} expl. × {item.pesoIndividual} kg
                                </span>
                              )}
                              {item.groupType === 'ostra' && (
                                <span className="block text-[10px] text-purple-600 dark:text-purple-405 mt-0.5 font-medium">
                                  🦪 {item.numSacos} sacos × {item.pesoSaco} kg
                                </span>
                              )}
                              {item.groupType === 'marisco' && (
                                <span className="block text-[10px] text-teal-600 dark:text-teal-450 mt-0.5 font-medium">
                                  🐚 {item.numSacos} sacos × {item.pesoSaco} kg | Polpa: {item.rendimentoPolpa} kg
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 italic text-slate-500 dark:text-slate-400">{item.scientificName || '---'}</td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">{item.weight ? `${item.weight.toFixed(1)} KG` : '---'}</td>
                            <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">R$ {item.price ? item.price.toFixed(2) : '0.00'}</td>
                            <td className="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">R$ {item.weight && item.price ? (item.weight * item.price).toFixed(2) : '0.00'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. METADADOS E HISTÓRICO */}
              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex flex-wrap justify-between gap-2 px-2">
                <p>Criado em: {new Date(viewingForm.createdAt || '').toLocaleString()}</p>
                <p>Digitado por: {viewingForm.identification.createdByEmail || 'Administrador'} ({viewingForm.identification.createdByUsername || 'admin'})</p>
                {viewingForm.isOfflinePending !== undefined && (
                  <p>Sincronização: {viewingForm.isOfflinePending ? '⚠️ Aguardando conexão' : '✅ Sincronizado'}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 bg-slate-50 dark:bg-slate-900 justify-end">
              <button
                type="button"
                onClick={() => setViewingForm(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setViewingForm(null);
                  handleSingleDelete(e, viewingForm.id);
                }}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-450 border border-red-200 dark:border-red-900/40 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={16} /> Excluir Ficha
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setViewingForm(null);
                  handleEditTrigger(e, viewingForm);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-100 dark:shadow-none transition-all flex items-center gap-2 cursor-pointer"
              >
                <Edit2 size={16} /> Editar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {editingForm && (
        <EditFormModal
          editingForm={editingForm}
          onClose={() => setEditingForm(null)}
          onSave={(cleanForm) => {
            onUpdate(cleanForm);
            setEditingForm(null);
          }}
        />
      )}

      {editingFisherman && (
        <div id="editing-fisherman-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <div className="flex items-center gap-2 font-bold">
                <User size={18} />
                <h2 className="text-base sm:text-xl font-black uppercase">Editar Cadastro de Pescador</h2>
              </div>
              <button type="button" onClick={() => setEditingFisherman(null)} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors font-bold"><X size={20} /></button>
            </div>
            <div className="p-4 sm:p-8 max-h-[80vh] overflow-y-auto">
              <FishermanRegistrationForm 
                editingFisherman={editingFisherman}
                onSave={(updated) => {
                  onUpdateFisherman(updated);
                  setEditingFisherman(null);
                }}
                onCancel={() => setEditingFisherman(null)}
              />
            </div>
          </div>
        </div>
      )}

      {editingSpecies && (
        <div id="editing-species-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Tag size={18} />
                <h2 className="text-sm font-black uppercase">Editar Espécie</h2>
              </div>
              <button type="button" onClick={() => setEditingSpecies(null)} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors font-bold"><X size={20} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingSpecies.commonName.trim() && editingSpecies.scientificName.trim()) {
                onUpdateSpecies({
                  ...editingSpecies,
                  commonName: standardizeText(editingSpecies.commonName),
                  scientificName: standardizeScientificName(editingSpecies.scientificName)
                });
                setEditingSpecies(null);
              }
            }} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Popular</label>
                <input
                  type="text"
                  required
                  value={editingSpecies.commonName}
                  onChange={e => setEditingSpecies({...editingSpecies, commonName: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Científico</label>
                <input
                  type="text"
                  required
                  value={editingSpecies.scientificName}
                  onChange={e => setEditingSpecies({...editingSpecies, scientificName: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 italic"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Família</label>
                <input
                  type="text"
                  placeholder="Ex: Lutjanidae..."
                  value={editingSpecies.family || ''}
                  onChange={e => setEditingSpecies({...editingSpecies, family: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Ordem</label>
                <input
                  type="text"
                  placeholder="Ex: Perciformes..."
                  value={editingSpecies.order || ''}
                  onChange={e => setEditingSpecies({...editingSpecies, order: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Grupo</label>
                <input
                  type="text"
                  placeholder="Ex: Peixes, Crustáceos..."
                  value={editingSpecies.group || ''}
                  onChange={e => setEditingSpecies({...editingSpecies, group: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Dados de Conservação (IUCN Link)</label>
                <input
                  type="url"
                  placeholder="Ex: https://www.iucnredlist.org/species/..."
                  value={editingSpecies.conservationUrl || ''}
                  onChange={e => setEditingSpecies({...editingSpecies, conservationUrl: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-850"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Ver mais (FishBase Link)</label>
                <input
                  type="url"
                  placeholder="Ex: https://www.fishbase.se/summary/..."
                  value={editingSpecies.seeMoreUrl || ''}
                  onChange={e => setEditingSpecies({...editingSpecies, seeMoreUrl: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-850"
                />
              </div>

              {/* Upload Fotos na Edição */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Camera size={14} className="text-slate-400" /> Fotos da Espécie
                </label>
                
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-100/50 transition-colors">
                  <input 
                    type="file" 
                    id="edit-species-new-photos"
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        try {
                          const file = e.target.files[0];
                          const b64 = await convertToBase64(file);
                          setEditorImageSrc(b64);
                          setEditorCallback(() => async (croppedB64: string) => {
                            if (!editingSpecies) return;
                            setIsUploading(true);
                            setUploadError(null);
                            try {
                              let finalUrl = croppedB64;
                              if (isSupabaseConfigured) {
                                finalUrl = await uploadSpeciesPhotoToSupabase(editingSpecies.id, croppedB64);
                              }
                              setEditingSpecies({
                                ...editingSpecies,
                                images: [...(editingSpecies.images || []), finalUrl]
                              });
                            } catch (uploadErr: any) {
                              console.error("Erro no upload do Supabase:", uploadErr);
                              setUploadError("Falha ao salvar no Supabase. Salvando localmente.");
                              setEditingSpecies({
                                ...editingSpecies,
                                images: [...(editingSpecies.images || []), croppedB64]
                              });
                            } finally {
                              setIsUploading(false);
                            }
                          });
                          setIsEditorOpen(true);
                          e.target.value = '';
                        } catch (err) {
                          console.error("Erro ao ler imagem:", err);
                        }
                      }
                    }}
                    disabled={isUploading}
                  />
                  <label htmlFor="edit-species-new-photos" className="cursor-pointer flex flex-col items-center gap-1.5 py-3">
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-blue-600" />
                        <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">Enviando fotos para o Supabase...</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-xs font-extrabold text-slate-600">Adicionar fotos direto no Supabase</span>
                      </>
                    )}
                  </label>
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-650 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <X size={14} /> {uploadError}
                  </div>
                )}

                {/* Grid de miniaturas na edição */}
                {editingSpecies.images && editingSpecies.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {editingSpecies.images.map((imgUrl, index) => (
                      <div key={index} className="aspect-square rounded-xl overflow-hidden relative border border-slate-100 group/editimg">
                        <img 
                          src={imgUrl} 
                          alt="thumbnail" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const updated = (editingSpecies.images || []).filter((_, idx) => idx !== index);
                            setEditingSpecies({ ...editingSpecies, images: updated });
                          }}
                          className="absolute inset-0 bg-red-650/90 text-white flex items-center justify-center opacity-0 group-hover/editimg:opacity-100 transition-opacity font-bold rounded-xl"
                          title="Remover Foto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingSpecies(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingSpecies && (
        <div id="adding-species-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden font-sans flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white font-semibold">
              <div className="flex items-center gap-2">
                <Tag size={18} />
                <h2 className="text-sm font-black uppercase">Cadastrar Espécie</h2>
              </div>
              <button type="button" onClick={() => { setIsAddingSpecies(false); setAddSpeciesImages([]); }} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors font-bold"><X size={20} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = e.currentTarget;
              const common = standardizeText((target.elements.namedItem('comName') as HTMLInputElement).value);
              const sci = (target.elements.namedItem('sciName') as HTMLInputElement).value.trim()
                ? standardizeScientificName((target.elements.namedItem('sciName') as HTMLInputElement).value)
                : '';
              const familyVal = (target.elements.namedItem('family') as HTMLInputElement)?.value || '';
              const orderVal = (target.elements.namedItem('order') as HTMLInputElement)?.value || '';
              const groupVal = (target.elements.namedItem('group') as HTMLInputElement)?.value || '';
              const conservationUrlVal = (target.elements.namedItem('conservationUrl') as HTMLInputElement)?.value || '';
              const seeMoreUrlVal = (target.elements.namedItem('seeMoreUrl') as HTMLInputElement)?.value || '';

              if (common && sci) {
                setIsAddingSpecies(false);
                setIsUploading(true);
                const specId = 'spec-' + Date.now();
                
                // Envia as fotos em lote no submit
                const finalUrls: string[] = [];
                for (const b64 of addSpeciesImages) {
                  if (isSupabaseConfigured) {
                    try {
                      const url = await uploadSpeciesPhotoToSupabase(specId, b64);
                      finalUrls.push(url);
                    } catch (err) {
                      console.error("Submissão do Supabase Storage falhou, mantendo base64:", err);
                      finalUrls.push(b64);
                    }
                  } else {
                    finalUrls.push(b64);
                  }
                }
                
                onUpdateSpecies({
                  id: specId,
                  commonName: common,
                  scientificName: sci,
                  images: finalUrls,
                  family: familyVal.trim(),
                  order: orderVal.trim(),
                  group: groupVal.trim(),
                  conservationUrl: conservationUrlVal.trim(),
                  seeMoreUrl: seeMoreUrlVal.trim()
                });
                
                setAddSpeciesImages([]);
                setIsUploading(false);
              }
            }} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Popular</label>
                <input
                  name="comName"
                  type="text"
                  required
                  placeholder="--"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Científico</label>
                <input
                  name="sciName"
                  type="text"
                  required
                  placeholder="--"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 italic"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Família</label>
                <input
                  name="family"
                  type="text"
                  placeholder="Ex: Lutjanidae..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Ordem</label>
                <input
                  name="order"
                  type="text"
                  placeholder="Ex: Perciformes..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Grupo</label>
                <input
                  name="group"
                  type="text"
                  placeholder="Ex: Peixes, Crustáceos..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Dados de Conservação (IUCN Link)</label>
                <input
                  name="conservationUrl"
                  type="url"
                  placeholder="Ex: https://www.iucnredlist.org/species/..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-850"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Ver mais (FishBase Link)</label>
                <input
                  name="seeMoreUrl"
                  type="url"
                  placeholder="Ex: https://www.fishbase.se/summary/..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-850"
                />
              </div>

              {/* Upload e Previsualização ao Criar */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Camera size={14} className="text-slate-400" /> Fotos da Espécie
                </label>
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-100/50 transition-colors">
                  <input 
                    type="file" 
                    id="add-species-new-photos"
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        try {
                          const file = e.target.files[0];
                          const b64 = await convertToBase64(file);
                          setEditorImageSrc(b64);
                          setEditorCallback(() => (croppedB64: string) => {
                            setAddSpeciesImages(prev => [...prev, croppedB64]);
                          });
                          setIsEditorOpen(true);
                          e.target.value = '';
                        } catch (err) {
                          console.error("Erro ao ler imagem:", err);
                        }
                      }
                    }}
                  />
                  <label htmlFor="add-species-new-photos" className="cursor-pointer flex flex-col items-center gap-1.5 py-3">
                    <Upload size={18} className="text-slate-400" />
                    <span className="text-xs font-extrabold text-slate-650">Escolher ou arrastar fotos da espécie</span>
                  </label>
                </div>

                {/* Previsualizações Locais */}
                {addSpeciesImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {addSpeciesImages.map((b64, index) => (
                      <div key={index} className="aspect-square rounded-xl overflow-hidden relative border border-slate-100 group/addpreview">
                        <img 
                          src={b64} 
                          alt="preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setAddSpeciesImages(addSpeciesImages.filter((_, idx) => idx !== index));
                          }}
                          className="absolute inset-0 bg-red-650/90 text-white flex items-center justify-center opacity-0 group-hover/addpreview:opacity-100 transition-opacity font-bold rounded-xl"
                          title="Remover Foto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => { setIsAddingSpecies(false); setAddSpeciesImages([]); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visualizar Fotos & Detalhes da Espécie Modificados para ir Direto ao Supabase */}
      {selectedSpeciesForView && (
        <div id="species-detail-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-sans">
          <div className="w-full max-w-7xl bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden font-sans flex flex-col max-h-[92vh]">
            {/* Cabecalho */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Camera size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-black uppercase tracking-wide leading-tight">
                    {selectedSpeciesForView.commonName}
                  </h2>
                  <p className="text-[10px] sm:text-xs italic text-indigo-100 font-medium">
                    {selectedSpeciesForView.scientificName}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSpeciesForView(null)} 
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors font-bold text-white shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
              {/* Caixa de direct uploads em lote */}
              <div className="bg-slate-50 border-2 border-dashed border-indigo-100 hover:border-indigo-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-center space-y-2 relative transition-all">
                <input 
                  type="file" 
                  id="direct-species-photo"
                  accept="image/*" 
                  className="hidden" 
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      try {
                        const file = e.target.files[0];
                        const b64 = await convertToBase64(file);
                        setEditorImageSrc(b64);
                        setEditorCallback(() => async (croppedB64: string) => {
                          if (!selectedSpeciesForView) return;
                          setIsUploading(true);
                          setUploadError(null);
                          try {
                            let finalUrl = croppedB64;
                            if (isSupabaseConfigured) {
                              finalUrl = await uploadSpeciesPhotoToSupabase(selectedSpeciesForView.id, croppedB64);
                            }
                            const updatedSpec = {
                              ...selectedSpeciesForView,
                              images: [...(selectedSpeciesForView.images || []), finalUrl]
                            };
                            onUpdateSpecies(updatedSpec);
                            setSelectedSpeciesForView(updatedSpec);
                          } catch (uploadErr: any) {
                            console.error("Erro no upload do Supabase:", uploadErr);
                            setUploadError("Falha ao salvar no Supabase. Salvando localmente.");
                            const updatedSpec = {
                              ...selectedSpeciesForView,
                              images: [...(selectedSpeciesForView.images || []), croppedB64]
                            };
                            onUpdateSpecies(updatedSpec);
                            setSelectedSpeciesForView(updatedSpec);
                          } finally {
                            setIsUploading(false);
                          }
                        });
                        setIsEditorOpen(true);
                        e.target.value = '';
                      } catch (err) {
                        console.error("Erro ao ler imagem:", err);
                      }
                    }
                  }}
                  disabled={isUploading}
                />
                <label 
                  htmlFor="direct-species-photo" 
                  className={`flex flex-col items-center justify-center gap-2 cursor-pointer p-3 ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 size={36} className="text-indigo-600 animate-spin" />
                      <span className="text-sm font-extrabold text-indigo-600 uppercase tracking-widest text-[11px]">Enviando direto para o Supabase...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-650 flex items-center justify-center shadow-inner">
                        <Upload size={20} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-700">Arrastar ou clicar para enviar fotos</p>
                        <p className="text-xs text-slate-400">As fotos são sincronizadas diretamente em tempo real no Supabase Storage!</p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {uploadError && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-[2rem] space-y-3.5 select-none animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 text-red-600 text-xs font-black uppercase tracking-wider">
                    <X size={16} /> Falha de Armazenamento: Bucket não encontrado
                  </div>
                  <p className="text-xs text-slate-650 leading-relaxed font-sans">
                    Como as chaves padrão do cliente no frontend não possuem permissões administrativas para criar buckets automaticamente, o bucket deve ser configurado uma única vez no painel do seu Supabase para ativar os enviamentos síncronos:
                  </p>
                  <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 bg-white/70 p-4 rounded-2xl border border-red-100/50 font-sans leading-relaxed">
                    <li>Entre no console do <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">Supabase</a> e acesse seu projeto.</li>
                    <li>No menu vertical à esquerda, clique na aba <strong>Storage</strong> (ícone de pasta/gaveta de arquivos).</li>
                    <li>Clique em <strong>New Bucket</strong> (Novo Bucket) no painel superior.</li>
                    <li>Informe o nome exato: <code className="bg-slate-100 px-1.5 py-0.5 border rounded-lg text-red-600 font-bold font-mono">species-photos</code>.</li>
                    <li>Garante que a caixa de seleção <strong>Public bucket</strong> esteja marcada (ativada) e clique em confirmar.</li>
                    <li>Na lateral, clique em <strong>Policies</strong> para o bucket criado e clique em <strong>New Policy</strong> para criar políticas que permitam aos usuários ler e inserir fotos (Select e Insert público / liberação anônima).</li>
                  </ol>
                  <p className="text-[10px] text-slate-400 italic">
                    Nota: O aplicativo continuará aceitando os uploads salvando as fotos temporariamente em memória local como codificação Base64 para visualização imediata caso você decida fazer a configuração depois.
                  </p>
                </div>
              )}

              {/* Showcase da Foto em Tamanho Real / Proporção Original */}
              {selectedSpeciesForView.images && selectedSpeciesForView.images.length > 0 && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Sparkles size={14} className="text-indigo-500" /> Foto da Espécie (Tamanho Real / Sem Cortes)
                  </h3>
                  <div 
                    className="relative w-full rounded-2xl sm:rounded-[2rem] overflow-hidden border border-white bg-white flex items-center justify-center p-3 select-none group/showcase shadow-inner cursor-zoom-in h-52 sm:h-80"
                    onClick={() => {
                      const imgUrl = selectedSpeciesForView.images?.[activeSpeciesPhotoIndex] || selectedSpeciesForView.images?.[0];
                      if (imgUrl) setLightboxImage(imgUrl);
                    }}
                  >
                    <img 
                      src={selectedSpeciesForView.images[activeSpeciesPhotoIndex] || selectedSpeciesForView.images[0]} 
                      alt={selectedSpeciesForView.commonName} 
                      className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover/showcase:scale-[1.015]"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Overlay Indicator */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                      <div className="bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1.5 shadow-lg select-none">
                        <Eye size={12} className="text-indigo-400" /> Clique para Zoom / Tela Cheia
                      </div>
                      <div className="bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-white/5 shadow-lg select-none">
                        {activeSpeciesPhotoIndex + 1} de {selectedSpeciesForView.images.length}
                      </div>
                    </div>
                    
                    {/* Navigation buttons */}
                    {selectedSpeciesForView.images.length > 1 && (
                      <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 flex justify-between pointer-events-none">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSpeciesPhotoIndex(prev => (prev - 1 + selectedSpeciesForView.images!.length) % selectedSpeciesForView.images!.length);
                          }}
                          className="w-9 h-9 bg-slate-950/85 hover:bg-slate-950 text-white rounded-xl pointer-events-auto transition-all flex items-center justify-center hover:scale-105 active:scale-95 border border-white/5 shadow-md"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSpeciesPhotoIndex(prev => (prev + 1) % selectedSpeciesForView.images!.length);
                          }}
                          className="w-9 h-9 bg-slate-950/85 hover:bg-slate-950 text-white rounded-xl pointer-events-auto transition-all flex items-center justify-center hover:scale-105 active:scale-95 border border-white/5 shadow-md"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Photos Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Image size={14} className="text-slate-400" /> Selecionar Foto da Galeria ({selectedSpeciesForView.images?.length || 0})
                </h3>
                
                {!selectedSpeciesForView.images || selectedSpeciesForView.images.length === 0 ? (
                  <div className="border border-slate-100 rounded-3xl p-12 text-center text-slate-400 space-y-2 bg-white">
                    <Camera size={36} className="mx-auto text-slate-300 animate-pulse" />
                    <p className="text-sm font-semibold text-slate-600">Nenhuma foto enviada para esta espécie.</p>
                    <p className="text-xs text-slate-400">Arraste novos arquivos acima para atualizar a galeria.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5" id="species-gallery-grid">
                    {selectedSpeciesForView.images.map((imgUrl, index) => (
                      <div 
                        key={index} 
                        className={`aspect-square rounded-2xl overflow-hidden relative border transition-all cursor-pointer group/img shadow-sm ${index === activeSpeciesPhotoIndex ? 'ring-2 ring-indigo-600 border-indigo-600 scale-[1.03]' : 'bg-slate-50 border-slate-100 hover:scale-[1.01]'}`}
                        onClick={() => setActiveSpeciesPhotoIndex(index)}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`${selectedSpeciesForView.commonName} - ${index}`} 
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedImages = (selectedSpeciesForView.images || []).filter((_, idx) => idx !== index);
                            const updatedSpec = { ...selectedSpeciesForView, images: updatedImages };
                            if (activeSpeciesPhotoIndex >= updatedImages.length && updatedImages.length > 0) {
                              setActiveSpeciesPhotoIndex(updatedImages.length - 1);
                            }
                            onUpdateSpecies(updatedSpec);
                            setSelectedSpeciesForView(updatedSpec);
                          }}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity duration-200"
                          title="Remover Foto"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                type="button" 
                onClick={() => setSelectedSpeciesForView(null)}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para imagem em tamanho de pixel real uncropped */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          {/* Botão fechar */}
          <button 
            type="button"
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-full transition-all z-[160] font-extrabold backdrop-blur-md border border-white/10 shadow-lg"
            onClick={() => setLightboxImage(null)}
          >
            <X size={26} />
          </button>

          {/* Imagem em tamanho real */}
          <div className="relative max-w-7xl max-h-[85vh] flex items-center justify-center p-2" onClick={e => e.stopPropagation()}>
            <img 
              src={lightboxImage} 
              alt="Visualização em tamanho real" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/15 animate-in zoom-in-95 duration-250 font-sans"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="mt-4 text-center select-none">
            <p className="text-white/80 text-xs font-black tracking-widest uppercase font-sans">Visualização em Tamanho Real</p>
            <p className="text-white/50 text-[10px] mt-1 font-sans">Toque fora da imagem ou clique no botão acima para retornar</p>
          </div>
        </div>
      )}

      {/* Interactive Crop & Rotation Photo Editor */}
      <ImageEditorModal 
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditorCallback(null);
        }}
        imageSrc={editorImageSrc}
        onConfirm={(editedB64) => {
          if (editorCallback) {
            editorCallback(editedB64);
          }
        }}
      />
    </div>
  );
};

export default memo(MyFormsList);
