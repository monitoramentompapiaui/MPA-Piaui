import React, { useState } from 'react';
import { LandingForm, ProductionItem, Species } from '../types';
import { parseToISODate } from '../utils/dateUtils';
import { parsePortugueseNumber } from '../utils/numberUtils';
import { standardizeText, standardizeScientificName } from '../utils/textUtils';
import { GEAR_STRUCTURE, getGeneralGearType, ALL_GENERAL_GEARS, ALL_SPECIFIC_GEARS } from '../utils/gearUtils';
import { getMoonPhasesForRange } from '../utils/moonPhase';
import { 
  X, 
  User, 
  Ship, 
  Settings, 
  Package, 
  Trash2, 
  Plus, 
  CheckCircle2 
} from 'lucide-react';

interface EditFormModalProps {
  editingForm: LandingForm;
  onClose: () => void;
  onSave: (updatedForm: LandingForm) => void;
}

const months = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export const EditFormModal: React.FC<EditFormModalProps> = ({ 
  editingForm: initialForm, 
  onClose, 
  onSave 
}) => {
  const [editingForm, setEditingForm] = useState<LandingForm>({ ...initialForm });
  const [newEditSpecies, setNewEditSpecies] = useState({ species: '', weight: '', price: '' });

  const isIdNumEmpty = !editingForm.idNumber || editingForm.idNumber.toString().trim() === '';
  const isCollectorEmpty = !editingForm.identification.collectorName || editingForm.identification.collectorName.trim() === '';
  const isLocationEmpty = !editingForm.identification.location || editingForm.identification.location.trim() === '';
  const isYearEmpty = !editingForm.identification.year;
  const isMonthEmpty = !editingForm.identification.month || editingForm.identification.month.trim() === '';
  const isFishermanEmpty = !editingForm.identification.fishermanName || editingForm.identification.fishermanName.trim() === '';

  const isFisherCountInvalid = !editingForm.fishing.fisherCount || editingForm.fishing.fisherCount <= 0;
  const isGearTypeEmpty = !editingForm.fishing.gearType || editingForm.fishing.gearType.trim() === '';
  const isDepartureEmpty = !editingForm.fishing.departureDate || editingForm.fishing.departureDate.trim() === '';
  const isArrivalEmpty = !editingForm.fishing.arrivalDate || editingForm.fishing.arrivalDate.trim() === '';
  const isFishingDaysInvalid = !editingForm.fishing.fishingDays || editingForm.fishing.fishingDays <= 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2rem] w-full max-w-7xl my-2 sm:my-8 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-600 text-white">
          <div>
            <h2 className="text-base sm:text-xl font-black uppercase">Editar Ficha</h2>
            <p className="text-[10px] sm:text-xs text-blue-105 opacity-90 mt-0.5">Modifique absolutamente qualquer campo da ficha abaixo</p>
          </div>
          <button id="close-editing-form-modal" type="button" onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-8 max-h-[80vh] overflow-y-auto font-sans">
          
          {/* Seção 1: Identificação */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-2 flex items-center gap-2">
              <User size={16} /> Identificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isIdNumEmpty ? 'text-red-500' : 'text-slate-400'}`}>N° da Ficha</label>
                <input 
                  id="edit-field-idnumber"
                  type="text" 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-bold text-slate-800 border transition-all ${
                    isIdNumEmpty 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.idNumber || ''} 
                  onChange={e => setEditingForm({...editingForm, idNumber: e.target.value})} 
                  placeholder="Ex: 104"
                />
                {isIdNumEmpty && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Campo obrigatório em falta</span>}
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isCollectorEmpty ? 'text-red-500' : 'text-slate-400'}`}>Coletor</label>
                <input 
                  id="edit-field-collector"
                  type="text" 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-medium text-slate-800 border transition-all ${
                    isCollectorEmpty 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.identification.collectorName} 
                  onChange={e => setEditingForm({...editingForm, identification: {...editingForm.identification, collectorName: e.target.value}})} 
                  placeholder="Nome do Coletor"
                />
                {isCollectorEmpty && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Informe o Coletor</span>}
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isLocationEmpty ? 'text-red-500' : 'text-slate-400'}`}>Localidade</label>
                <select 
                  id="edit-field-location"
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-medium text-slate-805 border transition-all ${
                    isLocationEmpty 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.identification.location} 
                  onChange={e => setEditingForm({...editingForm, identification: {...editingForm.identification, location: e.target.value}})} 
                >
                  <option value="">-- Selecione a Localidade --</option>
                  {['Arrombado', 'Barra Grande', 'Cajueiro da Praia', 'Canárias', 'Coqueiro', 'Luís Correia', 'Igaraçu', 'Ilha Grande', 'Macapá', 'Pedra do Sal'].map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                {isLocationEmpty && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Selecione uma Localidade</span>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesqueiro</label>
                <input 
                  id="edit-field-ground"
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium" 
                  value={editingForm.identification.fishingGround || ''} 
                  onChange={e => setEditingForm({...editingForm, identification: {...editingForm.identification, fishingGround: e.target.value}})} 
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isYearEmpty ? 'text-red-500' : 'text-slate-400'}`}>Ano</label>
                <input 
                  id="edit-field-year"
                  type="number" 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-medium text-slate-800 border transition-all ${
                    isYearEmpty 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.identification.year || ''} 
                  onChange={e => setEditingForm({...editingForm, identification: {...editingForm.identification, year: parseInt(e.target.value) || 0}})} 
                />
                {isYearEmpty && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Informe o Ano</span>}
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isMonthEmpty ? 'text-red-500' : 'text-slate-400'}`}>Mês</label>
                <select 
                  id="edit-field-month"
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-semibold text-slate-850 border transition-all ${
                    isMonthEmpty 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.identification.month} 
                  onChange={e => setEditingForm({...editingForm, identification: {...editingForm.identification, month: e.target.value}})} 
                >
                  <option value="">-- Escolha o Mês --</option>
                  {months.map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
                {isMonthEmpty && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Escolha o Mês</span>}
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isFishermanEmpty ? 'text-red-500' : 'text-slate-400'}`}>Proprietário</label>
                <input 
                  id="edit-field-fisher-name"
                  type="text" 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-medium text-slate-800 border transition-all ${
                    isFishermanEmpty 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.identification.fishermanName || ''} 
                  onChange={e => setEditingForm({...editingForm, identification: {...editingForm.identification, fishermanName: e.target.value}})} 
                  placeholder="Nome do Pescador / Proprietário"
                />
                {isFishermanEmpty && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Informe o Proprietário</span>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Embarcação</label>
                <input 
                  id="edit-field-vessel-name"
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium" 
                  value={editingForm.identification.vesselName || ''} 
                  onChange={e => setEditingForm({...editingForm, identification: {...editingForm.identification, vesselName: e.target.value}})} 
                  placeholder="--"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</label>
                <select 
                  id="edit-field-period"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium" 
                  value={editingForm.identification.period || ''} 
                  onChange={e => setEditingForm({...editingForm, identification: {...editingForm.identification, period: e.target.value}})} 
                >
                  <option value="">-- Escolha o Período --</option>
                  <option value="seco">Seco</option>
                  <option value="chuvoso">Chuvoso</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Pescaria */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Ship size={16} /> Pescaria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Embarcação</label>
                <input 
                  id="edit-vessel-type"
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium" 
                  value={editingForm.fishing.vesselType || ''} 
                  onChange={e => setEditingForm({...editingForm, fishing: {...editingForm.fishing, vesselType: e.target.value}})} 
                  placeholder="--"
                />
              </div>
              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isFisherCountInvalid ? 'text-red-500' : 'text-slate-400'}`}>Qtd. de Pescadores</label>
                <input 
                  id="edit-fisher-count"
                  type="number" 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-medium text-slate-800 border transition-all ${
                    isFisherCountInvalid 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.fishing.fisherCount} 
                  onChange={e => setEditingForm({...editingForm, fishing: {...editingForm.fishing, fisherCount: parseInt(e.target.value) || 0}})} 
                />
                {isFisherCountInvalid && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Insira uma quantidade válida</span>}
              </div>

              <div className={`space-y-4 md:col-span-2 p-4 rounded-2xl border transition-all ${
                isGearTypeEmpty ? 'bg-red-50/10 border-red-300' : 'bg-slate-100/50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold block uppercase tracking-wider ${isGearTypeEmpty ? 'text-red-600' : 'text-slate-700'}`}>
                    Arte de Pesca Utilizada {isGearTypeEmpty && '(⚠️ FALTANDO)'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Específico */}
                  <div className="space-y-1">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isGearTypeEmpty ? 'text-red-500' : 'text-slate-400'}`}>Escolha a Arte</label>
                    <select 
                      id="edit-gear-type"
                      className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-semibold text-xs md:text-sm border transition-all ${
                        isGearTypeEmpty 
                          ? 'border-red-300 bg-red-50/20 focus:ring-red-500 text-red-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-850 focus:ring-blue-500'
                      }`} 
                      value={ALL_SPECIFIC_GEARS.includes(editingForm.fishing.gearType) ? editingForm.fishing.gearType : 'custom'} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setEditingForm({
                            ...editingForm,
                            fishing: {
                              ...editingForm.fishing,
                              gearType: '',
                              gearTypeGeneral: 'Outros'
                            },
                            gear: {}
                          });
                        } else {
                          setEditingForm({
                            ...editingForm,
                            fishing: {
                              ...editingForm.fishing,
                              gearType: val,
                              gearTypeGeneral: getGeneralGearType(val)
                            },
                            gear: {}
                          });
                        }
                      }}
                    >
                      {Object.entries(GEAR_STRUCTURE).map(([category, specifics]) => (
                        <optgroup key={category} label={category}>
                          {specifics.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="custom">Outra (Digitar...)</option>
                    </select>
                  </div>

                  {/* Custom Input */}
                  {!ALL_SPECIFIC_GEARS.includes(editingForm.fishing.gearType) ? (
                    <div className="space-y-1">
                      <label className={`text-[10px] font-black uppercase tracking-widest ${isGearTypeEmpty ? 'text-red-500' : 'text-indigo-700'}`}>Digite a Arte Específica</label>
                      <input 
                        type="text"
                        className={`w-full p-3 rounded-xl focus:ring-2 outline-none font-medium text-xs md:text-sm border transition-all ${
                          isGearTypeEmpty 
                            ? 'border-red-355 bg-red-50/10 focus:ring-red-500 text-slate-805' 
                            : 'bg-white border-indigo-200 focus:ring-indigo-500 text-slate-800'
                        }`}
                        placeholder="Rede de emalhe arrasto..."
                        value={editingForm.fishing.gearType}
                        onChange={e => {
                          const val = e.target.value;
                          const general = getGeneralGearType(val);
                          setEditingForm({
                            ...editingForm,
                            fishing: {
                              ...editingForm.fishing,
                              gearType: val,
                              gearTypeGeneral: general
                            }
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arte Selecionada</label>
                      <input 
                        type="text"
                        disabled
                        className="w-full p-3 bg-slate-200 border border-slate-300 rounded-xl font-medium text-slate-500 cursor-not-allowed text-xs md:text-sm"
                        value={editingForm.fishing.gearType}
                      />
                    </div>
                  )}

                  {/* Automatic General Category */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria Geral (Preenchida Automaticamente)</label>
                    <select 
                      className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-xs md:text-sm ${
                        !ALL_SPECIFIC_GEARS.includes(editingForm.fishing.gearType) ? 'bg-white border-indigo-200 text-indigo-700' : 'bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                      disabled={ALL_SPECIFIC_GEARS.includes(editingForm.fishing.gearType)}
                      value={editingForm.fishing.gearTypeGeneral || 'Outros'}
                      onChange={e => setEditingForm({
                        ...editingForm,
                        fishing: {
                          ...editingForm.fishing,
                          gearTypeGeneral: e.target.value
                        }
                      })}
                    >
                      {ALL_GENERAL_GEARS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDepartureEmpty ? 'text-red-500' : 'text-slate-400'}`}>Data de Saída</label>
                <input 
                  id="edit-departure-date"
                  type="date" 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-medium text-slate-800 border transition-all ${
                    isDepartureEmpty 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.fishing.departureDate} 
                  onChange={e => {
                    const dep = e.target.value;
                    const arr = editingForm.fishing.arrivalDate;
                    let diffDays = editingForm.fishing.fishingDays;
                    let moon = editingForm.fishing.moonPhase;
                    if (dep && arr) {
                      const start = new Date(parseToISODate(dep));
                      const end = new Date(parseToISODate(arr));
                      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                        moon = getMoonPhasesForRange(dep, arr);
                      }
                    }
                    
                    const targetDate = arr || dep;
                    let customIdentUpdate = {};
                    if (targetDate) {
                      const isoDate = parseToISODate(targetDate);
                      const parts = isoDate.split('-');
                      if (parts.length === 3) {
                        const yearVal = parseInt(parts[0]);
                        const monthNum = parseInt(parts[1]);
                        if (!isNaN(yearVal) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                          const monthsPt = [
                            "janeiro", "fevereiro", "março", "abril", "maio", "junho",
                            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
                          ];
                          const monthName = monthsPt[monthNum - 1];
                          const calculatedPeriod = monthNum <= 5 ? 'chuvoso' : 'seco';
                          customIdentUpdate = {
                            year: yearVal,
                            month: monthName,
                            period: calculatedPeriod
                          };
                        }
                      }
                    }

                    setEditingForm({
                      ...editingForm,
                      identification: {
                        ...editingForm.identification,
                        ...customIdentUpdate
                      },
                      fishing: { ...editingForm.fishing, departureDate: dep, fishingDays: diffDays, moonPhase: moon }
                    });
                  }} 
                />
                {isDepartureEmpty && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Data de Saída em falta</span>}
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isArrivalEmpty ? 'text-red-500' : 'text-slate-400'}`}>Data de Chegada</label>
                <input 
                  id="edit-arrival-date"
                  type="date" 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 font-medium text-slate-800 border transition-all ${
                    isArrivalEmpty 
                      ? 'border-red-300 bg-red-50/20 focus:ring-red-500 focus:border-red-400' 
                      : 'bg-slate-50 border-slate-200 focus:ring-blue-500'
                  }`}
                  value={editingForm.fishing.arrivalDate} 
                  onChange={e => {
                    const arr = e.target.value;
                    const dep = editingForm.fishing.departureDate;
                    let diffDays = editingForm.fishing.fishingDays;
                    let moon = editingForm.fishing.moonPhase;
                    if (dep && arr) {
                      const start = new Date(parseToISODate(dep));
                      const end = new Date(parseToISODate(arr));
                      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                        moon = getMoonPhasesForRange(dep, arr);
                      }
                    }

                    const targetDate = arr || dep;
                    let customIdentUpdate = {};
                    if (targetDate) {
                      const isoDate = parseToISODate(targetDate);
                      const parts = isoDate.split('-');
                      if (parts.length === 3) {
                        const yearVal = parseInt(parts[0]);
                        const monthNum = parseInt(parts[1]);
                        if (!isNaN(yearVal) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                          const monthsPt = [
                            "janeiro", "fevereiro", "março", "abril", "maio", "junho",
                            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
                          ];
                          const monthName = monthsPt[monthNum - 1];
                          const calculatedPeriod = monthNum <= 5 ? 'chuvoso' : 'seco';
                          customIdentUpdate = {
                            year: yearVal,
                            month: monthName,
                            period: calculatedPeriod
                          };
                        }
                      }
                    }

                    setEditingForm({
                      ...editingForm,
                      identification: {
                        ...editingForm.identification,
                        ...customIdentUpdate
                      },
                      fishing: { ...editingForm.fishing, arrivalDate: arr, fishingDays: diffDays, moonPhase: moon }
                    });
                  }} 
                />
                {isArrivalEmpty && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Data de Chegada em falta</span>}
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isFishingDaysInvalid ? 'text-red-500' : 'text-slate-400'}`}>Dias de Pesca</label>
                <input 
                  id="edit-fishing-days"
                  type="number" 
                  className={`w-full p-3 rounded-xl outline-none font-bold border transition-all ${
                    isFishingDaysInvalid 
                      ? 'border-red-300 bg-red-50 text-red-700' 
                      : 'bg-slate-200 border-slate-200 text-slate-600'
                  }`}
                  value={editingForm.fishing.fishingDays} 
                  readOnly
                />
                {isFishingDaysInvalid && <span className="text-[9px] font-bold text-red-500 block mt-0.5">⚠️ Período de saída/chegada inválido</span>}
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fase da Lua</label>
                <input 
                  id="edit-moon-phase"
                  type="text" 
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-600 font-bold" 
                  value={editingForm.fishing.moonPhase} 
                  onChange={e => setEditingForm({...editingForm, fishing: {...editingForm.fishing, moonPhase: e.target.value}})} 
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Detalhes do Apetrecho */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Settings size={16} /> Arte de Pesca ({editingForm.fishing.gearType})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
              {editingForm.fishing.gearTypeGeneral === 'Rede de emalhe' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tamanho da Malha (mm)</label>
                    <input 
                      id="edit-gear-mesh"
                      type="text" 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                      value={editingForm.gear.meshSize || ''}
                      onChange={e => setEditingForm({...editingForm, gear: {...editingForm.gear, meshSize: e.target.value}})}
                      placeholder="--"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Comprimento da Rede (m)</label>
                    <input 
                      id="edit-gear-length"
                      type="number" 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                      value={editingForm.gear.length || ''}
                      onChange={e => setEditingForm({...editingForm, gear: {...editingForm.gear, length: e.target.value}})}
                      placeholder="--"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Altura (m)</label>
                    <input 
                      id="edit-gear-height"
                      type="text" 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                      value={editingForm.gear.height || ''}
                      onChange={e => setEditingForm({...editingForm, gear: {...editingForm.gear, height: e.target.value}})}
                      placeholder="--"
                    />
                  </div>
                </>
              ) : editingForm.fishing.gearTypeGeneral === 'Linha de mão' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Número de Anzóis</label>
                    <input 
                      id="edit-gear-hooks"
                      type="text" 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                      value={editingForm.gear.hookCount || ''}
                      onChange={e => setEditingForm({...editingForm, gear: {...editingForm.gear, hookCount: e.target.value}})}
                      placeholder="--"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Comprimento do Cabo (m)</label>
                    <input 
                      id="edit-gear-length-esp"
                      type="text" 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                      value={editingForm.gear.length || ''}
                      onChange={e => setEditingForm({...editingForm, gear: {...editingForm.gear, length: e.target.value}})}
                      placeholder="--"
                    />
                  </div>
                </>
              ) : editingForm.fishing.gearTypeGeneral === 'Armadilha' ? (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Número de Armadilhas/Covo</label>
                  <input 
                    id="edit-gear-traps"
                    type="text" 
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    value={editingForm.gear.trapCount || ''}
                    onChange={e => setEditingForm({...editingForm, gear: {...editingForm.gear, trapCount: e.target.value}})}
                    placeholder="--"
                  />
                </div>
              ) : (
                <div className="col-span-1 md:col-span-2 py-8 text-center text-slate-400 font-medium">
                  Sem especificações de dimensões adicionais necessárias para a categoria de pesca: <strong className="text-slate-600">{editingForm.fishing.gearTypeGeneral || 'Outros'}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Seção 4: Produção por Espécie */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Package size={16} /> Produção
            </h3>
            
            {/* Lista de Produção Atual */}
            <div className={`space-y-3 p-6 rounded-2xl border transition-all ${
              editingForm.production.length === 0 ? 'bg-red-50/10 border-red-300' : 'bg-slate-50 border-slate-200'
            }`}>
              {editingForm.production.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                  <p className="text-sm font-bold text-red-600 flex items-center gap-1.5">⚠️ Ficha Incompleta: Lista de Produção Vazia</p>
                  <p className="text-xs text-slate-500 max-w-md">Para salvar esta ficha como completa, registre ao menos uma espécie capturada com seu respectivo peso.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {editingForm.production.map((p, idx) => {
                    const isSpeciesEmpty = !p.species || p.species.trim() === '';
                    const isWeightInvalid = !p.weight || p.weight <= 0;
                    const isRowInvalid = isSpeciesEmpty || isWeightInvalid;

                    return (
                      <div 
                        key={p.id || idx} 
                        className={`grid grid-cols-1 md:grid-cols-4 items-center gap-3 p-3 bg-white rounded-xl border shadow-sm transition-all ${
                          isRowInvalid ? 'border-red-300 ring-1 ring-red-150 bg-red-50/5' : 'border-slate-200'
                        }`}
                      >
                        <div className="md:col-span-2">
                          <label className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${isSpeciesEmpty ? 'text-red-500' : 'text-slate-400'}`}>
                            Espécie {isSpeciesEmpty && ' (⚠️ REQUERIDO)'}
                          </label>
                          <input 
                            type="text" 
                            className={`w-full p-2 border rounded-lg text-xs font-bold transition-all ${
                              isSpeciesEmpty 
                                ? 'border-red-350 bg-red-50/20 text-red-800 focus:ring-red-550' 
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            value={p.species} 
                            onChange={e => {
                              const val = e.target.value;
                              const updatedProd = editingForm.production.map((item, ipx) => 
                                (item.id === p.id || (!p.id && idx === ipx)) ? { ...item, species: val } : item
                              );
                              setEditingForm({ ...editingForm, production: updatedProd });
                            }}
                          />
                        </div>
                        <div>
                          <label className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${isWeightInvalid ? 'text-red-500' : 'text-slate-400'}`}>
                            Peso (Kg) {isWeightInvalid && ' (⚠️ REQUERIDO)'}
                          </label>
                          <input 
                            type="number" 
                            step="0.01"
                            className={`w-full p-2 border rounded-lg text-xs font-bold transition-all ${
                              isWeightInvalid 
                                ? 'border-red-350 bg-red-50/20 text-red-800 focus:ring-red-550' 
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                            value={p.weight} 
                            onChange={e => {
                              const val = parsePortugueseNumber(e.target.value) || 0;
                              const updatedProd = editingForm.production.map((item, ipx) => 
                                (item.id === p.id || (!p.id && idx === ipx)) ? { ...item, weight: val } : item
                              );
                              setEditingForm({ ...editingForm, production: updatedProd });
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Preço R$/Kg</label>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-bold"
                              value={p.price || 0} 
                              onChange={e => {
                                const val = parsePortugueseNumber(e.target.value) || 0;
                                const updatedProd = editingForm.production.map((item, ipx) => 
                                  (item.id === p.id || (!p.id && idx === ipx)) ? { ...item, price: val } : item
                                );
                                setEditingForm({ ...editingForm, production: updatedProd });
                              }}
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              const updatedProd = editingForm.production.filter((item, ipx) => 
                                !(item.id === p.id || (!p.id && idx === ipx))
                              );
                              setEditingForm({ ...editingForm, production: updatedProd });
                            }} 
                            className="p-2 mt-4 bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-550 hover:text-white transition-all shadow-sm"
                            title="Remover Espécie"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Adicionar nova espécie */}
              <div className="mt-4 border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">Adicionar Nova Espécie Capturada</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Espécie</label>
                    <input 
                      id="edit-new-species-name"
                      type="text" 
                      placeholder="--" 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      value={newEditSpecies.species}
                      onChange={e => setNewEditSpecies({...newEditSpecies, species: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peso (Kg)</label>
                    <input 
                      id="edit-new-species-weight"
                      type="number" 
                      step="0.01" 
                      placeholder="--" 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      value={newEditSpecies.weight}
                      onChange={e => setNewEditSpecies({...newEditSpecies, weight: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço R$/Kg</label>
                    <input 
                      id="edit-new-species-price"
                      type="number" 
                      step="0.01" 
                      placeholder="--" 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      value={newEditSpecies.price}
                      onChange={e => setNewEditSpecies({...newEditSpecies, price: e.target.value})}
                    />
                  </div>
                  <div>
                    <button 
                      id="add-edited-species-btn"
                      type="button"
                      onClick={() => {
                        if (newEditSpecies.species && newEditSpecies.weight) {
                          const newItem: ProductionItem = {
                            id: Math.random().toString(36).substr(2, 9),
                            species: standardizeText(newEditSpecies.species),
                            weight: parsePortugueseNumber(newEditSpecies.weight) || 0,
                            price: parsePortugueseNumber(newEditSpecies.price) || 0
                          };
                          setEditingForm({
                            ...editingForm,
                            production: [...editingForm.production, newItem]
                          });
                          setNewEditSpecies({ species: '', weight: '', price: '' });
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white transition-all font-bold text-xs shadow-sm h-10"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
        </div>
        
        <div className="p-4 sm:p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 sm:gap-4 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
          <button 
            id="cancel-editing-form"
            type="button" 
            onClick={onClose} 
            className="px-6 py-3 font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 transition-colors"
          >
            Cancelar
          </button>
          <button 
            id="save-editing-form"
            type="button" 
            onClick={() => {
              const cleanForm: LandingForm = {
                ...editingForm,
                idNumber: editingForm.idNumber ? editingForm.idNumber.trim() : undefined,
                identification: {
                  ...editingForm.identification,
                  collectorName: standardizeText(editingForm.identification.collectorName),
                  location: standardizeText(editingForm.identification.location),
                  fishingGround: editingForm.identification.fishingGround ? standardizeText(editingForm.identification.fishingGround) : undefined,
                  fishermanName: editingForm.identification.fishermanName ? standardizeText(editingForm.identification.fishermanName) : undefined,
                  vesselName: editingForm.identification.vesselName ? standardizeText(editingForm.identification.vesselName) : undefined,
                  period: editingForm.identification.period ? editingForm.identification.period.trim().toLowerCase() : undefined,
                },
                fishing: {
                  ...editingForm.fishing,
                  vesselType: editingForm.fishing.vesselType ? standardizeText(editingForm.fishing.vesselType) : '',
                  propulsionType: editingForm.fishing.propulsionType ? standardizeText(editingForm.fishing.propulsionType) : '',
                },
                production: editingForm.production.map(p => ({
                  ...p,
                  species: standardizeText(p.species),
                  scientificName: p.scientificName ? standardizeScientificName(p.scientificName) : undefined,
                }))
              };
              onSave(cleanForm);
            }} 
            className="flex items-center gap-2 px-10 py-3.5 bg-blue-600 text-white font-black rounded-xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all text-sm"
          >
            <CheckCircle2 size={16} /> Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
