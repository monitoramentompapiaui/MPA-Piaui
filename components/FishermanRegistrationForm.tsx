import React, { useState, useEffect } from 'react';
import { Fisherman, GearDetails } from '../types';
import { generateId } from '../utils/uuid';
import { standardizeText } from '../utils/textUtils';
import { GEAR_STRUCTURE, getGeneralGearType, ALL_GENERAL_GEARS, ALL_SPECIFIC_GEARS, canonicalizeGearName, publicGearDetails } from '../utils/gearUtils';
import GearDetailsFields from './GearDetailsFields';
import { 
  User, 
  MapPin, 
  Ship, 
  Settings, 
  Save, 
  Trash2, 
  Anchor
} from 'lucide-react';

interface Props {
  onSave: (fisherman: Fisherman) => void;
  onCancel: () => void;
  editingFisherman?: Fisherman | null;
}

const FishermanRegistrationForm: React.FC<Props> = ({ onSave, onCancel, editingFisherman }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [vesselName, setVesselName] = useState('');
  
  // New split states for arts
  const [gearType, setGearType] = useState('Tarrafa'); // specific gear
  const [gearTypeGeneral, setGearTypeGeneral] = useState('Rede de emalhe'); // general gear
  const [isCustomSpecific, setIsCustomSpecific] = useState(false);
  const [customSpecificText, setCustomSpecificText] = useState('');
  
  const [gearDetails, setGearDetails] = useState<GearDetails>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load editor details if editing
  useEffect(() => {
    if (editingFisherman) {
      setName(editingFisherman.name);
      setLocation(editingFisherman.location);
      setVesselName(editingFisherman.vesselName || '');
      
      const specific = canonicalizeGearName(editingFisherman.gearType);
      const general = canonicalizeGearName(editingFisherman.gearTypeGeneral || '') || getGeneralGearType(specific);
      
      setGearType(specific);
      setGearTypeGeneral(general);
      
      const isPredefined = ALL_SPECIFIC_GEARS.includes(specific);
      if (isPredefined) {
        setIsCustomSpecific(false);
        setCustomSpecificText('');
      } else {
        setIsCustomSpecific(true);
        setCustomSpecificText(specific);
      }
      
      setGearDetails(publicGearDetails(editingFisherman.gearDetails));
    } else {
      // Reset form
      setName('');
      setLocation('');
      setVesselName('');
      setGearType('Tarrafa');
      setGearTypeGeneral('Rede de emalhe');
      setIsCustomSpecific(false);
      setCustomSpecificText('');
      setGearDetails({});
    }
  }, [editingFisherman]);

  const handleSpecificGearSelect = (value: string) => {
    // As medidas já digitadas são preservadas quando a arte é alterada.
    if (value === 'custom') {
      setIsCustomSpecific(true);
      setGearType('');
      setGearTypeGeneral('Outros');
    } else {
      const specific = canonicalizeGearName(value);
      setIsCustomSpecific(false);
      setGearType(specific);
      setGearTypeGeneral(getGeneralGearType(specific));
    }
  };

  const handleCustomSpecificChange = (value: string) => {
    setCustomSpecificText(value);
    setGearType(value);
    const general = getGeneralGearType(value);
    setGearTypeGeneral(general);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim() || !location.trim()) {
      alert('Por favor, preencha o nome e a localidade do pescador.');
      return;
    }

    const finalGearType = canonicalizeGearName(isCustomSpecific ? customSpecificText.trim() : gearType);
    if (!finalGearType) {
      alert('Por favor, especifique a arte de pesca.');
      return;
    }

    setIsSaving(true);

    const savedFisherman: Fisherman = {
      // Mantém campos que não aparecem neste formulário (porto de origem, nº de pescadores,
      // pesca submarina, tipo de embarcação etc.) quando se edita um cadastro existente.
      ...(editingFisherman || {}),
      id: editingFisherman ? editingFisherman.id : generateId(),
      name: standardizeText(name),
      location: standardizeText(location),
      vesselType: editingFisherman?.vesselType || '',
      vesselName: vesselName.trim() ? standardizeText(vesselName) : undefined,
      propulsionType: editingFisherman?.propulsionType || '',
      gearType: finalGearType,
      gearTypeGeneral: canonicalizeGearName(gearTypeGeneral) || getGeneralGearType(finalGearType),
      gearDetails: publicGearDetails(gearDetails)
    };

    onSave(savedFisherman);
    setIsSaving(false);
  };

  return (
    <div id="fisherman-reg-container" className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden max-w-7xl mx-auto">
      <div className="px-4 py-6 sm:px-8 sm:py-8 border-b border-slate-100 dark:border-slate-800 text-center">
        <h2 className="text-xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
          {editingFisherman ? 'Editar Cadastro de Pescador' : 'Cadastro de Pescadores'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-[16px] md:text-base md:leading-normal mt-1">
          {editingFisherman 
            ? 'Modifique as informações do pescador cadastrado' 
            : 'Registre um pescador para preenchimento rápido em novas fichas'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-8 md:p-10 space-y-4 sm:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Nome */}
          <div className="space-y-1.5 sm:space-y-2 md:col-span-2">
            <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <User size={14} className="text-blue-500 sm:w-4 sm:h-4" /> Nome do Pescador
            </label>
            <input 
              type="text" 
              className="w-full p-2.5 sm:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-xs sm:text-sm md:text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="--"
              required
            />
          </div>

          {/* Localidade */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin size={14} className="text-blue-500 sm:w-4 sm:h-4" /> Localidade / Porto
            </label>
            <select 
              className="w-full p-2.5 sm:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-xs sm:text-sm md:text-base text-slate-800 dark:text-slate-100"
              value={location}
              onChange={e => setLocation(e.target.value)}
              required
            >
              <option value="" className="dark:bg-slate-800">-- Selecione a Localidade --</option>
              {['Arrombado', 'Barra Grande', 'Cajueiro da Praia', 'Canárias', 'Coqueiro', 'Luís Correia', 'Igaraçu', 'Ilha Grande', 'Macapá', 'Pedra do Sal'].map(loc => (
                <option key={loc} value={loc} className="dark:bg-slate-800">{loc}</option>
              ))}
            </select>
          </div>

          {/* Nome da Embarcação */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Ship size={14} className="text-blue-500 sm:w-4 sm:h-4" /> Nome da Embarcação
            </label>
            <input 
              type="text" 
              className="w-full p-2.5 sm:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-xs sm:text-sm md:text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              value={vesselName}
              onChange={e => setVesselName(e.target.value)}
              placeholder="--"
            />
          </div>
        </div>

        {/* Arte de Pesca */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 sm:pt-6 font-sans">
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 sm:space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Anchor size={18} className="text-blue-600 sm:w-5 sm:h-5" /> Arte de Pesca Preferencial
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Selecione uma arte específica ou digite uma personalizada no campo abaixo</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Specific Gear Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 block text-left">Escolha a Arte de Pesca</label>
                  <select 
                    className="w-full p-2.5 sm:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm"
                    value={isCustomSpecific ? 'custom' : gearType}
                    onChange={e => handleSpecificGearSelect(e.target.value)}
                  >
                    {Object.entries(GEAR_STRUCTURE).map(([category, specifics]) => (
                      <optgroup key={category} label={category} className="dark:bg-slate-800">
                        {specifics.map(s => (
                          <option key={s} value={s} className="dark:bg-slate-800">{s}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="custom" className="dark:bg-slate-800">Outra (Digitar...)</option>
                  </select>
                </div>

                {/* Free Text Specific Input (if custom) */}
                {isCustomSpecific ? (
                  <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <label className="text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-400 block text-left">Digite a Arte Específica</label>
                    <input 
                      type="text"
                      className="w-full p-2.5 sm:p-3 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-900 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-indigo-300 dark:placeholder-indigo-700"
                      placeholder="Ex: Rede de arrasto, Linha de fundo..."
                      value={customSpecificText}
                      onChange={e => handleCustomSpecificChange(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 block text-left">Arte Registrada</label>
                    <input 
                      type="text"
                      disabled
                      className="w-full p-2.5 sm:p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs sm:text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      value={gearType}
                    />
                  </div>
                )}

                {/* General Gear Selector (auto-filled, editable when custom) */}
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 block text-left">Categoria Geral (Arte de Pesca Geral - Preenchida Automaticamente)</label>
                  <select 
                    className={`w-full p-2.5 sm:p-3 bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-xs sm:text-sm ${
                      isCustomSpecific ? 'border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed'
                    }`}
                    disabled={!isCustomSpecific}
                    value={gearTypeGeneral}
                    onChange={e => setGearTypeGeneral(e.target.value)}
                  >
                    {ALL_GENERAL_GEARS.map(cat => (
                      <option key={cat} value={cat} className="dark:bg-slate-800">{cat}</option>
                    ))}
                    <option value="Outros" className="dark:bg-slate-800">Outros</option>
                  </select>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">
                    {isCustomSpecific 
                      ? 'Como você digitou uma arte personalizada, se preferir você pode categorizá-la manualmente acima.' 
                      : 'Classificação automática definida pela base de regras.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Especificações da arte (mesmas categorias usadas nas fichas) */}
            <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <GearDetailsFields
                general={gearTypeGeneral}
                specific={gearType}
                details={gearDetails}
                onChange={setGearDetails}
                compact
                idPrefix="fisher-gear"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <button 
            type="button"
            onClick={onCancel}
            className="text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm -ml-2"
          >
            Cancelar
          </button>
          
          <button 
            type="submit"
            disabled={isSaving}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:px-10 sm:py-3 rounded-xl font-bold shadow-md sm:shadow-lg transition-all font-sans text-xs sm:text-sm ${
              isSaving 
                ? 'bg-blue-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
            }`}
          >
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={14} className="sm:w-[18px] sm:h-[18px]" />
            )}
            {editingFisherman ? 'Salvar Alterações' : 'Salvar Pescador'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FishermanRegistrationForm;
