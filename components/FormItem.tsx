import React, { memo } from 'react';
import { LandingForm } from '../types';
import { safeFormatDate } from '../utils/dateUtils';
import { 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Calendar, 
  User,
  CheckSquare, 
  Square, 
  Edit2
} from 'lucide-react';

// Função para verificar se a ficha possui informações faltando
export const isFormIncomplete = (form: LandingForm): boolean => {
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

interface FormItemProps {
  form: LandingForm; 
  isSelected: boolean; 
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (e: React.MouseEvent, id: string) => void;
  onEdit: (e: React.MouseEvent, form: LandingForm) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onView: (form: LandingForm) => void;
}

const FormItem: React.FC<FormItemProps> = ({ 
  form, 
  isSelected, 
  isExpanded, 
  onToggleExpand, 
  onToggleSelect, 
  onEdit, 
  onDelete,
  onView
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
                {incomplete && <span className="text-[9px] font-black text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/55 border border-red-300 dark:border-red-900/40 px-2 py-0.5 rounded-full uppercase">Ficha Incompleto</span>}
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
};

export default memo(FormItem);
