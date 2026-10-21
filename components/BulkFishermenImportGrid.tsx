import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Fisherman } from '../types';
import { getGeneralGearType } from '../utils/gearUtils';
import { generateId } from '../utils/uuid';
import { standardizeText } from '../utils/textUtils';
import { 
  Plus, 
  Trash2, 
  Save, 
  Table as TableIcon,
  Eraser,
  CheckSquare,
  Square,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Anchor
} from 'lucide-react';

interface Props {
  onSave: (fishermen: Fisherman[]) => void;
  onCancel: () => void;
}

interface GridRow {
  id: string;
  selected: boolean;
  location: string;
  owner: string;
  vesselName: string;
  portoOrigem: string;
  gearType: string;
  redeLength: string;
  redeHeight: string;
  redeMesh: string;
  hookSize: string;
  hookCount: string;
  linhaLength: string;
  pescaSubmarina: string;
  cataManual: string;
  arrastoNetLength: string;
  arrastoMouthHeight: string;
  arrastoMesh: string;
  covos: string;
  manzuas: string;
  jequiCount: string;
  jequiBleedingMesh: string;
}

const FIELDS: (keyof GridRow)[] = [
  'location',
  'owner',
  'vesselName',
  'portoOrigem',
  'gearType',
  'redeLength',
  'redeHeight',
  'redeMesh',
  'hookSize',
  'hookCount',
  'linhaLength',
  'pescaSubmarina',
  'cataManual',
  'arrastoNetLength',
  'arrastoMouthHeight',
  'arrastoMesh',
  'covos',
  'manzuas',
  'jequiCount',
  'jequiBleedingMesh'
];

const FIELD_TRANSLATIONS: Record<string, string> = {
  location: 'Localidade',
  owner: 'Proprietário',
  vesselName: 'Nome da embarcação',
  portoOrigem: 'Porto de origem',
  gearType: 'Arte de pesca',
  redeLength: 'Rede de emalhe - Comp da rede (m)',
  redeHeight: 'Rede de emalhe - Alt. da rede (m)',
  redeMesh: 'Rede de emalhe - Tam. da malha (m)',
  hookSize: 'Linha de mão - Tam. do anzol',
  hookCount: 'Linha de mão - N° de anzol',
  linhaLength: 'Linha de mão - comp. da linha (m)',
  pescaSubmarina: 'Pesca submarina',
  cataManual: 'Cata manual',
  arrastoNetLength: 'Arrasto de fundo - Comp. da rede (m)',
  arrastoMouthHeight: 'Arrasto de fundo - Alt. da boca da rede (m)',
  arrastoMesh: 'Arrasto de fundo - Tam. da malha (mm)',
  covos: 'Covo - N° de covos',
  manzuas: 'Manzuá - N° de manzuás',
  jequiCount: 'Jequi - N° de jequis',
  jequiBleedingMesh: 'Jequi - Malha de sanga (mm)'
};

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
  const getDatalistId = (field: keyof GridRow): string | undefined => {
    if (field === 'location' || field === 'portoOrigem') {
      return 'location-options-fishermen-grid';
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
      fontStyle: 'normal' as const,
      fontWeight: (field === 'owner' ? 'bold' : 'normal') as string,
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
            className="p-0 border-b border-r border-slate-200 dark:border-slate-800"
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
              className={`w-full bg-transparent outline-none focus:bg-blue-100/70 dark:focus:bg-blue-950/30 focus:ring-inset focus:ring-2 focus:ring-blue-600 text-slate-800 dark:text-slate-100 ${
                field === 'owner' ? 'font-bold text-blue-700 dark:text-blue-400' : ''
              }`}
              style={getInputStyle(field)}
            />
          </td>
        );
      })}
    </tr>
  );
});

