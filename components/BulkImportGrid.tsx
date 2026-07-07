
import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { LandingForm, Species, Fisherman } from '../types';
import { getGeneralGearType } from '../utils/gearUtils';
import { getMoonPhase, getMoonPhasesForRange } from '../utils/moonPhase';
import { generateId } from '../utils/uuid';
import { parseToISODate } from '../utils/dateUtils';
import { parsePortugueseNumber } from '../utils/numberUtils';
import { standardizeText, standardizeScientificName } from '../utils/textUtils';
import { 
  Plus, 
  Trash2, 
  Save, 
  Table as TableIcon,
  Eraser,
  CheckSquare,
  Square,
  Rows,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

interface Props {
  onSave: (forms: LandingForm[]) => void;
  onCancel: () => void;
  speciesList?: Species[];
  fishermen?: Fisherman[];
}

interface GridRow {
  id: string;
  selected: boolean;
  idNumber: string;
  idInterno: string;
  location: string;
  collectorName: string;
  year: string;
  month: string;
  period: string;
  fishermanName: string;
  vesselName: string;
  fishingGround: string;
  vesselType: string;
  propulsionType: string;
  fisherCount: string;
  moonPhase: string;
  departureDate: string;
  arrivalDate: string;
  fishingDays: string;
  gearType: string;
  gearTypeGeneral: string;
  gearLength: string;
  gearHeight: string;
  gearMeshSize: string;
  hookCount: string;
  hookSize: string;
  trapCount: string;
  jequiBleedingMesh: string;
  netLength: string;
  mouthHeight: string;
  trawlMeshSize: string;
  species: string;
  scientificName: string;
  weight: string;
  price: string;
  revenue: string;
  groupType: string;
  numCordas: string;
  numExemplares: string;
  pesoIndividual: string;
  numSacos: string;
  pesoSaco: string;
  rendimentoPolpa: string;
  originalPrice: string;
}

const FIELDS: (keyof GridRow)[] = [
  'idNumber',
  'idInterno',
  'location',
  'collectorName',
  'year',
  'month',
  'period',
  'fishermanName',
  'vesselName',
  'fishingGround',
  'vesselType',
  'propulsionType',
  'fisherCount',
  'moonPhase',
  'departureDate',
  'arrivalDate',
  'fishingDays',
  'gearType',
  'gearTypeGeneral',
  'gearLength',
  'gearHeight',
  'gearMeshSize',
  'hookCount',
  'hookSize',
  'trapCount',
  'jequiBleedingMesh',
  'netLength',
  'mouthHeight',
  'trawlMeshSize',
  'species',
  'scientificName',
  'weight',
  'price',
  'revenue',
  'groupType',
  'numCordas',
  'numExemplares',
  'pesoIndividual',
  'numSacos',
  'pesoSaco',
  'rendimentoPolpa',
  'originalPrice'
];

const FIELD_TRANSLATIONS: Record<string, string> = {
  idNumber: 'Ficha N.',
  idInterno: 'ID Interno',
  location: 'Local',
  collectorName: 'Coletor',
  year: 'Ano',
  month: 'Mês',
  period: 'Período (Estação)',
  fishermanName: 'Pescador / Proprietário',
  vesselName: 'Nome da Embarcação',
  fishingGround: 'Pesqueiro / Local de Captura',
  vesselType: 'Tipo da Embarcação',
  propulsionType: 'Tipo de Propulsão',
  fisherCount: 'N° de Pescadores',
  moonPhase: 'Fase da Lua',
  departureDate: 'Data de Saída',
  arrivalDate: 'Data de Chegada',
  fishingDays: 'Dias de Pescaria',
  gearType: 'Arte de Pesca',
  gearTypeGeneral: 'Arte de Pesca Geral',
  gearLength: 'Rede de Emalhe: Comprimento (m)',
  gearHeight: 'Rede de Emalhe: Altura (m)',
  gearMeshSize: 'Rede de Emalhe: Tamanho da Malha',
  hookCount: 'Linha de Mão: N° de Anzóis',
  hookSize: 'Linha de Mão: Tamanho do Anzol',
  trapCount: 'Armadilha: N° de Armadilhas',
  jequiBleedingMesh: 'Jequi: Malha de Sangra (cm)',
  netLength: 'Arrasto de Fundo: Comprimento da Rede (m)',
  mouthHeight: 'Arrasto de Fundo: Altura da Boca (m)',
  trawlMeshSize: 'Arrasto de Fundo: Tamanho da Malha (mm)',
  species: 'Espécie',
  scientificName: 'Nome Científico',
  weight: 'Peso Total (Kg)',
  price: 'Preço de Venda (R$/Kg)',
  revenue: 'Receita Estimada (R$)',
  groupType: 'Grupo Especial',
  numCordas: 'N° de Cordas',
  numExemplares: 'Exemplares por Corda',
  pesoIndividual: 'Peso Individual do Exemplar (kg)',
  numSacos: 'N° de Sacos',
  pesoSaco: 'Peso do Saco (kg)',
  rendimentoPolpa: 'Rendimento da Polpa (kg)',
  originalPrice: 'Preço Unitário Original (R$)'
};

// Componente de linha memoizado com otimização de renderização nativa (CSS contain)
const TableRow = memo(({ 
  row, 
  index, 
  onUpdateRow, 
  onSetFocusedCell,
  onNavigateCell,
  zoom = 100
}: { 
  row: GridRow; 
  index: number; 
  onUpdateRow: (id: string, field: keyof GridRow, value: any) => void;
  onSetFocusedCell: (cell: { rowIndex: number, field: keyof GridRow } | null) => void;
  onNavigateCell: (rowIndex: number, field: keyof GridRow) => void;
  zoom?: number;
}) => {
  // Verifica se a linha tem qualquer campo preenchido (linha ativa / dirty)
  const isRowDirty = FIELDS.some(f => row[f] && String(row[f]).trim() !== '');

  const getFieldError = (field: keyof GridRow): string | null => {
    if (!isRowDirty) return null;

    // Apenas data de saída e data de chegada mostrarão marcações de erro (vermelha)
    if (field !== 'departureDate' && field !== 'arrivalDate') {
      return null;
    }

    const val = String(row[field] || '').trim();
    if (!val) {
      return null;
    }

    // 1. Validação de formato da data (DD/MM/AAAA)
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      return 'Data deve estar no formato DD/MM/AAAA';
    }

    const [dStr, mStr, yStr] = val.split('/');
    const d = parseInt(dStr, 10);
    const m = parseInt(mStr, 10);
    const y = parseInt(yStr, 10);

    if (isNaN(d) || isNaN(m) || isNaN(y)) {
      return 'Data inválida';
    }
    if (m < 1 || m > 12) {
      return 'Mês inválido (deve ser entre 01 e 12)';
    }
    if (y < 1900 || y > 2100) {
      return 'Ano inválido (deve ser entre 1900 e 2100)';
    }
    const maxDays = new Date(y, m, 0).getDate();
    if (d < 1 || d > maxDays) {
      return `Dia inválido para o mês informado (máximo ${maxDays})`;
    }

    // 2. Validação comparativa: data de saída mais recente do que a data de chegada
    const otherField = field === 'departureDate' ? 'arrivalDate' : 'departureDate';
    const otherVal = String(row[otherField] || '').trim();

    if (otherVal && /^\d{2}\/\d{2}\/\d{4}$/.test(otherVal)) {
      const [odStr, omStr, oyStr] = otherVal.split('/');
      const od = parseInt(odStr, 10);
      const om = parseInt(omStr, 10);
      const oy = parseInt(oyStr, 10);

      if (!isNaN(od) && !isNaN(om) && !isNaN(oy)) {
        if (om >= 1 && om <= 12 && oy >= 1900 && oy <= 2100 && od >= 1 && od <= new Date(oy, om, 0).getDate()) {
          const thisDate = new Date(y, m - 1, d);
          const otherDate = new Date(oy, om - 1, od);

          if (field === 'departureDate') {
            if (thisDate.getTime() > otherDate.getTime()) {
              return 'A data de saída não pode ser mais recente do que a data de chegada';
            }
          } else {
            if (otherDate.getTime() > thisDate.getTime()) {
              return 'A data de chegada não pode ser anterior à data de saída';
            }
          }
        }
      }
    }

    return null;
  };

  const getDatalistId = (field: keyof GridRow): string | undefined => {
    if (field === 'location') {
      return 'location-options-grid';
    }
    return undefined;
  };

  const getRowStyle = () => {
    const height = Math.round(44 * (zoom / 100));
    return {
      height: `${height}px`
    };
  };

  const getTdStyle = () => {
    const pad = Math.max(1, Math.round(7 * (zoom / 100)));
    return {
      padding: `${pad}px`
    };
  };

  const getInputStyle = (field: keyof GridRow) => {
    const fontSize = Math.max(9, Math.round(13 * (zoom / 100)));
    const padTopBottom = Math.max(1, Math.round(5 * (zoom / 100)));
    const padLeftRight = Math.max(2, Math.round(8 * (zoom / 100)));
    
    return {
      fontSize: `${fontSize}px`,
      padding: `${padTopBottom}px ${padLeftRight}px`,
      fontStyle: field === 'scientificName' ? 'italic' : 'normal',
      fontWeight: field === 'species' ? 'bold' : 'normal',
    };
  };

  const getIconSize = () => {
    return Math.max(11, Math.round(18 * (zoom / 100)));
  };

  return (
    <tr 
      className={`hover:bg-white dark:hover:bg-slate-800 bg-transparent ${row.selected ? 'bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-50/90 dark:hover:bg-blue-950/40' : ''}`} 
      style={{ contentVisibility: 'auto', containIntrinsicSize: `0 ${Math.round(44 * (zoom / 100))}px`, ...getRowStyle() }}
    >
      <td 
        className="border-b border-r border-slate-200 dark:border-slate-800 text-center bg-inherit sticky left-0 z-10"
        style={getTdStyle()}
      >
        <button 
          onClick={() => onUpdateRow(row.id, 'selected', !row.selected)} 
          className={`${row.selected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
        >
          {row.selected ? <CheckSquare size={getIconSize()} /> : <Square size={getIconSize()} />}
        </button>
      </td>
      {FIELDS.map(field => {
        const error = getFieldError(field);
        const hasError = !!error;
        const datalistId = getDatalistId(field);

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          const currentFieldIndex = FIELDS.indexOf(field);
          
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            onNavigateCell(index + 1, field);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (index > 0) {
              onNavigateCell(index - 1, field);
            }
          } else if (e.key === 'ArrowLeft') {
            const target = e.currentTarget;
            if (target.selectionStart === 0 && target.selectionEnd === 0) {
              if (currentFieldIndex > 0) {
                e.preventDefault();
                onNavigateCell(index, FIELDS[currentFieldIndex - 1]);
              }
            }
          } else if (e.key === 'ArrowRight') {
            const target = e.currentTarget;
            const len = target.value.length;
            if (target.selectionStart === len && target.selectionEnd === len) {
              if (currentFieldIndex < FIELDS.length - 1) {
                e.preventDefault();
                onNavigateCell(index, FIELDS[currentFieldIndex + 1]);
              }
            }
          }
        };

        return (
          <td 
            key={field} 
            className={`p-0 border-b border-r border-slate-200 dark:border-slate-800 ${
              hasError ? 'bg-red-50/40 dark:bg-red-950/15 hover:bg-red-50/60 dark:hover:bg-red-950/25' : ''
            }`}
          >
            <input 
              data-row-index={index}
              data-field={field}
              type="text" 
              value={row[field] as string} 
              onChange={e => onUpdateRow(row.id, field, e.target.value)}
              onFocus={() => onSetFocusedCell({ rowIndex: index, field })}
              onKeyDown={handleKeyDown}
              list={datalistId}
              title={error || undefined}
              className={`w-full bg-transparent outline-none focus:bg-blue-100/70 dark:focus:bg-blue-950/30 focus:ring-inset focus:ring-2 focus:ring-blue-600 text-slate-800 dark:text-slate-100 ${
                field === 'species' ? 'font-bold text-blue-700 dark:text-blue-400' : ''
              } ${field === 'scientificName' ? 'italic text-slate-600 dark:text-slate-450' : ''} ${
                hasError ? 'border-b-2 border-red-500 text-red-900 dark:text-red-400 placeholder-red-300 dark:placeholder-red-700' : ''
              }`}
              style={getInputStyle(field)}
              placeholder={
                field === 'departureDate' || field === 'arrivalDate' 
                  ? 'DD/MM/AAAA' 
                  : ''
              }
            />
          </td>
        );
      })}
    </tr>
  );
});

const BulkImportGrid: React.FC<Props> = ({ onSave, onCancel, speciesList, fishermen }) => {
  const [rows, setRows] = useState<GridRow[]>(() => Array(2000).fill(null).map(() => createEmptyRow()));
  const [numRowsToAdd, setNumRowsToAdd] = useState<number | ''>(10);
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number, field: keyof GridRow } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [zoom, setZoom] = useState<number>(100); // Dynamic Excel-like zoom factor (supports values from 30% to 200%)

  // Referência para o container rolável da planilha para escutar eventos de zoom (Ctrl+Scroll)
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomStep = e.deltaY > 0 ? -5 : 5;
        setZoom(prev => Math.min(200, Math.max(30, prev + zoomStep)));
      }
    };

    const container = gridContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheelZoom, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheelZoom);
      }
    };
  }, []);

  const handleNavigateCell = useCallback((rowIndex: number, field: keyof GridRow) => {
    if (!gridContainerRef.current) return;
    const targetEl = gridContainerRef.current.querySelector<HTMLInputElement>(
      `input[data-row-index="${rowIndex}"][data-field="${field}"]`
    );
    if (targetEl) {
      targetEl.focus();
      targetEl.select();
      
      // Animação instantânea (sem delay) para posicionar a célula focada na tela
      targetEl.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, []);

  const handleSetFocusedCell = useCallback((cell: { rowIndex: number, field: keyof GridRow } | null) => {
    setFocusedCell(cell);
  }, []);

  function createEmptyRow(): GridRow {
    return { 
      id: generateId(), 
      selected: false, 
      idNumber: '', 
      idInterno: '',
      location: '', 
      collectorName: '', 
      year: '', 
      month: '', 
      period: '',
      fishermanName: '',
      vesselName: '',
      fishingGround: '', 
      vesselType: '', 
      propulsionType: '',
      fisherCount: '',
      moonPhase: '',
      departureDate: '', 
      arrivalDate: '', 
      fishingDays: '',
      gearType: '', 
      gearTypeGeneral: '',
      gearLength: '',
      gearHeight: '',
      gearMeshSize: '',
      hookCount: '',
      hookSize: '',
      trapCount: '',
      jequiBleedingMesh: '',
      netLength: '',
      mouthHeight: '',
      trawlMeshSize: '',
      species: '', 
      scientificName: '', 
      weight: '', 
      price: '',
      revenue: '',
      groupType: '',
      numCordas: '',
      numExemplares: '',
      pesoIndividual: '',
      numSacos: '',
      pesoSaco: '',
      rendimentoPolpa: '',
      originalPrice: ''
    };
  }

  const updateRow = useCallback((id: string, field: keyof GridRow, value: any) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      
      const updatedRow = { ...next[idx], [field]: value };
      if (field === 'gearType') {
        updatedRow.gearTypeGeneral = getGeneralGearType(value);
      }
      next[idx] = updatedRow;
      return next;
    });
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || !focusedCell || isImporting) return;
    
    e.preventDefault();
    setIsImporting(true);

    // Pequeno delay para permitir que a UI mostre o estado "Importando"
    setTimeout(() => {
      const lines = pasteData.split(/\r\n|\n|\r/).filter(line => line !== "");
      if (lines.length === 0) {
        setIsImporting(false);
        return;
      }

      setRows(prevRows => {
        const nextRows = [...prevRows];
        const { rowIndex: startRow, field: startField } = focusedCell;
        const startFieldIndex = FIELDS.indexOf(startField);

        // Garante que a grade tenha espaço suficiente para todas as linhas coladas
        const totalRowsNeeded = startRow + lines.length;
        while (nextRows.length < totalRowsNeeded) {
          nextRows.push(createEmptyRow());
        }

        // Processamento atômico de todas as linhas para evitar cortes
        for (let i = 0; i < lines.length; i++) {
          const targetRowIdx = startRow + i;
          const columns = lines[i].split('\t');
          
          // Clonamos a linha apenas uma vez antes de atualizar seus campos
          const updatedRow = { ...nextRows[targetRowIdx] };
          
          for (let j = 0; j < columns.length; j++) {
            const targetFieldIdx = startFieldIndex + j;
            if (targetFieldIdx < FIELDS.length) {
              const field = FIELDS[targetFieldIdx];
              const val = columns[j].trim();
              updatedRow[field] = val;
              if (field === 'gearType') {
                updatedRow.gearTypeGeneral = getGeneralGearType(val);
              }
            }
          }
          nextRows[targetRowIdx] = updatedRow;
        }

        return nextRows;
      });

      setIsImporting(false);
    }, 10);
  }, [focusedCell, isImporting]);

  const handleFinalize = async () => {
    const validRows = rows.filter(row => row.collectorName.trim() && row.species.trim() && row.weight.trim());
    if (validRows.length === 0) {
      alert("Erro: Preencha pelo menos Coletor, Espécie e Peso.");
      return;
    }

    setIsSaving(true);
    const newForms: LandingForm[] = [];
    
    // Processamento em lotes para manter a responsividade durante a conversão
    const CHUNK_SIZE = 40;
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);
      const processedChunk = chunk.map(row => {
        const arrival = row.arrivalDate.trim();
        const departure = row.departureDate.trim();
        const isoArrival = parseToISODate(arrival);
        const isoDeparture = parseToISODate(departure);
        const moonPhase = row.moonPhase ? row.moonPhase.trim() : ((isoDeparture && isoArrival)
          ? getMoonPhasesForRange(isoDeparture, isoArrival)
          : (isoArrival ? getMoonPhase(isoArrival) : 'N/A'));

        let fishingDays = parseInt(row.fishingDays, 10);
        if (isNaN(fishingDays)) {
          fishingDays = 1;
          if (isoArrival && isoDeparture) {
            const start = new Date(isoDeparture);
            const end = new Date(isoArrival);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              fishingDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
            }
          }
        }

        let calculatedMonth = row.month ? row.month.trim().toLowerCase() : undefined;
        let calculatedYear = parseInt(row.year, 10) || undefined;
        let calculatedPeriod = row.period ? row.period.trim().toLowerCase() : undefined;

        const dateForCalc = isoArrival || isoDeparture;
        if (dateForCalc) {
          const parts = dateForCalc.split('-');
          if (parts.length === 3) {
            const yearVal = parseInt(parts[0], 10);
            const monthNum = parseInt(parts[1], 10);
            const monthsPt = [
              "janeiro", "fevereiro", "março", "abril", "maio", "junho",
              "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
            ];
            const monthName = monthsPt[monthNum - 1];
            
            if (!calculatedMonth) {
              calculatedMonth = monthName;
            }
            if (!calculatedYear) {
              calculatedYear = yearVal;
            }
            if (!calculatedPeriod) {
              calculatedPeriod = monthNum <= 5 ? 'chuvoso' : 'seco';
            }
          }
        }

        calculatedMonth = calculatedMonth || 'janeiro';
        calculatedYear = calculatedYear || new Date().getFullYear();
        calculatedPeriod = calculatedPeriod || 'seco';

        // Gear values parsing
        const gear: any = {};
        
        const gearLength = parsePortugueseNumber(row.gearLength);
        if (!isNaN(gearLength) && row.gearLength.trim() !== '') gear.length = gearLength;
        
        const gearHeight = parsePortugueseNumber(row.gearHeight);
        if (!isNaN(gearHeight) && row.gearHeight.trim() !== '') gear.height = gearHeight;
        
        if (row.gearMeshSize.trim() !== '') gear.meshSize = row.gearMeshSize.trim();
        
        const hookCount = parseInt(row.hookCount, 10);
        if (!isNaN(hookCount) && row.hookCount.trim() !== '') gear.hookCount = hookCount;
        
        if (row.hookSize.trim() !== '') gear.hookSize = row.hookSize.trim();
        
        const trapCount = parseInt(row.trapCount, 10);
        if (!isNaN(trapCount) && row.trapCount.trim() !== '') gear.trapCount = trapCount;
        
        const jequiBleedingMesh = parsePortugueseNumber(row.jequiBleedingMesh);
        if (!isNaN(jequiBleedingMesh) && row.jequiBleedingMesh.trim() !== '') gear.jequiBleedingMesh = jequiBleedingMesh;
        
        const netLength = parsePortugueseNumber(row.netLength);
        if (!isNaN(netLength) && row.netLength.trim() !== '') gear.netLength = netLength;
        
        const mouthHeight = parsePortugueseNumber(row.mouthHeight);
        if (!isNaN(mouthHeight) && row.mouthHeight.trim() !== '') gear.mouthHeight = mouthHeight;
        
        if (row.trawlMeshSize.trim() !== '') gear.trawlMeshSize = row.trawlMeshSize.trim();

        // Production values parsing
        const weightVal = parsePortugueseNumber(row.weight);
        const priceVal = parsePortugueseNumber(row.price);
        const revenueVal = parsePortugueseNumber(row.revenue);

        let finalPrice = priceVal;
        if ((isNaN(priceVal) || priceVal <= 0) && !isNaN(revenueVal) && weightVal > 0) {
          finalPrice = revenueVal / weightVal;
        }

        const productionItem: any = {
          id: generateId(),
          species: standardizeText(row.species),
          scientificName: row.scientificName ? standardizeScientificName(row.scientificName) : undefined,
          weight: weightVal,
          price: !isNaN(finalPrice) ? finalPrice : 0
        };

        if (row.groupType.trim() !== '') productionItem.groupType = row.groupType.trim();
        
        const numCordas = parseInt(row.numCordas, 10);
        if (!isNaN(numCordas) && row.numCordas.trim() !== '') productionItem.numCordas = numCordas;
        
        const numExemplares = parseInt(row.numExemplares, 10);
        if (!isNaN(numExemplares) && row.numExemplares.trim() !== '') productionItem.numExemplares = numExemplares;
        
        const pesoIndividual = parsePortugueseNumber(row.pesoIndividual);
        if (!isNaN(pesoIndividual) && row.pesoIndividual.trim() !== '') productionItem.pesoIndividual = pesoIndividual;
        
        const numSacos = parseInt(row.numSacos, 10);
        if (!isNaN(numSacos) && row.numSacos.trim() !== '') productionItem.numSacos = numSacos;
        
        const pesoSaco = parsePortugueseNumber(row.pesoSaco);
        if (!isNaN(pesoSaco) && row.pesoSaco.trim() !== '') productionItem.pesoSaco = pesoSaco;
        
        const rendimentoPolpa = parsePortugueseNumber(row.rendimentoPolpa);
        if (!isNaN(rendimentoPolpa) && row.rendimentoPolpa.trim() !== '') productionItem.rendimentoPolpa = rendimentoPolpa;
        
        const originalPrice = parsePortugueseNumber(row.originalPrice);
        if (!isNaN(originalPrice) && row.originalPrice.trim() !== '') productionItem.originalPrice = originalPrice;

        return {
          id: row.idInterno ? row.idInterno.trim() : generateId(),
          idNumber: row.idNumber ? row.idNumber.trim() : undefined,
          createdAt: new Date().toISOString(),
          isBulkImport: true,
          identification: { 
            collectorName: standardizeText(row.collectorName), 
            location: standardizeText(row.location), 
            fishingGround: row.fishingGround ? standardizeText(row.fishingGround) : undefined, 
            year: calculatedYear, 
            month: calculatedMonth,
            fishermanName: row.fishermanName ? standardizeText(row.fishermanName) : undefined,
            vesselName: row.vesselName ? standardizeText(row.vesselName) : undefined,
            period: calculatedPeriod
          },
          fishing: { 
            vesselType: row.vesselType ? standardizeText(row.vesselType) : '', 
            propulsionType: row.propulsionType ? standardizeText(row.propulsionType) : '', 
            fisherCount: parseInt(row.fisherCount, 10) || 1, 
            gearType: row.gearType ? standardizeText(row.gearType) : 'Tarrafa', 
            gearTypeGeneral: row.gearTypeGeneral ? standardizeText(row.gearTypeGeneral) : getGeneralGearType(row.gearType || 'Tarrafa'), 
            departureDate: isoDeparture, 
            arrivalDate: isoArrival, 
            fishingDays: fishingDays, 
            moonPhase 
          },
          gear,
          production: [productionItem]
        };
      });
      newForms.push(...processedChunk);
      
      // Libera o loop de eventos para manter a UI ativa
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    setShowSuccess(true);
    setTimeout(() => onSave(newForms), 800);
  };

  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleRows = rows.slice(startIndex, endIndex);

  const pageAllSelected = visibleRows.length > 0 && visibleRows.every(r => r.selected);

  return (
    <div 
      className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-[600px] overflow-hidden animate-in fade-in duration-300"
      style={{
        height: '650px',
        paddingLeft: '0px',
        paddingTop: '0px',
        paddingRight: '0px',
        paddingBottom: '0px',
        marginLeft: '0px',
        marginBottom: '0px',
        marginRight: '0px'
      }}
    >
      {showSuccess && (
        <div className="absolute inset-0 z-[100] bg-white/90 dark:bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="bg-green-100 dark:bg-green-950/35 p-6 rounded-full text-green-600 dark:text-green-400 mb-4 animate-bounce"><CheckCircle2 size={64} /></div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">Sucesso!</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2">Dados processados com sucesso.</p>
        </div>
      )}

      <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50" style={{ height: '64px' }}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center p-0" style={{ width: '37px', height: '37px' }}>
            <TableIcon size={17} style={{ width: '17px', height: '17px' }} />
          </div>
          <div><h2 className="font-bold text-slate-800 dark:text-slate-100" style={{ fontSize: '16px' }}>Planilha de Desembarque</h2></div>
        </div>
        <div className="flex items-center gap-3">
          <button disabled={isSaving || isImporting} onClick={() => { setRows(Array(2000).fill(null).map(() => createEmptyRow())); setCurrentPage(1); }} className="flex items-center gap-2 px-4 py-2 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all disabled:opacity-50" style={{ fontSize: '14px' }}><Eraser size={16} /> Limpar Planilha</button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block"></div>
          <button disabled={isSaving || isImporting} onClick={onCancel} className="px-4 py-2 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200" style={{ fontSize: '14px' }}>Cancelar</button>
          <button disabled={isSaving || isImporting} onClick={handleFinalize} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-xl ${isSaving || isImporting ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-100 dark:shadow-none'}`} style={{ fontSize: '14px' }}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isSaving ? 'Processando...' : 'Salvar Tudo'}
          </button>
        </div>
      </div>

      {rows.some(r => r.selected) && (
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={() => setRows(prev => prev.filter(r => !r.selected))} className="flex items-center gap-2 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-red-200 dark:hover:bg-red-900/30"><Trash2 size={14} /> Apagar Seleção</button>
          </div>
        </div>
      )}

      <div ref={gridContainerRef} className="flex-1 overflow-auto bg-slate-100/30 dark:bg-slate-950/10" onPaste={handlePaste}>
        <table className="w-full text-sm border-separate border-spacing-0 table-fixed">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className="bg-slate-200 dark:bg-slate-800">
              <th 
                className="border-b border-r border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 sticky left-0 z-30"
                style={{
                  width: `${Math.round(48 * (zoom / 100))}px`,
                  padding: `${Math.max(2, Math.round(8 * (zoom / 100)))}px`
                }}
              >
                <button 
                  onClick={() => {
                    setRows(prev => {
                      const updated = [...prev];
                      const limit = Math.min(endIndex, totalRows);
                      for (let i = startIndex; i < limit; i++) {
                        updated[i] = { ...updated[i], selected: !pageAllSelected };
                      }
                      return updated;
                    });
                  }} 
                  className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {pageAllSelected ? (
                    <CheckSquare size={Math.max(11, Math.round(18 * (zoom / 100)))} className="text-blue-600 dark:text-blue-400 mx-auto" />
                  ) : (
                    <Square size={Math.max(11, Math.round(18 * (zoom / 100)))} className="mx-auto" />
                  )}
                </button>
              </th>
              {FIELDS.map(f => {
                const label = FIELD_TRANSLATIONS[f] || String(f);
                const isWide = label.length > 15;
                const baseWidth = isWide ? Math.min(280, Math.max(208, label.length * 8.5)) : 128;
                const computedWidth = Math.round(baseWidth * (zoom / 100));
                
                const headerPadY = Math.max(3, Math.round(10 * (zoom / 100)));
                const headerPadX = Math.max(4, Math.round(12 * (zoom / 100)));
                const headerFontSize = Math.max(8, Math.round(10 * (zoom / 100)));
                
                return (
                  <th 
                    key={f} 
                    className="border-b border-r border-slate-300 dark:border-slate-700 text-left font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight bg-slate-200 dark:bg-slate-800 select-none"
                    style={{
                      width: `${computedWidth}px`,
                      padding: `${headerPadY}px ${headerPadX}px`,
                      fontSize: `${headerFontSize}px`
                    }}
                  >
                    {FIELD_TRANSLATIONS[f] || f}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <TableRow 
                key={row.id} 
                row={row} 
                index={startIndex + index} 
                onUpdateRow={updateRow} 
                onSetFocusedCell={handleSetFocusedCell} 
                onNavigateCell={handleNavigateCell}
                zoom={zoom}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-4 select-none animate-in fade-in duration-150" style={{ height: '45px' }}>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
          <input 
            type="number" 
            className="w-12 py-0.5 px-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500" 
            style={{ fontSize: '14px' }}
            value={numRowsToAdd} 
            onChange={e => {
              const val = e.target.value;
              if (val === '') {
                setNumRowsToAdd('');
              } else {
                const parsed = parseInt(val, 10);
                setNumRowsToAdd(isNaN(parsed) ? '' : parsed);
              }
            }} 
            onBlur={() => {
              if (numRowsToAdd === '' || numRowsToAdd < 1) {
                setNumRowsToAdd(1);
              }
            }}
          />
          <button 
            onClick={() => setRows(prev => [...prev, ...Array(Number(numRowsToAdd) || 1).fill(null).map(() => createEmptyRow())])} 
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg font-bold text-xs transition-colors"
          >
            <Plus size={12} /> Adicionar Linhas
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-semibold" style={{ fontSize: '12px' }}>Linhas por página:</span>
            <select
              value={pageSize}
              onChange={e => {
                const newSize = Number(e.target.value);
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
              style={{ fontSize: '12px' }}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors"
              title="Primeira Página"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validCurrentPage === 1}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors"
              title="Página Anterior"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>
              Página{' '}
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setCurrentPage(Math.min(Math.max(1, val), totalPages));
                  }
                }}
                className="w-10 text-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 outline-none"
                style={{ fontSize: '12px' }}
              />{' '}
              de <span className="text-slate-800 dark:text-slate-200 font-bold" style={{ fontSize: '12px' }}>{totalPages}</span>
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validCurrentPage === totalPages}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors"
              title="Próxima Página"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors"
              title="Última Página"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>

        {/* Excel Zoom Slider Control */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold tracking-wider">ZOOM:</span>
          <button 
            type="button"
            onClick={() => setZoom(prev => Math.max(30, prev - 10))}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 active:scale-95 transition-all"
            title="Diminuir Zoom (-10%)"
          >
            -
          </button>
          <div className="flex items-center">
            <input 
              type="range"
              min="30"
              max="200"
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-24 h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              title="Arrastar para mudar o zoom"
            />
          </div>
          <button 
            type="button"
            onClick={() => setZoom(prev => Math.min(200, prev + 10))}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 active:scale-95 transition-all"
            title="Aumentar Zoom (+10%)"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 min-w-[40px] text-right transition-colors text-[11px]"
            title="Redefinir Zoom para 100%"
          >
            {zoom}%
          </button>
        </div>
      </div>

      <datalist id="location-options-grid">
        {['Arrombado', 'Barra Grande', 'Cajueiro da Praia', 'Canárias', 'Coqueiro', 'Luís Correia', 'Igaraçu', 'Ilha Grande', 'Macapá', 'Pedra do Sal'].map(loc => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
    </div>
  );
};

export default BulkImportGrid;
