import React, { useState, useEffect, useRef } from 'react';
import { 
  IdentificationData, 
  FishingData, 
  GearDetails, 
  ProductionItem, 
  LandingForm,
  Fisherman,
  Species
} from '../types';
import { getMoonPhasesForRange } from '../utils/moonPhase';
import { generateId } from '../utils/uuid';
import { parsePortugueseNumber } from '../utils/numberUtils';
import { standardizeText, standardizeScientificName } from '../utils/textUtils';
import { GEAR_STRUCTURE, getGeneralGearType, ALL_GENERAL_GEARS, ALL_SPECIFIC_GEARS } from '../utils/gearUtils';
import { 
  User, 
  Ship, 
  Settings, 
  Package, 
  Save, 
  Plus, 
  Trash2,
  Calendar,
  Waves,
  Sparkles,
  CheckCircle2,
  X,
  Anchor,
  FileText
} from 'lucide-react';

interface Props {
  onSave: (form: LandingForm) => any;
  onCancel: () => void;
  fishermen: Fisherman[];
  speciesList?: Species[];
}

const LandingFormWizard: React.FC<Props> = ({ onSave, onCancel, fishermen = [], speciesList = [] }) => {
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [selectedFishermanId, setSelectedFishermanId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [idNumber, setIdNumber] = useState<string>('');
  const [ident, setIdent] = useState<IdentificationData>({
    collectorName: '',
    location: '',
    year: new Date().getFullYear(),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date()),
    period: ''
  });

  const [fish, setFish] = useState<FishingData>({
    vesselType: '',
    propulsionType: '',
    fisherCount: 1,
    gearType: 'Tarrafa',
    gearTypeGeneral: 'Rede de emalhe',
    departureDate: '',
    arrivalDate: '',
    fishingDays: 0,
    moonPhase: ''
  });

  // Custom states for specific gear
  const [isCustomSpecific, setIsCustomSpecific] = useState(false);
  const [customSpecificText, setCustomSpecificText] = useState('');

  const [gear, setGear] = useState<GearDetails>({});
  const [production, setProduction] = useState<ProductionItem[]>([]);
  const [newItem, setNewItem] = useState({ species: '', weight: '', price: '' });

  // Special species group detection and inputs
  const [detectedGroup, setDetectedGroup] = useState<'caranguejo_siri' | 'ostra' | 'marisco' | 'default'>('default');
  const [numCordas, setNumCordas] = useState<string>('');
  const [numExemplares, setNumExemplares] = useState<string>('');
  const [pesoIndividual, setPesoIndividual] = useState<string>('');
  const [numSacos, setNumSacos] = useState<string>('');
  const [pesoSaco, setPesoSaco] = useState<string>('');
  const [rendimentoPolpa, setRendimentoPolpa] = useState<string>('');

  // Auto-detect species group on species name change
  useEffect(() => {
    const speciesName = newItem.species;
    if (!speciesName || !speciesName.trim()) {
      setDetectedGroup('default');
      return;
    }
    const cleanName = speciesName.toLowerCase().trim();
    const exact = speciesList.find(s => s.commonName.toLowerCase() === cleanName);
    const groupName = exact?.group?.toLowerCase() || '';

    if (
      groupName.includes('caranguejo') || 
      groupName.includes('siri') || 
      groupName.includes('sirí') || 
      groupName.includes('crustáceo') ||
      cleanName.includes('caranguejo') || 
      cleanName.includes('siri') || 
      cleanName.includes('sirí')
    ) {
      setDetectedGroup('caranguejo_siri');
    } else if (
      groupName.includes('bivalve') || 
      groupName.includes('ostra') || 
      groupName.includes('marisco') || 
      cleanName.includes('ostra') || 
      cleanName.includes('marisco') ||
      cleanName.includes('bivalve')
    ) {
      if (cleanName.includes('ostra') || groupName.includes('ostra')) {
        setDetectedGroup('ostra');
      } else {
        setDetectedGroup('marisco');
      }
    } else {
      setDetectedGroup('default');
    }
  }, [newItem.species, speciesList]);

  // Carrega rascunho salvo ao montar o componente
  useEffect(() => {
    const savedDraft = localStorage.getItem('fishery_wizard_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft) {
          if (draft.idNumber !== undefined) setIdNumber(draft.idNumber);
          if (draft.selectedFishermanId !== undefined) setSelectedFishermanId(draft.selectedFishermanId);
          if (draft.ident !== undefined) setIdent(draft.ident);
          if (draft.fish !== undefined) setFish(draft.fish);
          if (draft.gear !== undefined) setGear(draft.gear);
          if (draft.production !== undefined) setProduction(draft.production);
        }
      } catch (e) {
        console.error("Erro ao carregar rascunho de ficha técnica:", e);
      }
    }
  }, []);

  // Salva rascunho nas alterações do estado do formulário
  useEffect(() => {
    const draft = {
      idNumber,
      selectedFishermanId,
      ident,
      fish,
      gear,
      production
    };
    localStorage.setItem('fishery_wizard_draft', JSON.stringify(draft));
  }, [idNumber, selectedFishermanId, ident, fish, gear, production]);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFishermanSuggestions, setShowFishermanSuggestions] = useState(false);
  const [scientificName, setScientificName] = useState('');

  const fishermanSuggestions = React.useMemo(() => {
    const query = (ident.fishermanName || '').trim().toLowerCase();
    if (!query) return [];
    return fishermen.filter(f => f.name.toLowerCase().includes(query));
  }, [fishermen, ident.fishermanName]);

  // Floating autocomplete suggestions for species
  const speciesSuggestions = React.useMemo(() => {
    if (!newItem.species.trim()) return [];
    const term = newItem.species.toLowerCase().trim();
    return speciesList.filter(s => 
      s.commonName.toLowerCase().includes(term)
    );
  }, [speciesList, newItem.species]);

  // Filter fishermen matching the typed location
  const availableFishermen = React.useMemo(() => {
    if (!ident.location || !ident.location.trim()) return [];
    const search = ident.location.toLowerCase().trim();
    return fishermen.filter(f => f.location.toLowerCase().includes(search));
  }, [fishermen, ident.location]);

  // Autofill form data based on chosen fisherman
  const handleSelectFisherman = (fisherId: string) => {
    const fisher = fishermen.find(f => f.id === fisherId);
    if (fisher) {
      setSelectedFishermanId(fisher.id);
      
      const specific = fisher.gearType || '';
      const general = fisher.gearTypeGeneral || getGeneralGearType(specific);
      
      const isPredefined = ALL_SPECIFIC_GEARS.includes(specific);
      if (isPredefined) {
        setIsCustomSpecific(false);
        setCustomSpecificText('');
      } else {
        setIsCustomSpecific(true);
        setCustomSpecificText(specific);
      }

      setFish(prev => ({
        ...prev,
        vesselType: fisher.vesselType || prev.vesselType,
        propulsionType: fisher.propulsionType || prev.propulsionType,
        gearType: specific,
        gearTypeGeneral: general
      }));
      setIdent(prev => ({
        ...prev,
        vesselName: fisher.vesselName || prev.vesselName
      }));
      setGear(fisher.gearDetails || {});
    } else {
      setSelectedFishermanId('');
    }
  };

  // Calculate Fishing Days and Moon Phase automatically
  useEffect(() => {
    if (fish.departureDate && fish.arrivalDate) {
      const start = new Date(fish.departureDate);
      const end = new Date(fish.arrivalDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      
      const phase = getMoonPhasesForRange(fish.departureDate, fish.arrivalDate);
      
      setFish(prev => ({ ...prev, fishingDays: diffDays, moonPhase: phase }));
    }
  }, [fish.departureDate, fish.arrivalDate]);

  // Adjust identification fields (year and period) based on fishing dates
  // Month is NOT auto-filled — it refers to the registration month, independent of fishing dates
  useEffect(() => {
    const targetDate = fish.arrivalDate || fish.departureDate;
    if (targetDate) {
      const parts = targetDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const monthNum = parseInt(parts[1]); // 1-12
        
        // Chuvoso: janeiro, fevereiro, março, abril, maio (months 1 to 5)
        // Seco: junho, julho, agosto, setembro, outubro, novembro, dezembro (months 6 to 12)
        const calculatedPeriod = monthNum <= 5 ? 'chuvoso' : 'seco';
        
        setIdent(prev => ({
          ...prev,
          year: year,
          period: calculatedPeriod
        }));
      }
    }
  }, [fish.departureDate, fish.arrivalDate]);

  const addProductionItem = () => {
    if (!newItem.species || !newItem.species.trim()) return;

    let calculatedWeight = 0;
    let calculatedPrice = 0;
    let origPrice = 0;

    let customFields: Partial<ProductionItem> = {
      groupType: detectedGroup
    };

    if (detectedGroup === 'caranguejo_siri') {
      const cordasVal = parseFloat(numCordas) || 0;
      const exemplaresVal = parseFloat(numExemplares) || 0;
      const pesoIndVal = parseFloat(pesoIndividual) || 0;
      origPrice = parseFloat(newItem.price) || 0; // price per cord for crab/siri

      if (cordasVal <= 0 || exemplaresVal <= 0 || pesoIndVal <= 0 || origPrice <= 0) {
        alert("Por favor, preencha todos os campos específicos para Caranguejos e Siris (Cordas, Exemplares, Peso individual e Preço por corda).");
        return;
      }

      calculatedWeight = cordasVal * exemplaresVal * pesoIndVal;
      const revenue = cordasVal * origPrice;
      calculatedPrice = calculatedWeight > 0 ? revenue / calculatedWeight : 0;

      customFields = {
        ...customFields,
        numCordas: cordasVal,
        numExemplares: exemplaresVal,
        pesoIndividual: pesoIndVal,
        originalPrice: origPrice
      };
    } else if (detectedGroup === 'ostra') {
      const sacosVal = parseFloat(numSacos) || 0;
      const pesoSacoVal = parseFloat(pesoSaco) || 0;
      origPrice = parseFloat(newItem.price) || 0; // price per bag for ostra

      if (sacosVal <= 0 || pesoSacoVal <= 0 || origPrice <= 0) {
        alert("Por favor, preencha todos os campos específicos para Ostras (Sacos, Peso do saco e Preço por saco).");
        return;
      }

      calculatedWeight = sacosVal * pesoSacoVal;
      const revenue = sacosVal * origPrice;
      calculatedPrice = calculatedWeight > 0 ? revenue / calculatedWeight : 0;

      customFields = {
        ...customFields,
        numSacos: sacosVal,
        pesoSaco: pesoSacoVal,
        originalPrice: origPrice
      };
    } else if (detectedGroup === 'marisco') {
      const sacosVal = parseFloat(numSacos) || 0;
      const pesoSacoVal = parseFloat(pesoSaco) || 0;
      const rendimentoVal = parseFloat(rendimentoPolpa) || 0;
      origPrice = parseFloat(newItem.price) || 0; // price per kg polpa

      if (sacosVal <= 0 || pesoSacoVal <= 0 || rendimentoVal <= 0 || origPrice <= 0) {
        alert("Por favor, preencha todos os campos específicos para Mariscos (Sacos, Peso do saco, Rendimento e Preço por kg polpa).");
        return;
      }

      calculatedWeight = sacosVal * pesoSacoVal;
      const revenue = rendimentoVal * origPrice;
      calculatedPrice = calculatedWeight > 0 ? revenue / calculatedWeight : 0;

      customFields = {
        ...customFields,
        numSacos: sacosVal,
        pesoSaco: pesoSacoVal,
        rendimentoPolpa: rendimentoVal,
        originalPrice: origPrice
      };
    } else {
      // Standard flow
      calculatedWeight = parsePortugueseNumber(newItem.weight);
      calculatedPrice = parsePortugueseNumber(newItem.price) || 0;
      if (!calculatedWeight || calculatedWeight <= 0) {
        alert("Por favor, preencha o peso da espécie com um valor numérico positivo (maior que zero).");
        return;
      }
      if (calculatedPrice < 0) {
        alert("O preço de venda não pode ser negativo.");
        return;
      }
    }

    const item: ProductionItem = {
      id: generateId(),
      species: standardizeText(newItem.species),
      scientificName: scientificName.trim() ? standardizeScientificName(scientificName) : undefined,
      weight: calculatedWeight,
      price: calculatedPrice,
      ...customFields
    };

    setProduction([...production, item]);
    
    // Reset all production input states
    setNewItem({ species: '', weight: '', price: '' });
    setScientificName('');
    setNumCordas('');
    setNumExemplares('');
    setPesoIndividual('');
    setNumSacos('');
    setPesoSaco('');
    setRendimentoPolpa('');
    setDetectedGroup('default');
  };

  const removeProductionItem = (id: string) => {
    setProduction(production.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // 1. Número da ficha (obrigatório)
      if (!idNumber || !idNumber.trim()) {
        alert("Por favor, preencha o número da ficha.");
        const input = document.getElementById('id-number-input');
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // 2. Coletor / Nome do Coletor (obrigatório)
      if (!ident.collectorName || !ident.collectorName.trim()) {
        alert("Por favor, preencha o nome do coletor.");
        return;
      }

      // 3. Porto / Localidade (obrigatório)
      if (!ident.location || !ident.location.trim()) {
        alert("Por favor, preencha a localidade/porto de desembarque.");
        return;
      }

      // 4. Nome do Pescador (obrigatório)
      if (!ident.fishermanName || !ident.fishermanName.trim()) {
        alert("Por favor, preencha o nome do pescador.");
        return;
      }

      // 5. Datas de Viagem (obrigatório)
      if (!fish.departureDate) {
        alert("Por favor, preencha a data de saída (partida).");
        return;
      }
      if (!fish.arrivalDate) {
        alert("Por favor, preencha a data de desembarque (chegada).");
        return;
      }

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (fish.departureDate > todayStr) {
        alert("A data de saída não pode ser futura.");
        return;
      }
      if (fish.arrivalDate > todayStr) {
        alert("A data de desembarque não pode ser futura.");
        return;
      }
      if (fish.arrivalDate < fish.departureDate) {
        alert("A data de desembarque não pode ser anterior à data de saída.");
        return;
      }

      // 6. Dias de pesca
      if (fish.fishingDays < 0) {
        alert("A quantidade de dias de pesca não pode ser negativa.");
        return;
      }

      // 7. Produção / Espécies registradas
      if (production.length === 0) {
        alert("Por favor, adicione pelo menos uma espécie no registro de produção antes de finalizar a ficha.");
        return;
      }

      for (const p of production) {
        if (!p.species || !p.species.trim()) {
          alert("Uma das espécies adicionadas na produção está com o nome vazio.");
          return;
        }
        if (p.weight <= 0) {
          alert(`O peso/quantidade para a espécie "${p.species}" deve ser positivo (maior que zero).`);
          return;
        }
        if (p.price < 0) {
          alert(`O preço para a espécie "${p.species}" não pode ser negativo.`);
          return;
        }
      }

      const finalForm: LandingForm = {
        id: generateId(),
        idNumber: idNumber ? idNumber.trim() : undefined,
        createdAt: new Date().toISOString(),
        identification: {
          ...ident,
          collectorName: standardizeText(ident.collectorName),
          location: standardizeText(ident.location),
          fishingGround: ident.fishingGround ? standardizeText(ident.fishingGround) : undefined,
          fishermanName: ident.fishermanName ? standardizeText(ident.fishermanName) : undefined,
          vesselName: ident.vesselName ? standardizeText(ident.vesselName) : undefined,
        },
        fishing: {
          ...fish,
          vesselType: fish.vesselType ? standardizeText(fish.vesselType) : '',
          propulsionType: fish.propulsionType ? standardizeText(fish.propulsionType) : '',
        },
        gear: gear,
        production: production.map(p => ({
          ...p,
          species: standardizeText(p.species),
          scientificName: p.scientificName ? standardizeScientificName(p.scientificName) : undefined,
        }))
      };
      const saveResult = await onSave(finalForm);
      if (saveResult === false) {
        return;
      }
      // Mostra notificação de sucesso e mantem os dados na ficha até que o usuário decida limpar os campos
      setSuccessNotification(`Ficha N° ${idNumber || '--'} cadastrada com sucesso!`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setIdNumber('');
    setSelectedFishermanId('');
    setIdent({
      collectorName: '',
      location: '',
      year: new Date().getFullYear(),
      month: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date()),
      period: ''
    });
    setFish({
      vesselType: '',
      propulsionType: '',
      fisherCount: 1,
      gearType: 'Tarrafa',
      gearTypeGeneral: 'Rede de emalhe',
      departureDate: '',
      arrivalDate: '',
      fishingDays: 0,
      moonPhase: ''
    });
    setGear({});
    setProduction([]);
    setNewItem({ species: '', weight: '', price: '' });
    setScientificName('');
    setIsCustomSpecific(false);
    setCustomSpecificText('');
    localStorage.removeItem('fishery_wizard_draft');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isInputOrSelect = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
    
    if (!isInputOrSelect) return;

    if (e.key === 'Enter') {
      e.preventDefault();

      // Custom production flow
      if (target.id === 'popular-name-input') {
        if ((!newItem.species || !newItem.species.trim()) && production.length > 0) {
          handleSave();
          return;
        }
        const next = document.getElementById('scientific-name-input');
        if (next) next.focus();
        return;
      } else if (target.id === 'scientific-name-input') {
        const next = document.getElementById('weight-input') || document.getElementById('num-cordas-input') || document.getElementById('num-sacos-input');
        if (next) next.focus();
        return;
      } else if (target.id === 'weight-input') {
        const next = document.getElementById('price-input');
        if (next) next.focus();
        return;
      } else if (target.id === 'price-input') {
        addProductionItem();
        const popularInput = document.getElementById('popular-name-input');
        if (popularInput) popularInput.focus();
        return;
      }

      // Generic Enter to jump to the next input/select/textarea
      if (formContainerRef.current) {
        const elements = Array.from(
          formContainerRef.current.querySelectorAll(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          )
        ) as HTMLElement[];
        const currentIndex = elements.indexOf(target);
        if (currentIndex !== -1 && currentIndex < elements.length - 1) {
          elements[currentIndex + 1].focus();
        }
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Don't intercept arrow keys on select dropdowns as users use them to change options
      if (target.tagName === 'SELECT') return;
      
      if (formContainerRef.current) {
        const elements = Array.from(
          formContainerRef.current.querySelectorAll(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          )
        ) as HTMLElement[];
        const currentIndex = elements.indexOf(target);
        if (currentIndex !== -1) {
          if (e.key === 'ArrowDown' && currentIndex < elements.length - 1) {
            e.preventDefault();
            elements[currentIndex + 1].focus();
          } else if (e.key === 'ArrowUp' && currentIndex > 0) {
            e.preventDefault();
            elements[currentIndex - 1].focus();
          }
        }
      }
    }
  };

  return (
    <div ref={formContainerRef} className="space-y-8 pb-16 font-sans" onKeyDown={handleKeyDown}>
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-10 pointer-events-none">
          <Anchor size={220} className="stroke-[1.5]" />
        </div>
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Nova Ficha de Desembarque</h2>
          <p className="text-blue-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Preencha todos os campos do formulário abaixo de forma linear e integrada. Os cálculos de sazonalidade, dias de pescaria e fase da lua são automáticos.
          </p>
        </div>
      </div>

      {successNotification && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-xl shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-green-950">{successNotification}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessNotification(null)}
            className="text-green-500 hover:text-green-700 p-1.5 rounded-xl hover:bg-green-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* SECTION 1: IDENTIFICAÇÃO GERAL */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 relative z-30">
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950 rounded-t-3xl border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
            <User size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Identificação</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Dados do coletor, localidade e data de referência</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 md:col-span-3">
            <label className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <FileText size={14} />
              <span>N° da Ficha</span>
              <span className="text-red-500">*</span>
            </label>
            <input 
              id="id-number-input"
              type="text" 
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
              value={idNumber}
              onChange={e => setIdNumber(e.target.value)}
              placeholder="--"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Local de Coleta (Localidade)</label>
            <select 
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
              value={ident.location}
              onChange={e => {
                setIdent({...ident, location: e.target.value});
                setSelectedFishermanId('');
              }}
            >
              <option value="" className="dark:bg-slate-800">-- Selecione a Localidade --</option>
              {['Arrombado', 'Barra Grande', 'Cajueiro da Praia', 'Canárias', 'Coqueiro', 'Luís Correia', 'Igaraçu', 'Ilha Grande', 'Macapá', 'Pedra do Sal'].map(loc => (
                <option key={loc} value={loc} className="dark:bg-slate-800">{loc}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Nome do Coletor</label>
            <input 
              type="text" 
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
              value={ident.collectorName}
              onChange={e => setIdent({...ident, collectorName: e.target.value})}
              placeholder="--"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Nome da Embarcação</label>
            <input 
              type="text" 
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
              value={ident.vesselName || ''}
              onChange={e => setIdent({...ident, vesselName: e.target.value})}
              placeholder="--"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Ano</label>
            <input 
              type="number" 
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
              value={ident.year}
              onChange={e => setIdent({...ident, year: parseInt(e.target.value) || new Date().getFullYear()})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Mês</label>
            <select 
              className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
              value={ident.month}
              onChange={e => setIdent({...ident, month: e.target.value})}
            >
              {["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"].map(m => (
                <option key={m} value={m} className="dark:bg-slate-800">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 relative" id="proprietario-autocomplete-container">
            <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Proprietário (Pescador)</label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                value={ident.fishermanName || ''}
                onChange={e => {
                  setIdent({...ident, fishermanName: e.target.value});
                  if (selectedFishermanId) setSelectedFishermanId('');
                }}
                onFocus={() => setShowFishermanSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowFishermanSuggestions(false), 200);
                }}
                placeholder="--"
              />
            </div>
            {showFishermanSuggestions && fishermanSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-56 overflow-y-auto z-50 animate-in fade-in duration-100">
                {fishermanSuggestions.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setIdent(prev => ({
                        ...prev,
                        fishermanName: f.name,
                        location: f.location || prev.location
                      }));
                      handleSelectFisherman(f.id);
                      setShowFishermanSuggestions(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs sm:text-sm hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-between border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{f.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Localidade: {f.location}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-md uppercase">
                      {f.gearType}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: INFORMAÇÕES DE PESCARIA (VIAGEM & EMBARCAÇÃO) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
            <Ship size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Pescaria</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Pesqueiro, tripulação, datas e fase da lua automática</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Dynamic Suggestion Section for Fisherman */}
          {ident.location.trim() && (
            <div className="p-4 rounded-2xl border transition-all bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 text-white rounded-xl shadow-md"><Sparkles size={18} /></div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {availableFishermen.length > 0 
                      ? `Pescadores Disponíveis em "${ident.location}"` 
                      : `Nenhum pescador cadastrado para "${ident.location}"`}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {availableFishermen.length > 0 
                      ? 'Selecione abaixo para auto-preencher os dados de embarcação e arte de pesca deste pescador.' 
                      : 'Cadastre os pescadores desta localidade previamente na aba de "Cadastrar Pescador" para habilitar o preenchimento automático.'}
                  </p>
                </div>
              </div>

              {availableFishermen.length > 0 && (
                <select
                  className="p-2.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none min-w-[220px]"
                  value={selectedFishermanId}
                  onChange={e => handleSelectFisherman(e.target.value)}
                >
                  <option value="" className="dark:bg-slate-800">-- Escolha um Pescador --</option>
                  {availableFishermen.map(f => (
                    <option key={f.id} value={f.id} className="dark:bg-slate-800">{f.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          
          {selectedFishermanId && (
            <div className="p-3 bg-green-50 dark:bg-green-950/25 rounded-xl border border-green-200 dark:border-green-900/30 flex items-center gap-2 text-xs font-bold text-green-700 dark:text-green-400 animate-pulse">
              <span>✨ Preenchimento Automático Ativo: Dados do pescador "{fishermen.find(f => f.id === selectedFishermanId)?.name}" foram preenchidos na ficha!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Pesqueiro</label>
              <input 
                type="text" 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                value={ident.fishingGround || ''}
                onChange={e => setIdent({...ident, fishingGround: e.target.value})}
                placeholder="--"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Qtd. de Pescadores na Viagem</label>
              <input 
                type="number" 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                value={fish.fisherCount}
                onChange={e => setFish({...fish, fisherCount: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Embarcação</label>
              <input 
                type="text" 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                value={fish.vesselType}
                onChange={e => setFish({...fish, vesselType: e.target.value})}
                placeholder="--"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Data de Saída</label>
              <input 
                type="date" 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                value={fish.departureDate}
                onChange={e => setFish({...fish, departureDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Data de Chegada</label>
              <input 
                type="date" 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                value={fish.arrivalDate}
                onChange={e => setFish({...fish, arrivalDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Período Sazonal</label>
              <select
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                value={ident.period || ''}
                onChange={e => setIdent({...ident, period: e.target.value})}
              >
                <option value="" className="dark:bg-slate-800">-- Escolha o Período --</option>
                <option value="seco" className="dark:bg-slate-800">Seco</option>
                <option value="chuvoso" className="dark:bg-slate-800">Chuvoso</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Dias de Pescaria</p>
                  <p className="text-sm font-extrabold text-blue-900 dark:text-blue-300">{fish.fishingDays} dias</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-400">
                  <Waves size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Fase da Lua</p>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{fish.moonPhase || 'Insira datas acima...'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: ARTE DE PESCA */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-sm">
            <Settings size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Arte de Pesca</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Tipo de arte, dimensões específicas e malhas</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Escolha a Arte de Pesca</label>
              <select 
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                value={isCustomSpecific ? 'custom' : fish.gearType}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomSpecific(true);
                    setFish(prev => ({ ...prev, gearType: '', gearTypeGeneral: 'Outros' }));
                    setGear({});
                  } else {
                    setIsCustomSpecific(false);
                    const general = getGeneralGearType(val);
                    setFish(prev => ({ ...prev, gearType: val, gearTypeGeneral: general }));
                    setGear({});
                  }
                }}
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

            {/* Custom input fields */}
            {isCustomSpecific ? (
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">Digitar Arte de Pesca Customizada</label>
                <input 
                  type="text"
                  className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-900/60 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold placeholder-indigo-300 text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                  placeholder="--"
                  value={customSpecificText}
                  onChange={e => {
                    const val = e.target.value;
                    setCustomSpecificText(val);
                    const general = getGeneralGearType(val);
                    setFish(prev => ({ ...prev, gearType: val, gearTypeGeneral: general }));
                  }}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">Arte Selecionada</label>
                <input 
                  type="text"
                  disabled
                  className="w-full p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed text-xs md:text-sm"
                  value={fish.gearType}
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Categoria Geral da Arte de Pesca (Preenchimento Automático)</label>
              <select 
                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs md:text-sm shadow-sm ${
                  isCustomSpecific ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
                disabled={!isCustomSpecific}
                value={fish.gearTypeGeneral || 'Outros'}
                onChange={e => {
                  const val = e.target.value;
                  setFish(prev => ({ ...prev, gearTypeGeneral: val }));
                }}
              >
                {ALL_GENERAL_GEARS.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-slate-800">{cat}</option>
                ))}
                <option value="Outros" className="dark:bg-slate-800">Outros</option>
              </select>
            </div>
          </div>

          {/* Dynamic Gear Dimensions Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Dimensões Detalhadas do Equipamento</h4>
            
            {fish.gearTypeGeneral === 'Rede de emalhe' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-750 dark:text-slate-300">Tamanho da Malha (mm)</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                    value={gear.meshSize || ''}
                    onChange={e => setGear({...gear, meshSize: e.target.value})}
                    placeholder="--"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-750 dark:text-slate-300">Comprimento da Rede (m)</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                    value={gear.length || ''}
                    onChange={e => setGear({...gear, length: e.target.value})}
                    placeholder="--"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-750 dark:text-slate-300">Altura da Rede (m)</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                    value={gear.height || ''}
                    onChange={e => setGear({...gear, height: e.target.value})}
                    placeholder="--"
                  />
                </div>
              </div>
            ) : fish.gearTypeGeneral === 'Linha de mão' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-755 dark:text-slate-300">Número de Anzóis</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                    value={gear.hookCount || ''}
                    onChange={e => setGear({...gear, hookCount: e.target.value})}
                    placeholder="--"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-755 dark:text-slate-300" htmlFor="comprimento-cabo-linear">Comprimento do Cabo (m)</label>
                  <input 
                    id="comprimento-cabo-linear"
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                    value={gear.length || ''}
                    onChange={e => setGear({...gear, length: e.target.value})}
                    placeholder="--"
                  />
                </div>
              </div>
            ) : fish.gearTypeGeneral === 'Armadilha' ? (
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-760 dark:text-slate-300">Número de Armadilhas/Covo</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none max-w-md font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                    value={gear.trapCount || ''}
                    onChange={e => setGear({...gear, trapCount: e.target.value})}
                    placeholder="--"
                  />
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Sem especificações de dimensões adicionais necessárias para a categoria: <strong className="text-slate-650 dark:text-slate-400 font-bold">{fish.gearTypeGeneral || 'Outros'}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: REGISTRO DE PRODUÇÃO */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
            <Package size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Produção</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Inserção de espécies pescadas, pesos e valores de venda</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Adicionar Espécie na Ficha</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Nome Popular</label>
                <input 
                  id="popular-name-input"
                  type="text" 
                  placeholder="--" 
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm"
                  value={newItem.species}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onChange={e => {
                    const val = e.target.value;
                    setNewItem({...newItem, species: val});
                    // Auto-fill scientific name if exact match exists
                    const exact = speciesList.find(s => s.commonName.toLowerCase() === val.toLowerCase().trim());
                    if (exact) {
                      setScientificName(exact.scientificName);
                    } else {
                      setScientificName('');
                    }
                  }}
                />
                {showSuggestions && speciesSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg divide-y divide-slate-50 dark:divide-slate-700">
                    {speciesSuggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col cursor-pointer"
                        onMouseDown={() => {
                          setNewItem(prev => ({...prev, species: s.commonName}));
                          setScientificName(s.scientificName);
                          setShowSuggestions(false);
                        }}
                      >
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{s.commonName}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic font-medium">{s.scientificName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Nome Científico</label>
                <input 
                  id="scientific-name-input"
                  type="text" 
                  placeholder="--" 
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 italic text-xs text-slate-700 dark:text-slate-300 font-bold shadow-sm"
                  value={scientificName}
                  onChange={e => setScientificName(e.target.value)}
                />
              </div>
            </div>

            {/* Special Dynamic Inputs based on Detected Species Group */}
            {detectedGroup === 'default' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Peso Total (kg)</label>
                  <input 
                    id="weight-input"
                    type="text" 
                    placeholder="--" 
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 text-xs md:text-sm font-bold shadow-sm"
                    value={newItem.weight}
                    onChange={e => setNewItem({...newItem, weight: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">Preço (R$/kg)</label>
                  <input 
                    id="price-input"
                    type="text" 
                    placeholder="--" 
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 text-xs md:text-sm font-bold shadow-sm"
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: e.target.value})}
                  />
                </div>

                <button 
                  type="button"
                  onClick={addProductionItem}
                  className="bg-blue-600 text-white rounded-xl py-3 px-4 font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 h-[48px] w-full text-xs cursor-pointer shadow-md shadow-blue-200 dark:shadow-none"
                >
                  <Plus size={18} /> Adicionar Espécie
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {detectedGroup === 'caranguejo_siri' && (
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-indigo-850 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
                      <span>🦀 Seção Especial: Caranguejos e Siris</span>
                      <span className="text-[10px] normal-case font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">Fórmula diferenciada</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 block">N° de Cordas</label>
                        <input 
                          id="num-cordas-input"
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={numCordas}
                          onChange={e => setNumCordas(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 block">N° de Exemplares na Corda</label>
                        <input 
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={numExemplares}
                          onChange={e => setNumExemplares(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 block">Peso do Exemplar (kg)</label>
                        <input 
                          type="number" 
                          step="0.001"
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={pesoIndividual}
                          onChange={e => setPesoIndividual(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 block">Preço por Corda (R$)</label>
                        <input 
                          id="price-input"
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={newItem.price}
                          onChange={e => setNewItem({...newItem, price: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-indigo-100/50 dark:border-indigo-900/30">
                      <div className="flex flex-wrap gap-6 text-xs font-medium">
                        <div className="text-slate-600 dark:text-slate-400">
                          ⚖️ Peso Estimado: <strong className="text-indigo-800 dark:text-indigo-300 text-sm">{(parseFloat(numCordas) * parseFloat(numExemplares) * parseFloat(pesoIndividual) || 0).toFixed(2)} kg</strong>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          💰 Receita Total: <strong className="text-indigo-800 dark:text-indigo-300 text-sm">R$ {(parseFloat(numCordas) * parseFloat(newItem.price) || 0).toFixed(2)}</strong>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={addProductionItem}
                        className="bg-indigo-600 text-white rounded-xl py-2 px-6 font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 h-[42px] text-xs self-end sm:self-auto cursor-pointer shadow-sm"
                      >
                        <Plus size={16} /> Adicionar Produção
                      </button>
                    </div>
                  </div>
                )}

                {detectedGroup === 'ostra' && (
                  <div className="bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-purple-850 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
                      <span>🦪 Seção Especial: Bivalves - Ostras</span>
                      <span className="text-[10px] normal-case font-semibold text-purple-600 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">Fórmula diferenciada</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-purple-700 dark:text-purple-400 block">N° de Sacos</label>
                        <input 
                          id="num-sacos-input"
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={numSacos}
                          onChange={e => setNumSacos(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-purple-700 dark:text-purple-400 block">Peso de cada Saco (kg)</label>
                        <input 
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={pesoSaco}
                          onChange={e => setPesoSaco(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-purple-700 dark:text-purple-400 block">Preço por Saco (R$)</label>
                        <input 
                          id="price-input"
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={newItem.price}
                          onChange={e => setNewItem({...newItem, price: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-purple-100/50 dark:border-purple-900/30">
                      <div className="flex flex-wrap gap-6 text-xs font-medium">
                        <div className="text-slate-600 dark:text-slate-400">
                          ⚖️ Peso Estimado: <strong className="text-purple-800 dark:text-purple-300 text-sm">{(parseFloat(numSacos) * parseFloat(pesoSaco) || 0).toFixed(2)} kg</strong>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          💰 Receita Total: <strong className="text-purple-800 dark:text-purple-300 text-sm">R$ {(parseFloat(numSacos) * parseFloat(newItem.price) || 0).toFixed(2)}</strong>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={addProductionItem}
                        className="bg-purple-600 text-white rounded-xl py-2 px-6 font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 h-[42px] text-xs self-end sm:self-auto cursor-pointer shadow-sm"
                      >
                        <Plus size={16} /> Adicionar Produção
                      </button>
                    </div>
                  </div>
                )}

                {detectedGroup === 'marisco' && (
                  <div className="bg-teal-50/70 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-teal-850 dark:text-teal-300 font-bold text-xs uppercase tracking-wider">
                      <span>🐚 Seção Especial: Bivalves - Mariscos</span>
                      <span className="text-[10px] normal-case font-semibold text-teal-600 dark:text-teal-400 bg-teal-100/50 dark:bg-teal-900/40 px-2 py-0.5 rounded-full">Fórmula diferenciada</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-teal-700 dark:text-teal-400 block">N° de Sacos</label>
                        <input 
                          id="num-sacos-input"
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900/50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={numSacos}
                          onChange={e => setNumSacos(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-teal-700 dark:text-teal-400 block">Peso de cada Saco (kg)</label>
                        <input 
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900/50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={pesoSaco}
                          onChange={e => setPesoSaco(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-teal-700 dark:text-teal-400 block">Rend. Polpa (kg)</label>
                        <input 
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900/50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={rendimentoPolpa}
                          onChange={e => setRendimentoPolpa(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-teal-700 dark:text-teal-400 block">Preço / kg da Polpa (R$)</label>
                        <input 
                          id="price-input"
                          type="number" 
                          placeholder="--" 
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900/50 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
                          value={newItem.price}
                          onChange={e => setNewItem({...newItem, price: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-teal-100/50 dark:border-teal-900/30">
                      <div className="flex flex-wrap gap-6 text-xs font-medium">
                        <div className="text-slate-600 dark:text-slate-400">
                          ⚖️ Peso Estimado: <strong className="text-teal-800 dark:text-teal-300 text-sm">{(parseFloat(numSacos) * parseFloat(pesoSaco) || 0).toFixed(2)} kg</strong>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          💰 Receita Total: <strong className="text-teal-800 dark:text-teal-300 text-sm">R$ {(parseFloat(rendimentoPolpa) * parseFloat(newItem.price) || 0).toFixed(2)}</strong>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={addProductionItem}
                        className="bg-teal-600 text-white rounded-xl py-2 px-6 font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 h-[42px] text-xs self-end sm:self-auto cursor-pointer shadow-sm"
                      >
                        <Plus size={16} /> Adicionar Produção
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TABLE OF PRODUCTION */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left min-w-[550px] md:min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850">
                <tr>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Espécie</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Peso Total</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preço Unitário</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Calculado</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {production.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 italic text-xs sm:text-sm font-medium">
                      Nenhuma espécie adicionada à produção desta ficha ainda. Utilize o formulário acima para registrar.
                    </td>
                  </tr>
                ) : (
                  production.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm md:text-base">{item.species}</span>
                        {item.scientificName && (
                          <span className="block text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5 font-normal">
                            {item.scientificName}
                          </span>
                        )}
                        {item.groupType === 'caranguejo_siri' && (
                          <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 mt-1.5 font-semibold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2 py-0.5 rounded-lg w-max shadow-sm">
                            🦀 {item.numCordas} cordas × {item.numExemplares} exemplares × {item.pesoIndividual} kg | R$ {item.originalPrice?.toFixed(2)}/corda
                          </span>
                        )}
                        {item.groupType === 'ostra' && (
                          <span className="block text-[10px] text-purple-600 dark:text-purple-400 mt-1.5 font-semibold bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 px-2 py-0.5 rounded-lg w-max shadow-sm">
                            🦪 {item.numSacos} sacos × {item.pesoSaco} kg | R$ {item.originalPrice?.toFixed(2)}/saco
                          </span>
                        )}
                        {item.groupType === 'marisco' && (
                          <span className="block text-[10px] text-teal-600 dark:text-teal-400 mt-1.5 font-semibold bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 px-2 py-0.5 rounded-lg w-max shadow-sm">
                            🐚 {item.numSacos} sacos × {item.pesoSaco} kg | Polpa: {item.rendimentoPolpa} kg × R$ {item.originalPrice?.toFixed(2)}/kg
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300">{item.weight.toFixed(1)} kg</td>
                      <td className="px-6 py-4 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300">R$ {item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400">R$ {(item.weight * item.price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => removeProductionItem(item.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {production.length > 0 && (
                <tfoot className="bg-blue-50/50 dark:bg-blue-950/20 font-bold text-slate-800 dark:text-slate-200 border-t border-slate-200 dark:border-slate-850">
                  <tr>
                    <td className="px-6 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Total Geral da Ficha</td>
                    <td className="px-6 py-4 text-sm font-extrabold text-slate-800 dark:text-slate-100">{production.reduce((acc, curr) => acc + curr.weight, 0).toFixed(1)} kg</td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-base font-extrabold text-blue-700 dark:text-blue-400">
                      R$ {production.reduce((acc, curr) => acc + (curr.weight * curr.price), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS - FIXED OR VISUALLY POWERFUL STICKY ACTION PANEL */}
      <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <button 
            type="button"
            onClick={() => {
              onCancel();
              localStorage.removeItem('fishery_wizard_draft');
            }}
            className="text-slate-550 dark:text-slate-400 font-extrabold hover:text-slate-750 dark:hover:text-slate-200 transition-colors px-4 py-2.5 text-xs uppercase tracking-wider border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 cursor-pointer"
          >
            Voltar para Lista
          </button>
          
          <button 
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-red-200 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-extrabold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer bg-white dark:bg-slate-900"
            title="Limpar todos os dados digitados nesta ficha"
          >
            <Trash2 size={14} /> Limpar Campos
          </button>
        </div>
        
        <button 
          type="button"
          onClick={handleSave}
          disabled={isSaving || production.length === 0 || !idNumber || !idNumber.trim()}
          className={`flex items-center gap-2 px-10 py-4 rounded-xl text-white font-extrabold transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer ${
            isSaving || production.length === 0 || !idNumber || !idNumber.trim()
              ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 shadow-green-200 dark:shadow-none'
          }`}
        >
          <Save size={16} /> {isSaving ? 'Salvando...' : 'Finalizar e Salvar Ficha'}
        </button>
      </div>
    </div>
  );
};

export default LandingFormWizard;