const BulkFishermenImportGrid: React.FC<Props> = ({ onSave, onCancel }) => {
  const [rows, setRows] = useState<GridRow[]>(() => Array(2000).fill(null).map(() => createEmptyRow()));
  const [numRowsToAdd, setNumRowsToAdd] = useState<number | ''>(10);
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number, field: keyof GridRow } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [zoom, setZoom] = useState<number>(100);

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
      location: '', 
      owner: '',
      vesselName: '',
      portoOrigem: '',
      gearType: '', 
      redeLength: '',
      redeHeight: '',
      redeMesh: '',
      hookSize: '',
      hookCount: '',
      linhaLength: '',
      pescaSubmarina: '',
      cataManual: '',
      arrastoNetLength: '',
      arrastoMouthHeight: '',
      arrastoMesh: '',
      covos: '',
      manzuas: '',
      jequiCount: '',
      jequiBleedingMesh: ''
    };
  }

  const updateRow = useCallback((id: string, field: keyof GridRow, value: any) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      
      const updatedRow = { ...next[idx], [field]: value };
      next[idx] = updatedRow;
      return next;
    });
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData || !focusedCell || isImporting) return;
    
    e.preventDefault();
    setIsImporting(true);

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

        const totalRowsNeeded = startRow + lines.length;
        while (nextRows.length < totalRowsNeeded) {
          nextRows.push(createEmptyRow());
        }

        for (let i = 0; i < lines.length; i++) {
          const targetRowIdx = startRow + i;
          const columns = lines[i].split('\t');
          
          const updatedRow = { ...nextRows[targetRowIdx] };
          
          for (let j = 0; j < columns.length; j++) {
            const targetFieldIdx = startFieldIndex + j;
            if (targetFieldIdx < FIELDS.length) {
              const field = FIELDS[targetFieldIdx];
              const val = columns[j].trim();
              (updatedRow as any)[field] = val;
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
    const validRows = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.owner.trim() && row.location.trim());
    if (validRows.length === 0) {
      alert("Erro: Preencha pelo menos o Proprietário e a Localidade.");
      return;
    }

    setIsSaving(true);
    const newFishermen: Fisherman[] = [];
    
    const CHUNK_SIZE = 40;
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);
      const processedChunk = chunk.map(({ row }) => {
        const gearDetails: any = {};

        // Normaliza valores: ignora placeholders de planilha ("-", "n/a", "sem", "--", etc.)
        const clean = (v: string | undefined): string => {
          const t = (v || '').trim();
          if (t === '' || /^[-–—]+$/.test(t) || /^n\/?a$/i.test(t) || /^sem$/i.test(t)) return '';
          return t;
        };

        // --- Rede de emalhe ---
        const redeLengthVal = clean(row.redeLength);
        if (redeLengthVal !== '') gearDetails.length = redeLengthVal;
        const redeHeightVal = clean(row.redeHeight);
        if (redeHeightVal !== '') gearDetails.height = redeHeightVal;
        const redeMeshVal = clean(row.redeMesh);
        if (redeMeshVal !== '') gearDetails.meshSize = redeMeshVal;
        // Preserva a coluna de rede especificamente para exportação fiel
        if (redeLengthVal !== '') gearDetails.redeLength = redeLengthVal;
        if (redeHeightVal !== '') gearDetails.redeHeight = redeHeightVal;
        if (redeMeshVal !== '') gearDetails.redeMesh = redeMeshVal;

        // --- Linha de mão ---
        const linhaLengthVal = clean(row.linhaLength);
        if (linhaLengthVal !== '') gearDetails.linhaLength = linhaLengthVal;
        const hookSizeVal = clean(row.hookSize);
        if (hookSizeVal !== '') gearDetails.hookSize = hookSizeVal;
        const hookCountVal = clean(row.hookCount);
        if (hookCountVal !== '') gearDetails.hookCount = hookCountVal;

        // --- Arrasto de fundo ---
        const arrastoNetVal = clean(row.arrastoNetLength);
        if (arrastoNetVal !== '') gearDetails.netLength = arrastoNetVal;
        const arrastoMouthVal = clean(row.arrastoMouthHeight);
        if (arrastoMouthVal !== '') gearDetails.mouthHeight = arrastoMouthVal;
        const arrastoMeshVal = clean(row.arrastoMesh);
        if (arrastoMeshVal !== '') gearDetails.trawlMeshSize = arrastoMeshVal;

        // --- Armadilhas / Covo / Manzuá ---
        const covosVal = clean(row.covos);
        if (covosVal !== '') gearDetails.covos = covosVal;
        const manzuasVal = clean(row.manzuas);
        if (manzuasVal !== '') gearDetails.manzuas = manzuasVal;

        // --- Jequi ---
        const jequiCountVal = clean(row.jequiCount);
        if (jequiCountVal !== '') gearDetails.trapCount = jequiCountVal;
        const jequiMeshVal = clean(row.jequiBleedingMesh);
        if (jequiMeshVal !== '') gearDetails.jequiBleedingMesh = jequiMeshVal;

        // --- Demais ---
        const cataManualVal = clean(row.cataManual);
        if (cataManualVal !== '') gearDetails.cataManual = cataManualVal;

        const gearType = row.gearType.trim() !== '' ? standardizeText(row.gearType) : 'Tarrafa';

        return {
          id: generateId(),
          name: standardizeText(row.owner),
          location: standardizeText(row.location),
          portoOrigem: row.portoOrigem.trim() !== '' ? standardizeText(row.portoOrigem) : undefined,
          vesselName: row.vesselName.trim() !== '' ? standardizeText(row.vesselName) : undefined,
          owner: standardizeText(row.owner),
          vesselType: '',
          propulsionType: '',
          gearType,
          gearTypeGeneral: getGeneralGearType(gearType),
          gearDetails,
          pescaSubmarina: row.pescaSubmarina.trim() !== '' ? row.pescaSubmarina.trim() : undefined
        };
      });
      newFishermen.push(...processedChunk);
      
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    setShowSuccess(true);
    setTimeout(() => onSave(newFishermen), 800);
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
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2">Pescadores processados com sucesso.</p>
        </div>
      )}

      <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50" style={{ height: '64px' }}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center p-0" style={{ width: '37px', height: '37px' }}>
            <Anchor size={17} style={{ width: '17px', height: '17px' }} />
          </div>
          <div><h2 className="font-bold text-slate-800 dark:text-slate-100" style={{ fontSize: '16px' }}>Entrada em Lote de Pescadores</h2></div>
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

      <datalist id="location-options-fishermen-grid">
        {['Arrombado', 'Barra Grande', 'Cajueiro da Praia', 'Canárias', 'Coqueiro', 'Luís Correia', 'Igaraçu', 'Ilha Grande', 'Macapá', 'Pedra do Sal'].map(loc => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
    </div>
  );
};

export default BulkFishermenImportGrid;