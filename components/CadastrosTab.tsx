import React, { useState, useMemo } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Fisherman, Species, isFishermanIncomplete, isSpeciesIncomplete } from '../types';
import { 
  Anchor, 
  Tag, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  User, 
  Image as ImageIcon, 
  Camera, 
  X, 
  Sparkles, 
  MapPin, 
  Info,
  Ship,
  Compass,
  FileDown,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import FishermanRegistrationForm from './FishermanRegistrationForm';
import { standardizeText, standardizeScientificName } from '../utils/textUtils';
import { isSupabaseConfigured, uploadSpeciesPhotoToSupabase } from '../utils/supabase';
import ImageEditorModal from './ImageEditorModal';
import { getOrGenerateWorldMapImage } from '../utils/mapGenerator';

interface Props {
  fishermen: Fisherman[];
  onAddFisherman: (fisherman: Fisherman) => void;
  onDeleteFisherman: (id: string) => void;
  onUpdateFisherman: (fisherman: Fisherman) => void;
  speciesList: Species[];
  onAddSpecies: (species: Species) => void;
  onDeleteSpecies: (id: string) => void;
}

const CadastrosTab: React.FC<Props> = ({
  fishermen,
  onAddFisherman,
  onDeleteFisherman,
  onUpdateFisherman,
  speciesList,
  onAddSpecies,
  onDeleteSpecies
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'fishermen' | 'species'>('fishermen');
  const [fishermanSearch, setFishermanSearch] = useState('');
  const [speciesSearch, setSpeciesSearch] = useState('');

  // Additional Fisherman Filters
  const [filterFishermanLocation, setFilterFishermanLocation] = useState('');
  const [filterFishermanGear, setFilterFishermanGear] = useState('');
  const [filterFishermanVessel, setFilterFishermanVessel] = useState('');

  // Additional Species Filters
  const [filterSpeciesPhoto, setFilterSpeciesPhoto] = useState<'all' | 'with' | 'without'>('all');
  const [sortSpeciesOrder, setSortSpeciesOrder] = useState<'az' | 'za' | 'newest'>('az');

  // Fisherman modal/form states
  const [isAddingFisherman, setIsAddingFisherman] = useState(false);
  const [editingFisherman, setEditingFisherman] = useState<Fisherman | null>(null);

  // Species modal/form states
  const [isAddingSpecies, setIsAddingSpecies] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<Species | null>(null);
  const [addSpeciesImages, setAddSpeciesImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Image Editor state
  const [editorImageSrc, setEditorImageSrc] = useState<string>('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Lightbox viewer states
  const [selectedSpeciesForView, setSelectedSpeciesForView] = useState<Species | null>(null);
  const [activeSpeciesPhotoIndex, setActiveSpeciesPhotoIndex] = useState<number>(0);

  const [isExportingFishermenPDF, setIsExportingFishermenPDF] = useState(false);
  const [isExportingSpeciesPDF, setIsExportingSpeciesPDF] = useState(false);
  const [speciesExportProgress, setSpeciesExportProgress] = useState<{
    stage: 'images' | 'worms' | 'pdf' | 'saving' | null;
    current: number;
    total: number;
    message: string;
  } | null>(null);

  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      if (!url) return resolve('');
      if (url.startsWith('data:')) return resolve(url);

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 300;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          } else {
            resolve('');
          }
        } catch (e) {
          console.error("Erro ao desenhar imagem no canvas para o PDF:", e);
          resolve('');
        }
      };
      img.onerror = () => {
        console.error("Erro ao carregar imagem para o PDF:", url);
        resolve(''); 
      };
    });
  };

  const handleExportFishermenPDF = () => {
    setIsExportingFishermenPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let pageNum = 1;
      
      const drawHeader = (pNum: number) => {
        doc.setFillColor(29, 78, 216); // blue-700
        doc.rect(0, 0, 210, 32, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('CADASTRO DE PESCADORES PARCEIROS', 15, 13);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Relatório de Pescadores Ativos, Embarcações e Artes de Pesca', 15, 19);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 15, 25);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`Página ${pNum}`, 180, 13);
      };

      const drawFooter = () => {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('Sistema G.D.P. - Gestor de Desembarque Pesqueiro • Relatório Gerencial', 15, 287);
      };

      drawHeader(pageNum);
      drawFooter();

      let currentY = 40;
      const pageHeight = 270;

      filteredFishermen.forEach((f, idx) => {
        const hasDetails = !!(
          f.gearDetails?.meshSize || 
          f.gearDetails?.hookCount || 
          f.gearDetails?.trapCount || 
          f.gearDetails?.length || 
          f.gearDetails?.height ||
          f.gearDetails?.jequiBleedingMesh ||
          f.gearDetails?.hookSize ||
          f.gearDetails?.netLength ||
          f.gearDetails?.mouthHeight ||
          f.gearDetails?.trawlMeshSize
        );
        const neededHeight = hasDetails ? 34 : 26;

        if (currentY + neededHeight > pageHeight) {
          doc.addPage();
          pageNum++;
          drawHeader(pageNum);
          drawFooter();
          currentY = 40;
        }

        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(15, currentY, 180, neededHeight, 3, 3, 'FD');

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.roundedRect(15, currentY, 180, neededHeight, 3, 3, 'D');

        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(18, currentY + 3.5, 8, 5, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(String(idx + 1).padStart(2, '0'), 20, currentY + 7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(f.name, 28, currentY + 7.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(`Localidade: ${f.location || 'Não Informada'}`, 18, currentY + 15);
        doc.text(`Embarcação: ${f.vesselType || 'Sem Embarcação (Desembarcado)'}`, 18, currentY + 20);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(29, 78, 216); // blue-700
        doc.text(`Arte de Pesca Preferencial: ${f.gearType}`, 18, currentY + 25);

        if (hasDetails) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139); // slate-500
          
          const details: string[] = [];
          const isTarrafa = f.gearType.toLowerCase() === 'tarrafa';
          const isJequi = f.gearType.toLowerCase() === 'jequi';

          if (f.gearDetails.meshSize) {
            details.push(`Malha: ${f.gearDetails.meshSize} ${isTarrafa ? 'cm' : 'mm'}`);
          }
          if (f.gearDetails.height) details.push(`Altura: ${f.gearDetails.height} m`);
          if (f.gearDetails.length) details.push(`Comprimento: ${f.gearDetails.length} m`);
          if (f.gearDetails.hookCount) details.push(`Anzóis: ${f.gearDetails.hookCount}`);
          if (f.gearDetails.trapCount) details.push(`Armadilhas: ${f.gearDetails.trapCount}`);
          
          if (f.gearDetails.jequiBleedingMesh) details.push(`Malha de sangra: ${f.gearDetails.jequiBleedingMesh} cm`);
          if (f.gearDetails.hookSize) details.push(`Tamanho do anzol: ${f.gearDetails.hookSize}`);
          if (f.gearDetails.netLength) details.push(`Comprimento da rede: ${f.gearDetails.netLength} m`);
          if (f.gearDetails.mouthHeight) details.push(`Altura da boca: ${f.gearDetails.mouthHeight} m`);
          if (f.gearDetails.trawlMeshSize) details.push(`Malha de arrasto: ${f.gearDetails.trawlMeshSize} mm`);
          
          doc.text(`Especificações: ${details.join(' | ')}`, 18, currentY + 30);
        }

        currentY += neededHeight + 4;
      });

      doc.save(`GDP_Relatorio_Pescadores_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF de pescadores:", err);
      alert("Não foi possível exportar o PDF dos pescadores.");
    } finally {
      setIsExportingFishermenPDF(false);
    }
  };

  const handleExportFishermenExcel = () => {
    if (filteredFishermen.length === 0) return;
    const rows = filteredFishermen.map((f, idx) => ({
      '#': idx + 1,
      'Nome': f.name || '-',
      'Localidade': f.location || '-',
      'Embarcação': f.vesselType || '-',
      'Tipo de Propulsão': f.propulsionType || '-',
      'Arte de Pesca': f.gearType || '-',
      'Categoria Geral': f.gearTypeGeneral || '-',
      'Tamanho da Malha': f.gearDetails?.meshSize || '-',
      'Altura (m)': f.gearDetails?.height !== undefined ? f.gearDetails.height : '-',
      'Comprimento (m)': f.gearDetails?.length !== undefined ? f.gearDetails.length : '-',
      'N° de Anzóis': f.gearDetails?.hookCount !== undefined ? f.gearDetails.hookCount : '-',
      'Tamanho do Anzol': f.gearDetails?.hookSize || '-',
      'N° de Armadilhas': f.gearDetails?.trapCount !== undefined ? f.gearDetails.trapCount : '-',
      'Malha de Sangra (cm)': f.gearDetails?.jequiBleedingMesh !== undefined ? f.gearDetails.jequiBleedingMesh : '-',
      'Comp. da Rede (m)': f.gearDetails?.netLength !== undefined ? f.gearDetails.netLength : '-',
      'Altura da Boca (m)': f.gearDetails?.mouthHeight !== undefined ? f.gearDetails.mouthHeight : '-',
      'Malha de Arrasto (mm)': f.gearDetails?.trawlMeshSize || '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pescadores');
    XLSX.writeFile(workbook, `GDP_Pescadores_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const loadImgWithDimensions = (url: string): Promise<{ base64: string, width: number, height: number } | null> => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      if (url.startsWith('data:')) {
        const img = new Image();
        img.onload = () => {
          resolve({ base64: url, width: img.naturalWidth || 300, height: img.naturalHeight || 300 });
        };
        img.onerror = () => resolve(null);
        img.src = url;
        return;
      }

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 600;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            resolve({ base64: dataUrl, width: img.naturalWidth || w, height: img.naturalHeight || h });
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error("Erro ao desenhar imagem no canvas:", e);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.error("Erro ao carregar imagem para o PDF:", url);
        resolve(null);
      };
    });
  };

  const fetchWikipediaImage = async (name: string): Promise<string | null> => {
    if (!name || name.trim() === '') return null;
    try {
      const cleanName = name.trim();
      const ptUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(ptUrl, { signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnail && data.thumbnail.source) {
          return data.thumbnail.source;
        }
      }
    } catch (e) {
      console.warn(`Erro ao buscar imagem no pt-wikipedia para ${name}:`, e);
    }
    try {
      const cleanName = name.trim();
      const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(enUrl, { signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnail && data.thumbnail.source) {
          return data.thumbnail.source;
        }
      }
    } catch (e) {
      console.warn(`Erro ao buscar imagem no en-wikipedia para ${name}:`, e);
    }
    return null;
  };

  const fetchWormsDataForSpecies = async (scientificName: string): Promise<{
    family?: string;
    order?: string;
    class?: string;
    phylum?: string;
    kingdom?: string;
    genus?: string;
    synonyms: string[];
    aphiaId?: number;
  }> => {
    const result: {
      family?: string;
      order?: string;
      class?: string;
      phylum?: string;
      kingdom?: string;
      genus?: string;
      synonyms: string[];
      aphiaId?: number;
    } = { synonyms: [] };
    if (!scientificName || scientificName.toLowerCase().includes('não informado') || scientificName.toLowerCase().trim() === '') {
      return result;
    }

    try {
      const cleanName = scientificName.trim();
      const searchUrl = `https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(cleanName)}?like=false&marine_only=true`;
      
      const controller1 = new AbortController();
      const t1 = setTimeout(() => controller1.abort(), 8000); // Expanded timeout to 8 seconds
      const res = await fetch(searchUrl, { signal: controller1.signal });
      clearTimeout(t1);

      if (!res.ok || res.status === 204) {
        return result;
      }
      
      const records = await res.json();
      if (!Array.isArray(records) || records.length === 0) {
        return result;
      }
      
      const record = records[0];
      result.family = record.family || undefined;
      result.order = record.order || undefined;
      result.class = record.class || undefined;
      result.phylum = record.phylum || undefined;
      result.kingdom = record.kingdom || undefined;
      result.genus = record.genus || undefined;
      result.aphiaId = record.AphiaID || undefined;

      const aphiaId = record.AphiaID;
      if (aphiaId) {
        const synUrl = `https://www.marinespecies.org/rest/AphiaSynonymsByAphiaID/${aphiaId}`;
        const controller2 = new AbortController();
        const t2 = setTimeout(() => controller2.abort(), 8000); // Expanded timeout to 8 seconds
        const synRes = await fetch(synUrl, { signal: controller2.signal });
        clearTimeout(t2);

        if (synRes.ok && synRes.status !== 204) {
          const synData = await synRes.json();
          if (Array.isArray(synData)) {
            result.synonyms = synData.map((s: any) => s.scientificname).filter(Boolean);
          }
        }
      }
    } catch (err) {
      console.warn("Aviso ao carregar dados do WoRMS para a espécie " + scientificName + ":", err);
    }
    return result;
  };

  const handleExportSpeciesPDF = async () => {
    if (filteredSpeciesList.length === 0) {
      alert("Nenhuma espécie localizada para exportação no catálogo atual.");
      return;
    }

    setIsExportingSpeciesPDF(true);
    setSpeciesExportProgress({
      stage: 'images',
      current: 0,
      total: filteredSpeciesList.length,
      message: 'Iniciando processamento paralelo...'
    });

    // Start fetching the template PDF in parallel right away to optimize download speed!
    const templateFetchPromise = fetch('/1500%20(4).pdf')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Erro status template: ${res.status}`);
        return await res.arrayBuffer();
      })
      .catch((err) => {
        console.warn("Background template load failed:", err);
        return null;
      });

    try {
      setSpeciesExportProgress({
        stage: 'images',
        current: 0,
        total: filteredSpeciesList.length,
        message: 'Carregando recursos e dados das espécies...'
      });

      const templateBuffer = await templateFetchPromise;

      // Create jsPDF instance in LANDSCAPE (297 x 210)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Helper function to draw standard dynamic page footer
      const drawDynamicPageFooter = (pageNo: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(7, 22, 45); // #07162d
        doc.text('Créditos das bases de dados: WoRMS / Wikipedia / IUCN / FishBase', 15, 202);
        doc.text(`Página ${pageNo}`, 282, 202, { align: 'right' });
      };

      // Helper function to draw a card with a soft gray shadow and white background (avoiding black frames)
      const drawSoftShadowCard = (x: number, y: number, w: number, h: number) => {
        doc.setLineWidth(0.1);
        
        // Shadow layer 3 (faint, deep)
        doc.setFillColor(242, 244, 247);
        doc.setDrawColor(242, 244, 247);
        doc.roundedRect(x + 0.8, y + 0.8, w, h, 4, 4, 'FD');

        // Shadow layer 2 (medium)
        doc.setFillColor(244, 246, 249);
        doc.setDrawColor(244, 246, 249);
        doc.roundedRect(x + 0.5, y + 0.5, w, h, 4, 4, 'FD');

        // Shadow layer 1 (close, light shadow)
        doc.setFillColor(247, 249, 251);
        doc.setDrawColor(247, 249, 251);
        doc.roundedRect(x + 0.2, y + 0.2, w, h, 4, 4, 'FD');

        // Crisp white card top layer
        doc.setFillColor(255, 255, 255);
        // Soft border of light slate gray (#e2e8f0)
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, w, h, 4, 4, 'FD');
      };

      // 1 & 2. Fetch images, WoRMS taxonomy and GBIF maps for all species in parallel!
      const resolvedImagesMap: Record<string, { base64: string; width: number; height: number }> = {};
      const resolvedMapsMap: Record<string, string> = {};
      const wormsDataMap: Record<string, {
        family?: string;
        order?: string;
        class?: string;
        phylum?: string;
        kingdom?: string;
        genus?: string;
        synonyms: string[];
        aphiaId?: number;
      }> = {};

      let completedCount = 0;
      const totalSpecies = filteredSpeciesList.length;

      const fetchSingleSpeciesData = async (s: Species) => {
        // Fetch image in parallel
        const imagePromise = (async () => {
          let imgUrl: string | null = null;
          if (s.images && s.images.length > 0) {
            imgUrl = s.images[0];
          } else {
            const term = s.scientificName || s.commonName;
            if (term && term !== 'Não informado') {
              imgUrl = await fetchWikipediaImage(term);
            }
          }
          if (imgUrl) {
            try {
              const imgResult = await loadImgWithDimensions(imgUrl);
              if (imgResult) {
                resolvedImagesMap[s.id] = imgResult;
              }
            } catch (e) {
              console.error(`Erro ao carregar imagem para a espécie ${s.commonName}:`, e);
            }
          }
        })();

        // Fetch WoRMS in parallel
        const wormsPromise = (async () => {
          wormsDataMap[s.id] = { synonyms: [] };
          let termToSearch = s.scientificName;
          const hasNoScientificName = !s.scientificName || s.scientificName.trim() === '' || s.scientificName.trim() === 'Não informado';
          
          if (hasNoScientificName && s.commonName) {
            try {
              const vernSearchUrl = `https://www.marinespecies.org/rest/AphiaRecordsByVernacular/${encodeURIComponent(s.commonName.trim())}?like=true`;
              const controller = new AbortController();
              const t = setTimeout(() => controller.abort(), 4000); // Fast timeout
              const res = await fetch(vernSearchUrl, { signal: controller.signal });
              clearTimeout(t);
              if (res.ok && res.status !== 204) {
                const records = await res.json();
                if (Array.isArray(records) && records.length > 0) {
                  const matchedRecord = records[0];
                  if (matchedRecord && matchedRecord.scientificname) {
                    termToSearch = matchedRecord.scientificname;
                  }
                }
              }
            } catch (err) {
              console.warn(`Erro ao buscar nome científico por nome popular para ${s.commonName}:`, err);
            }
          }

          if (termToSearch && termToSearch.trim() !== '') {
            try {
              const data = await fetchWormsDataForSpecies(termToSearch);
              wormsDataMap[s.id] = data;

              // Fill in structural missing fields and links
              const genus = termToSearch.split(' ')[0] || '';
              const speciesWord = termToSearch.split(' ')[1] || '';

              const updatedSpecies = {
                ...s,
                scientificName: s.scientificName && s.scientificName !== 'Não informado' && s.scientificName !== '' ? s.scientificName : (termToSearch || ''),
                family: s.family && s.family !== 'Não informado' && s.family !== '' ? s.family : (data.family || ''),
                order: s.order && s.order !== 'Não informado' && s.order !== '' ? s.order : (data.order || ''),
                group: s.group && s.group !== 'Não informado' && s.group !== '' ? s.group : (data.class || ''),
                conservationUrl: s.conservationUrl && s.conservationUrl.trim() !== '' ? s.conservationUrl : `https://www.iucnredlist.org/search?query=${encodeURIComponent(termToSearch)}`,
                seeMoreUrl: s.seeMoreUrl && s.seeMoreUrl.trim() !== '' ? s.seeMoreUrl : (genus && speciesWord ? `https://www.fishbase.se/summary/${encodeURIComponent(genus)}-${encodeURIComponent(speciesWord)}.html` : 'https://www.fishbase.se/search.php')
              };

              // Save back to the state and persistent database
              if (
                updatedSpecies.scientificName !== s.scientificName ||
                updatedSpecies.family !== s.family ||
                updatedSpecies.order !== s.order ||
                updatedSpecies.group !== s.group ||
                updatedSpecies.conservationUrl !== s.conservationUrl ||
                updatedSpecies.seeMoreUrl !== s.seeMoreUrl
              ) {
                onAddSpecies(updatedSpecies);
              }
            } catch (err) {
              console.warn(`Erro ao integrar dados da WoRMS para ${s.scientificName}:`, err);
            }
          }
        })();

        // Fetch GBIF occurrences map in parallel using centralized IndexedDB-cached generator
        const gbifMapPromise = (async () => {
          try {
            const scientificName = s.scientificName || s.commonName;
            if (scientificName && scientificName !== 'Não informado' && scientificName.trim() !== '') {
              const pngBase64 = await getOrGenerateWorldMapImage(scientificName);
              if (pngBase64) {
                resolvedMapsMap[s.id] = pngBase64;
              }
            }
          } catch (err) {
            console.error(`Erro ao gerar mapa offscreen para ${s.commonName || s.scientificName}:`, err);
          }
        })();

        // Execute all concurrently for this species
        await Promise.all([imagePromise, wormsPromise, gbifMapPromise]);

        completedCount++;
        setSpeciesExportProgress({
          stage: 'worms',
          current: completedCount,
          total: totalSpecies,
          message: `Otimizado: Buscando dados e imagens para ${s.commonName || s.scientificName} (${completedCount}/${totalSpecies})...`
        });
      };

      // Fetch species data in small batches to avoid GBIF and WoRMS API rate limits and network congestion
      const batchSize = 4;
      for (let i = 0; i < filteredSpeciesList.length; i += batchSize) {
        const batch = filteredSpeciesList.slice(i, i + batchSize);
        await Promise.all(batch.map(s => fetchSingleSpeciesData(s)));
      }

      // 3. Group and organize species by family (using local value, fallback to WoRMS, fallback to 'Sem Família')
      setSpeciesExportProgress({
        stage: 'pdf',
        current: 0,
        total: 100,
        message: 'Agrupando espécies e gerando o layout do catálogo em PDF...'
      });

      const grouped: Record<string, { species: Species; worms: any }[]> = {};
      filteredSpeciesList.forEach((s) => {
        const worms = wormsDataMap[s.id] || { synonyms: [] };
        
        const termToSearch = s.scientificName || '';
        const genus = termToSearch.split(' ')[0] || '';
        const speciesWord = termToSearch.split(' ')[1] || '';

        // Form updated species object for direct PDF rendering
        const finalSpeciesObj: Species = {
          ...s,
          scientificName: s.scientificName && s.scientificName !== 'Não informado' && s.scientificName !== '' ? s.scientificName : (termToSearch || ''),
          family: s.family && s.family !== 'Não informado' && s.family !== '' ? s.family : (worms.family || ''),
          order: s.order && s.order !== 'Não informado' && s.order !== '' ? s.order : (worms.order || ''),
          group: s.group && s.group !== 'Não informado' && s.group !== '' ? s.group : (worms.class || ''),
          conservationUrl: s.conservationUrl && s.conservationUrl.trim() !== '' ? s.conservationUrl : (termToSearch ? `https://www.iucnredlist.org/search?query=${encodeURIComponent(termToSearch)}` : ''),
          seeMoreUrl: s.seeMoreUrl && s.seeMoreUrl.trim() !== '' ? s.seeMoreUrl : (genus && speciesWord ? `https://www.fishbase.se/summary/${encodeURIComponent(genus)}-${encodeURIComponent(speciesWord)}.html` : (termToSearch ? 'https://www.fishbase.se/search.php' : ''))
        };

        const rawFam = finalSpeciesObj.family || 'Sem Família';
        const familyName = (rawFam.trim() !== '' && rawFam.trim() !== 'Não informado') ? rawFam.trim() : 'Sem Família';

        if (!grouped[familyName]) {
          grouped[familyName] = [];
        }
        grouped[familyName].push({ species: finalSpeciesObj, worms });
      });

      const sortedFamilies = Object.keys(grouped).sort((a, b) => {
        if (a === 'Sem Família') return 1;
        if (b === 'Sem Família') return -1;
        return a.localeCompare(b);
      });

      // 4. Generate the pages (Page 3 for separators, Page 4 for catalog detail cards)
      let isFirstPage = true;
      let currentPageNum = 3; // Starting from 3 because Cover is Page 1 and Credits is Page 2

      for (let fIdx = 0; fIdx < sortedFamilies.length; fIdx++) {
        const familyName = sortedFamilies[fIdx];
        
        setSpeciesExportProgress({
          stage: 'pdf',
          current: Math.round((fIdx / sortedFamilies.length) * 100),
          total: 100,
          message: `Desenhando páginas para a Família: ${familyName}...`
        });

        // --- PAGE 3: FAMILY COVER ---
        if (isFirstPage) {
          isFirstPage = false;
        } else {
          doc.addPage('a4', 'landscape');
        }

        // Background color #f5f8fc
        doc.setFillColor(245, 248, 252);
        doc.rect(0, 0, 297, 210, 'F');

        // Center aligned Family Name in #07162d
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(36);
        doc.setTextColor(7, 22, 45); // #07162d
        doc.text(familyName, 148.5, 105, { align: 'center' });

        // Draw Footer with Credits and dynamic Page number
        drawDynamicPageFooter(currentPageNum);
        currentPageNum++;

        // --- PAGE 4: SPECIES CATALOG CARD DETAIL ---
        const familySpecies = grouped[familyName];
        for (const item of familySpecies) {
          const s = item.species;
          const worms = item.worms;

          doc.addPage('a4', 'landscape');

          // Fundo da página na cor #f5f8fc
          doc.setFillColor(245, 248, 252);
          doc.rect(0, 0, 297, 210, 'F');

          // Header / Top bar in color #07162d
          doc.setFillColor(7, 22, 45); // #07162d
          doc.rect(0, 0, 297, 20, 'F');

          // Center aligned Family Name of size 16 in color #a4d4e8
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(164, 212, 232); // #a4d4e8
          doc.text(familyName.toUpperCase(), 148.5, 13.5, { align: 'center' });

          // Emitido em xx/xx/xx às xxhrs on the right of the header
          const now = new Date();
          const dateStr = now.toLocaleDateString('pt-BR');
          const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(164, 212, 232); // #a4d4e8
          doc.text(`Emitido em ${dateStr} às ${timeStr}hrs`, 282, 13.5, { align: 'right' });

          // -----------------------------------------------------------------
          // LEFT COLUMN
          // -----------------------------------------------------------------
          
          // BOX 1: Photo Box (Left Top) - Height 58
          drawSoftShadowCard(15, 26, 129, 58);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(7, 22, 45); // #07162d
          doc.text('FOTOGRAFIA DA ESPÉCIE', 22, 33);

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(22, 35, 137, 35);

          const imgData = resolvedImagesMap[s.id];
          if (imgData && imgData.base64) {
            try {
              const maxW = 121;
              const maxH = 43;
              const imgRatio = imgData.width / imgData.height;
              let w = maxW;
              let h = maxW / imgRatio;
              if (h > maxH) {
                h = maxH;
                w = maxH * imgRatio;
              }
              const imgX = 15 + (129 - w) / 2;
              const imgY = 37 + (45 - h) / 2;
              doc.addImage(imgData.base64, 'JPEG', imgX, imgY, w, h);
            } catch (imgErr) {
              console.error("Erro ao desenhar imagem no PDF:", imgErr);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(148, 163, 184);
              doc.text('Erro ao carregar imagem', 79.5, 54, { align: 'center' });
            }
          } else {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('Foto não cadastrada', 79.5, 52, { align: 'center' });
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.text('(Lugar onde ficará a foto da espécie, se não houver usar do Wikipédia)', 79.5, 58, { align: 'center' });
          }

          // BOX 2: Synonyms Box (Left Middle) - Height 48
          drawSoftShadowCard(15, 90, 129, 48);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(7, 22, 45); // #07162d
          doc.text('SINÔNIMOS REGISTRADOS (WoRMS)', 22, 97);

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(22, 99, 137, 99);

          const synList = worms.synonyms || [];
          if (synList.length === 0) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Nenhum sinônimo registrado ou encontrado no WoRMS.', 22, 107);
          } else {
            doc.setFontSize(8);
            const displaySyns = synList.slice(0, 8);
            displaySyns.forEach((syn: string, idx: number) => {
              const isCol2 = idx >= 4;
              const xPos = isCol2 ? 80 : 22;
              const yOffset = 105 + (idx % 4) * 7.2; // Compact synonym line spacing as requested
              
              // Bullet in Orange (#FF8A00) as requested
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 138, 0); // #FF8A00
              doc.text('•', xPos, yOffset);
              
              // Synonym name in italic
              doc.setFont('helvetica', 'italic');
              doc.setTextColor(51, 65, 85);
              const truncatedSyn = doc.getTextWidth(syn) > 52 ? syn.substring(0, 24) + '...' : syn;
              doc.text(truncatedSyn, xPos + 4, yOffset);
            });
            if (synList.length > 8) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(100, 116, 139);
              doc.text(`+ ${synList.length - 8} outros sinônimos no WoRMS`, 22, 134);
            }
          }

          // BOX 3: Taxonomic Hierarchy Box (Left Bottom) - Height 48
          drawSoftShadowCard(15, 144, 129, 48);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(7, 22, 45); // #07162d
          doc.text('HIERARQUIA TAXONÔMICA (WoRMS)', 22, 151);

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(22, 153, 137, 153);

          const resolvedKingdom = worms.kingdom || 'Animalia';
          const resolvedPhylum = worms.phylum || 'Chordata';
          const resolvedClass = worms.class || s.group || 'Actinopterygii';
          const resolvedOrder = worms.order || s.order || 'Não informado';
          const resolvedFamily = worms.family || s.family || 'Não informado';
          const resolvedGenus = worms.genus || (s.scientificName ? s.scientificName.split(' ')[0] : 'Não informado');
          const resolvedSpecies = s.scientificName || 'Não informado';

          const taxonsCol1 = [
            { label: 'Reino', val: resolvedKingdom },
            { label: 'Filo', val: resolvedPhylum },
            { label: 'Classe', val: resolvedClass },
            { label: 'Ordem', val: resolvedOrder }
          ];
          const taxonsCol2 = [
            { label: 'Família', val: resolvedFamily },
            { label: 'Gênero', val: resolvedGenus },
            { label: 'Espécie', val: resolvedSpecies, italic: true }
          ];

          doc.setFontSize(8);
          taxonsCol1.forEach((t, index) => {
            const yOffset = 160 + index * 7.5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(t.label + ':', 22, yOffset);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(7, 22, 45);
            doc.text(t.val, 38, yOffset);
          });

          taxonsCol2.forEach((t, index) => {
            const yOffset = 160 + index * 7.5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(t.label + ':', 80, yOffset);

            doc.setFont('helvetica', t.italic ? 'bold italic' : 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(7, 22, 45);
            doc.text(t.val, 96, yOffset);
          });

          // -----------------------------------------------------------------
          // RIGHT COLUMN
          // -----------------------------------------------------------------

          // BOX 1: Informações da Espécie (Right Top) - Height 42
          drawSoftShadowCard(152, 26, 130, 42);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(7, 22, 45); // #07162d
          doc.text('INFORMAÇÕES DA ESPÉCIE', 159, 33);

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(159, 35, 275, 35);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text('Nome Popular:', 159, 41);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(7, 22, 45);
          doc.text(s.commonName || 'Sem nome popular', 190, 41);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text('Científico:', 159, 47);

          doc.setFont('helvetica', 'bold italic');
          doc.setFontSize(10);
          doc.setTextColor(7, 22, 45);
          doc.text(s.scientificName || 'Não informado', 190, 47);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text('AphiaID / LSID:', 159, 53);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(7, 22, 45);
          doc.text(`${worms.aphiaId || 'N/A'} / urn:lsid:marinespecies.org:taxname:${worms.aphiaId || ''}`, 190, 53);

          // Brief description / Ecological Summary text
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          const descText = s.group || 'Ficha de monitoramento e taxonomia registrada na base de dados de desembarques.';
          const truncatedDesc = descText.length > 140 ? descText.substring(0, 137) + '...' : descText;
          doc.text(`Resumo do Táxon: ${truncatedDesc}`, 159, 59, { maxWidth: 116 });

          // BOX 2: Mapa de Ocorrências (Right Middle) - Height 66
          drawSoftShadowCard(152, 74, 130, 66);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(7, 22, 45); // #07162d
          doc.text('MAPA DE DISTRIBUIÇÃO GEOGRÁFICA', 159, 81);

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(159, 83, 275, 83);

          // Draw Cartographic Stylized Map of the Piauí Coastline
          const mapX = 159;
          const mapY = 86;
          const mapW = 116;
          const mapH = 50;

          // Draw the dynamically generated real occurrence map from GBIF/IBGE
          const mapBase64 = resolvedMapsMap[s.id];
          if (mapBase64) {
            try {
              doc.addImage(mapBase64, 'PNG', mapX, mapY, mapW, mapH);
            } catch (imgErr) {
              console.error("Erro ao desenhar o mapa no PDF:", imgErr);
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(148, 163, 184);
              doc.text('Erro ao processar imagem do mapa', mapX + mapW/2, mapY + mapH/2, { align: 'center' });
            }
          } else {
            doc.setFillColor(248, 250, 252);
            doc.rect(mapX, mapY, mapW, mapH, 'F');
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('Mapa não disponível para esta espécie', mapX + mapW/2, mapY + mapH/2, { align: 'center' });
          }

          // Map Outer Border Frame
          doc.setDrawColor(203, 213, 225); // #cbd5e1 soft slate-300
          doc.setLineWidth(0.35);
          doc.rect(mapX, mapY, mapW, mapH, 'D');

          // BOX 3: Referências e Portais (Right Bottom) - Height 48
          drawSoftShadowCard(152, 146, 130, 48);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(7, 22, 45); // #07162d
          doc.text('REFERÊNCIAS E PORTAIS DE CONSERVAÇÃO', 159, 153);

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(159, 155, 275, 155);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          doc.text('• WoRMS: Registro oficial internacional sob o AphiaID informado.', 159, 161);
          doc.text('• IBGE: Limites territoriais estuarinos e zoneamento biofísico oficial.', 159, 165);
          doc.text('• GBIF: Amostragem e registros globais de ocorrências catalogadas.', 159, 169);

          // Render the two custom banners (IUCN and FishBase) side-by-side
          // Banner 1: IUCN Red List
          const iucnY = 173;
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.3);
          doc.roundedRect(159, iucnY, 56, 16, 1, 1, 'FD');
          
          // Red left stripe
          doc.setFillColor(239, 68, 68); // #ef4444 red
          doc.rect(159, iucnY, 2.2, 16, 'F');
          
          // IUCN Text
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(220, 38, 38); // red title
          doc.text('IUCN Red List', 163.5, iucnY + 4.5);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text('Status de Conservação', 163.5, iucnY + 8.5);
          
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(4.5);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text('Clique para acessar ficha', 163.5, iucnY + 12.5);
          
          if (s.conservationUrl) {
            doc.link(159, iucnY, 56, 16, { url: s.conservationUrl });
          }

          // Banner 2: FishBase
          const fishX = 219;
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(226, 232, 240); // slate-200
          doc.setLineWidth(0.3);
          doc.roundedRect(fishX, iucnY, 56, 16, 1, 1, 'FD');
          
          // Blue left stripe
          doc.setFillColor(2, 82, 156); // FishBase Blue
          doc.rect(fishX, iucnY, 2.2, 16, 'F');
          
          // FishBase Text
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(2, 82, 156); // blue title
          doc.text('Portal FishBase', fishX + 4.5, iucnY + 4.5);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text('Biologia & Distribuição', fishX + 4.5, iucnY + 8.5);
          
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(4.5);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text('Clique para acessar portal', fishX + 4.5, iucnY + 12.5);
          
          if (s.seeMoreUrl) {
            doc.link(fishX, iucnY, 56, 16, { url: s.seeMoreUrl });
          }

          // Draw Footer on detail page
          drawDynamicPageFooter(currentPageNum);
          currentPageNum++;
        }
      }

      // 5. Try merging the cover pages from '/1500 (4).pdf' template in public path
      setSpeciesExportProgress({
        stage: 'pdf',
        current: 90,
        total: 100,
        message: 'Mesclando as páginas de capa...'
      });

      let finalPdfBytes: Uint8Array;
      try {
        const templateArrayBuffer = await templateFetchPromise;
        if (!templateArrayBuffer) {
          throw new Error('Template array buffer was not pre-fetched successfully.');
        }
        const templateDoc = await PDFDocument.load(templateArrayBuffer);
        
        // Load the generated catalog document bytes
        const jspdfBytes = doc.output('arraybuffer');
        const generatedDoc = await PDFDocument.load(jspdfBytes);
        
        // Merge cover/credits from template and remaining pages from our generatedDoc
        const finalDoc = await PDFDocument.create();
        
        const [coverPage, creditsPage] = await finalDoc.copyPages(templateDoc, [0, 1]);
        finalDoc.addPage(coverPage);
        finalDoc.addPage(creditsPage);
        
        const dynamicPages = await finalDoc.copyPages(generatedDoc, generatedDoc.getPageIndices());
        dynamicPages.forEach((p) => finalDoc.addPage(p));
        
        finalPdfBytes = await finalDoc.save();
      } catch (mergeErr) {
        console.warn("Não foi possível carregar o template PDF local para mesclagem das páginas de capa. Baixando apenas as páginas do catálogo de espécies. Erro:", mergeErr);
        // Fallback to pure generated catalog pages (jsPDF) if template PDF is not found or loaded
        finalPdfBytes = new Uint8Array(doc.output('arraybuffer'));
      }

      setSpeciesExportProgress({
        stage: 'saving',
        current: 100,
        total: 100,
        message: 'Download iniciado! Salvando o arquivo...'
      });

      // 6. Trigger download
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `GDP_Catalogo_Especies_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.deletePage(1); // Clean memory if needed
      downloadLink.click();
    } catch (err) {
      console.error("Erro ao gerar PDF de espécies:", err);
      alert("Não foi possível exportar o PDF das espécies.");
    } finally {
      setIsExportingSpeciesPDF(false);
      setSpeciesExportProgress(null);
    }
  };

  // Compute lists of unique fishermen specs for filter dropdown options
  const locations = useMemo(() => {
    const locSet = new Set<string>();
    fishermen.forEach(f => { if (f.location) locSet.add(f.location.trim()); });
    return Array.from(locSet).sort();
  }, [fishermen]);

  const gearTypes = useMemo(() => {
    const gSet = new Set<string>();
    fishermen.forEach(f => { if (f.gearType) gSet.add(f.gearType.trim()); });
    return Array.from(gSet).sort();
  }, [fishermen]);

  const vesselTypes = useMemo(() => {
    const vSet = new Set<string>();
    fishermen.forEach(f => { if (f.vesselType) vSet.add(f.vesselType.trim()); });
    return Array.from(vSet).sort();
  }, [fishermen]);

  // Filter systems
  const filteredFishermen = useMemo(() => {
    return fishermen.filter(f => {
      const q = fishermanSearch.toLowerCase();
      const matchesSearch = !fishermanSearch || (
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        (f.vesselType && f.vesselType.toLowerCase().includes(q)) ||
        f.gearType.toLowerCase().includes(q)
      );

      const matchesLocation = !filterFishermanLocation || f.location === filterFishermanLocation;
      const matchesGear = !filterFishermanGear || f.gearType === filterFishermanGear;
      const matchesVessel = !filterFishermanVessel || f.vesselType === filterFishermanVessel;

      return matchesSearch && matchesLocation && matchesGear && matchesVessel;
    });
  }, [fishermen, fishermanSearch, filterFishermanLocation, filterFishermanGear, filterFishermanVessel]);

  const filteredSpeciesList = useMemo(() => {
    let list = speciesList.filter(s => {
      const q = speciesSearch.toLowerCase();
      const matchesSearch = !speciesSearch || (
        s.commonName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q)
      );

      const hasPhotos = s.images && s.images.length > 0;
      const matchesPhoto = filterSpeciesPhoto === 'all' || 
        (filterSpeciesPhoto === 'with' && hasPhotos) || 
        (filterSpeciesPhoto === 'without' && !hasPhotos);

      return matchesSearch && matchesPhoto;
    });

    if (sortSpeciesOrder === 'az') {
      list.sort((a, b) => a.commonName.localeCompare(b.commonName));
    } else if (sortSpeciesOrder === 'za') {
      list.sort((a, b) => b.commonName.localeCompare(a.commonName));
    } else if (sortSpeciesOrder === 'newest') {
      list.sort((a, b) => b.id.localeCompare(a.id));
    }

    return list;
  }, [speciesList, speciesSearch, filterSpeciesPhoto, sortSpeciesOrder]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSpeciesPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const file = e.target.files[0];
        const b64 = await convertToBase64(file);
        setEditorImageSrc(b64);
        setIsEditorOpen(true);
        // Reset file input value so selecting the same file again triggers change event
        e.target.value = '';
      } catch (err) {
        console.error("Erro ao converter imagem pra base64:", err);
      }
    }
  };

  const handleSpeciesSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const comName = standardizeText((formData.get('comName') as string) || '');
    const sciName = (formData.get('sciName') as string)?.trim()
      ? standardizeScientificName(formData.get('sciName') as string)
      : '';

    if (!comName) {
      alert("Por favor, preencha o nome popular.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const specId = editingSpecies ? editingSpecies.id : 'spec-' + Date.now();
    const finalUrls: string[] = editingSpecies ? [...(editingSpecies.images || [])] : [];

    try {
      // Upload new images
      for (const b64 of addSpeciesImages) {
        if (isSupabaseConfigured) {
          try {
            const url = await uploadSpeciesPhotoToSupabase(specId, b64);
            finalUrls.push(url);
          } catch (err) {
            console.error("Supabase Storage falhou, mantendo base64:", err);
            finalUrls.push(b64);
          }
        } else {
          finalUrls.push(b64);
        }
      }

      onAddSpecies({
        id: specId,
        commonName: comName,
        scientificName: sciName,
        images: finalUrls,
        family: ((formData.get('family') as string) || '').trim(),
        order: ((formData.get('order') as string) || '').trim(),
        group: ((formData.get('group') as string) || '').trim(),
        conservationUrl: ((formData.get('conservationUrl') as string) || '').trim(),
        seeMoreUrl: ((formData.get('seeMoreUrl') as string) || '').trim()
      });

      setIsAddingSpecies(false);
      setEditingSpecies(null);
      setAddSpeciesImages([]);
    } catch (err) {
      setUploadError("Não foi possível salvar a espécie.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSpeciesClick = (s: Species) => {
    setEditingSpecies(s);
    setAddSpeciesImages([]);
  };

  const handleUpdateExistingSpecies = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSpecies) return;

    const formData = new FormData(e.currentTarget);
    const comName = standardizeText((formData.get('editComName') as string) || '');
    const sciName = (formData.get('editSciName') as string)?.trim()
      ? standardizeScientificName(formData.get('editSciName') as string)
      : '';

    if (!comName) {
      alert("O nome popular é obrigatório.");
      return;
    }

    setIsUploading(true);
    const finalUrls = [...(editingSpecies.images || [])];

    try {
      for (const b64 of addSpeciesImages) {
        if (isSupabaseConfigured) {
          try {
            const url = await uploadSpeciesPhotoToSupabase(editingSpecies.id, b64);
            finalUrls.push(url);
          } catch (err) {
            finalUrls.push(b64);
          }
        } else {
          finalUrls.push(b64);
        }
      }

      onAddSpecies({
        ...editingSpecies,
        commonName: comName,
        scientificName: sciName,
        images: finalUrls,
        family: ((formData.get('editFamily') as string) || '').trim(),
        order: ((formData.get('editOrder') as string) || '').trim(),
        group: ((formData.get('editGroup') as string) || '').trim(),
        conservationUrl: ((formData.get('editConservationUrl') as string) || '').trim(),
        seeMoreUrl: ((formData.get('editSeeMoreUrl') as string) || '').trim()
      });

      setEditingSpecies(null);
      setAddSpeciesImages([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-10 pointer-events-none">
          <Anchor size={220} className="stroke-[1.5]" />
        </div>
        <div className="space-y-2 relative z-10 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Painel de Cadastros</h2>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
            Centralize e gerencie os registros e bases de pescadores locais e espécies de peixes. As informações inseridas aqui servirão para preenchimento rápido e inteligente das fichas de desembarque.
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 self-start mt-6 max-w-md w-full sm:w-80">
          <button
            type="button"
            onClick={() => { setActiveSubTab('fishermen'); setEditingFisherman(null); setIsAddingFisherman(false); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all font-bold text-xs select-none w-1/2 justify-center ${
              activeSubTab === 'fishermen' 
                ? 'bg-white text-blue-800 shadow-md' 
                : 'text-white hover:bg-white/5'
            }`}
          >
            <Anchor size={14} />
            <span>Pescadores</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab('species'); setEditingSpecies(null); setIsAddingSpecies(false); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all font-bold text-xs select-none w-1/2 justify-center ${
              activeSubTab === 'species' 
                ? 'bg-white text-blue-800 shadow-md' 
                : 'text-white hover:bg-white/5'
            }`}
          >
            <Tag size={13} />
            <span>Espécies</span>
          </button>
        </div>
      </div>

      {/* FISHERS SECTION */}
      {activeSubTab === 'fishermen' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isAddingFisherman || editingFisherman ? (
            <div className="transition-all animate-in slide-in-from-bottom duration-300">
              <FishermanRegistrationForm 
                onSave={(newFisher) => {
                  if (editingFisherman) {
                    onUpdateFisherman(newFisher);
                    setEditingFisherman(null);
                  } else {
                    onAddFisherman(newFisher);
                    setIsAddingFisherman(false);
                  }
                }}
                onCancel={() => {
                  setIsAddingFisherman(false);
                  setEditingFisherman(null);
                }}
                editingFisherman={editingFisherman}
              />
            </div>
          ) : (
            <div className="space-y-6">
                     {/* Filter controls */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Search size={14} className="text-slate-500" /> Filtros de Pescadores
                  </h3>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {filteredFishermen.length > 0 && (
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/30 uppercase">
                        {filteredFishermen.length} {filteredFishermen.length === 1 ? 'Pescador' : 'Pescadores'}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={filteredFishermen.length === 0}
                      onClick={handleExportFishermenExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 text-green-600 dark:text-green-400 hover:text-green-700 disabled:opacity-50 text-xs font-black rounded-full border border-green-150 dark:border-green-900/40 transition-all cursor-pointer"
                    >
                      <FileDown size={13} />
                      Exportar Excel
                    </button>
                    <button
                      type="button"
                      disabled={isExportingFishermenPDF || filteredFishermen.length === 0}
                      onClick={handleExportFishermenPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50 text-xs font-black rounded-full border border-red-150 dark:border-red-900/40 transition-all cursor-pointer"
                    >
                      <FileDown size={13} />
                      {isExportingFishermenPDF ? 'Exportando...' : 'Exportar PDF'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Search input */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar por nome..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
                      value={fishermanSearch}
                      onChange={e => setFishermanSearch(e.target.value)}
                    />
                  </div>

                  {/* Dropdown Localidade */}
                  <div className="relative">
                    <select
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                      value={filterFishermanLocation}
                      onChange={e => setFilterFishermanLocation(e.target.value)}
                    >
                      <option value="" className="dark:bg-slate-900">Todas as Localidades</option>
                      {locations.map(loc => (
                        <option key={loc} value={loc} className="dark:bg-slate-900">{loc}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown Arte */}
                  <div className="relative">
                    <select
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                      value={filterFishermanGear}
                      onChange={e => setFilterFishermanGear(e.target.value)}
                    >
                      <option value="" className="dark:bg-slate-900">Todas as Artes</option>
                      {gearTypes.map(gear => (
                        <option key={gear} value={gear} className="dark:bg-slate-900">{gear}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown Embarcação */}
                  <div className="relative">
                    <select
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                      value={filterFishermanVessel}
                      onChange={e => setFilterFishermanVessel(e.target.value)}
                    >
                      <option value="" className="dark:bg-slate-900">Todas as Embarcações</option>
                      {vesselTypes.map(vessel => (
                        <option key={vessel} value={vessel} className="dark:bg-slate-900">{vessel}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons: Add / Reset */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFishermanSearch('');
                        setFilterFishermanLocation('');
                        setFilterFishermanGear('');
                        setFilterFishermanVessel('');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold transition-all"
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingFisherman(true)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap"
                    >
                      <Plus size={13} /> Novo
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              {fishermen.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 py-16">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Nenhum pescador cadastrado</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2 text-sm leading-relaxed">
                    Cadastre os pescadores parceiros locais de pesca para ativar o autopreenchimento de suas embarcações e artes preferidas no preenchimento de fichas.
                  </p>
                </div>
              ) : filteredFishermen.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 py-16">
                  <Search size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4 animate-bounce" />
                  <p className="text-slate-400 dark:text-slate-500 font-semibold">Nenhum pescador encontrado para a busca "{fishermanSearch}".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFishermen.map(f => {
                    const isIncomplete = isFishermanIncomplete(f);
                    return (
                      <div key={f.id} className={`rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between gap-5 relative group ${isIncomplete ? 'border-red-300 dark:border-red-900/40 bg-red-50/5 dark:bg-red-950/5 hover:border-red-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center justify-center shrink-0">
                              <User className="text-blue-600 dark:text-blue-400" size={18} />
                            </div>
                            <div className="flex-1 min-w-0 pr-8">
                              <h4 className="font-extrabold text-slate-800 dark:text-slate-150 text-base group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors leading-tight truncate">{f.name}</h4>
                              <span className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${(!f.location || f.location.trim() === '' || f.location.trim() === '-' || f.location.trim() === 'Não informado') ? 'text-red-500 font-extrabold' : 'text-slate-400 dark:text-slate-500'}`}>
                                <MapPin size={11} className={(!f.location || f.location.trim() === '' || f.location.trim() === '-' || f.location.trim() === 'Não informado') ? 'text-red-500' : 'text-slate-350 dark:text-slate-600'} /> {f.location || 'Não informado'}
                              </span>
                            </div>
                          </div>

                          {isIncomplete && (
                            <div className="absolute top-4 right-4 bg-red-650 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-sm animate-pulse">
                              <Info size={10} /> Incompleto
                            </div>
                          )}

                          {/* Badges / Vessel specifications */}
                          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-50 dark:border-slate-800">
                            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-750 px-3 py-2 rounded-xl flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-400 dark:text-slate-500 text-[10px] uppercase">Embarcação</span>
                              <span className={`font-bold truncate ${(!f.vesselType || f.vesselType.trim() === '') ? 'text-red-500 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                                {f.vesselType || 'Falta preencher'}
                              </span>
                            </div>
                            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/30 px-3 py-2 rounded-xl flex flex-col gap-0.5 justify-center">
                              <span className="font-semibold text-blue-500 dark:text-blue-400 text-[10px] uppercase">Arte de Pesca</span>
                              <span className="font-extrabold text-blue-800 dark:text-blue-300 truncate flex items-center gap-1.5"><Anchor size={11} /> {f.gearType}</span>
                            </div>
                          </div>

                          {/* Extra Dynamic Specifications Badges */}
                          {(() => {
                            const isTarrafa = f.gearType.toLowerCase() === 'tarrafa';
                            const hasGearDetails = !!(
                              f.gearDetails?.meshSize || 
                              f.gearDetails?.hookCount || 
                              f.gearDetails?.trapCount || 
                              f.gearDetails?.length || 
                              f.gearDetails?.height ||
                              f.gearDetails?.jequiBleedingMesh ||
                              f.gearDetails?.hookSize ||
                              f.gearDetails?.netLength ||
                              f.gearDetails?.mouthHeight ||
                              f.gearDetails?.trawlMeshSize
                            );
                            if (!hasGearDetails) return null;
                            return (
                              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="font-extrabold text-slate-400 dark:text-slate-500 block w-full mb-1 text-[8px] uppercase tracking-wider">Especificações</span>
                                {f.gearDetails?.meshSize && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold">Malha: {f.gearDetails.meshSize} {isTarrafa ? 'cm' : 'mm'}</span>
                                )}
                                {f.gearDetails?.length && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold">Comprimento: {f.gearDetails.length} m</span>
                                )}
                                {f.gearDetails?.height && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold">Altura: {f.gearDetails.height} m</span>
                                )}
                                {f.gearDetails?.hookCount && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold">Anzóis: {f.gearDetails.hookCount}</span>
                                )}
                                {f.gearDetails?.trapCount && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold">Armadilhas: {f.gearDetails.trapCount}</span>
                                )}
                                {f.gearDetails?.jequiBleedingMesh && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold text-blue-600 dark:text-blue-400">Malha Sangra: {f.gearDetails.jequiBleedingMesh} cm</span>
                                )}
                                {f.gearDetails?.hookSize && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold text-blue-600 dark:text-blue-400">Anzol: {f.gearDetails.hookSize}</span>
                                )}
                                {f.gearDetails?.netLength && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold text-blue-600 dark:text-blue-400">Rede: {f.gearDetails.netLength} m</span>
                                )}
                                {f.gearDetails?.mouthHeight && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold text-blue-600 dark:text-blue-400">Boca Rede: {f.gearDetails.mouthHeight} m</span>
                                )}
                                {f.gearDetails?.trawlMeshSize && (
                                  <span className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-1.5 py-0.5 rounded-md font-semibold text-blue-600 dark:text-blue-400">Malha Arrasto: {f.gearDetails.trawlMeshSize} mm</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Row management buttons */}
                        <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setEditingFisherman(f)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"
                          >
                            <Edit2 size={13} /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir o pescador "${f.name}"?`)) {
                                onDeleteFisherman(f.id);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                          >
                            <Trash2 size={13} /> Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SPECIES SECTION */}
      {activeSubTab === 'species' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isAddingSpecies ? (
            <div className="w-full max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-600 text-white font-semibold">
                <div className="flex items-center gap-2">
                  <Tag size={18} />
                  <h2 className="text-sm font-black uppercase">Novo Registro de Espécie</h2>
                </div>
                <button type="button" onClick={() => { setIsAddingSpecies(false); setAddSpeciesImages([]); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSpeciesSave} className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Nome Popular</label>
                    <input
                      name="comName"
                      type="text"
                      required
                      placeholder="Ex: Pargo, Serigado, Atum..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Nome Científico</label>
                    <input
                      name="sciName"
                      type="text"
                      required
                      placeholder="Ex: Lutjanus purpureus..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 italic placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Família</label>
                    <input
                      name="family"
                      type="text"
                      placeholder="Ex: Lutjanidae..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Ordem</label>
                    <input
                      name="order"
                      type="text"
                      placeholder="Ex: Perciformes..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Grupo</label>
                    <input
                      name="group"
                      type="text"
                      placeholder="Ex: Peixes, Crustáceos..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Dados de Conservação (IUCN Link)</label>
                    <input
                      name="conservationUrl"
                      type="url"
                      placeholder="Ex: https://www.iucnredlist.org/species/..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Ver mais (FishBase Link)</label>
                    <input
                      name="seeMoreUrl"
                      type="url"
                      placeholder="Ex: https://www.fishbase.se/summary/..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                    <Camera size={14} className="text-slate-400" /> Fotos da Espécie
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleSpeciesPhotoSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    />
                    <div className="text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                      <Camera size={32} className="text-slate-350 dark:text-slate-650" />
                      <span className="text-xs font-extrabold text-slate-655 dark:text-slate-300">Clique para selecionar foto da espécie</span>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Tamanho máximo recomendado: 4MB (imagens serão comprimidas)</p>
                    </div>
                  </div>

                  {addSpeciesImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                      {addSpeciesImages.map((b64, index) => (
                        <div key={index} className="aspect-square bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-750 rounded-xl overflow-hidden relative group shadow-sm">
                          <img src={b64} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                          <button 
                             type="button"
                             onClick={() => setAddSpeciesImages(addSpeciesImages.filter((_, idx) => idx !== index))}
                             className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white shadow-md p-1.5 rounded-xl"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <button
                    type="button"
                    onClick={() => { setIsAddingSpecies(false); setAddSpeciesImages([]); }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 font-bold text-xs text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isUploading}
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 hover:shadow-lg text-white font-extrabold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isUploading ? 'Salvando...' : 'Cadastrar Espécie'}
                  </button>
                </div>
              </form>
            </div>
          ) : editingSpecies ? (
            <div className="w-full max-w-7xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-650 text-white font-semibold">
                <div className="flex items-center gap-2">
                  <Edit2 size={16} />
                  <h2 className="text-sm font-black uppercase">Editar Registro de Espécie</h2>
                </div>
                <button type="button" onClick={() => { setEditingSpecies(null); setAddSpeciesImages([]); }} className="p-1.5 hover:bg-white/15 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleUpdateExistingSpecies} className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase">Nome Popular</label>
                    <input
                      name="editComName"
                      type="text"
                      required
                      defaultValue={editingSpecies.commonName}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase">Nome Científico</label>
                    <input
                      name="editSciName"
                      type="text"
                      required
                      defaultValue={editingSpecies.scientificName}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 italic placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase">Família</label>
                    <input
                      name="editFamily"
                      type="text"
                      defaultValue={editingSpecies.family || ''}
                      placeholder="Ex: Lutjanidae..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase">Ordem</label>
                    <input
                      name="editOrder"
                      type="text"
                      defaultValue={editingSpecies.order || ''}
                      placeholder="Ex: Perciformes..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase">Grupo</label>
                    <input
                      name="editGroup"
                      type="text"
                      defaultValue={editingSpecies.group || ''}
                      placeholder="Ex: Peixes, Crustáceos..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase">Dados de Conservação (IUCN Link)</label>
                    <input
                      name="editConservationUrl"
                      type="url"
                      defaultValue={editingSpecies.conservationUrl || ''}
                      placeholder="Ex: https://www.iucnredlist.org/species/..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase">Ver mais (FishBase Link)</label>
                    <input
                      name="editSeeMoreUrl"
                      type="url"
                      defaultValue={editingSpecies.seeMoreUrl || ''}
                      placeholder="Ex: https://www.fishbase.se/summary/..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                    <Camera size={14} className="text-slate-400" /> Adicionar Fotos
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-250 dark:border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleSpeciesPhotoSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    />
                    <div className="text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                      <Camera size={30} className="text-slate-350 dark:text-slate-650" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Adicionar mais fotos da espécie</span>
                    </div>
                  </div>

                  {/* Current and new preview images */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                    {/* New B64 edits */}
                    {addSpeciesImages.map((b64, index) => (
                      <div key={'new-' + index} className="aspect-square bg-slate-50 dark:bg-slate-800 border border-dashed border-indigo-350 dark:border-indigo-900 rounded-xl overflow-hidden relative group">
                        <img src={b64} alt={`Preview New ${index}`} className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1.5 bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Nova</span>
                        <button 
                          type="button"
                          onClick={() => setAddSpeciesImages(addSpeciesImages.filter((_, idx) => idx !== index))}
                          className="absolute top-1.5 right-1.5 bg-red-650 text-white p-1 rounded-lg"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    
                    {/* Existing Photos */}
                    {editingSpecies.images?.map((url, index) => (
                      <div key={'old-' + index} className="aspect-square bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden relative group">
                        <img src={url} alt={`Preview Old ${index}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => {
                            const filtered = (editingSpecies.images || []).filter((_, idx) => idx !== index);
                            setEditingSpecies({ ...editingSpecies, images: filtered });
                          }}
                          className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg p-1"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <button
                    type="button"
                    onClick={() => { setEditingSpecies(null); setAddSpeciesImages([]); }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isUploading}
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-colors"
                  >
                    {isUploading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filter panel */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 font-sans animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Search size={14} className="text-slate-500" /> Filtros de Espécies
                  </h3>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {filteredSpeciesList.length > 0 && (
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-900/30 uppercase">
                        {filteredSpeciesList.length} {filteredSpeciesList.length === 1 ? 'Espécie' : 'Espécies'}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={isExportingSpeciesPDF || filteredSpeciesList.length === 0}
                      onClick={handleExportSpeciesPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50 text-xs font-black rounded-full border border-red-150 dark:border-red-900/40 transition-all cursor-pointer"
                    >
                      <FileDown size={13} />
                      {isExportingSpeciesPDF ? 'Convertendo Fotos...' : 'Exportar PDF'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Search query */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar por nome..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
                      value={speciesSearch}
                      onChange={e => setSpeciesSearch(e.target.value)}
                    />
                  </div>

                  {/* Dropdown status das fotos */}
                  <div className="relative">
                    <select
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                      value={filterSpeciesPhoto}
                      onChange={e => setFilterSpeciesPhoto(e.target.value as any)}
                    >
                      <option value="all" className="dark:bg-slate-900">Todas as Imagens</option>
                      <option value="with" className="dark:bg-slate-900">Com Fotos</option>
                      <option value="without" className="dark:bg-slate-900">Sem Fotos</option>
                    </select>
                  </div>

                  {/* Dropdown ordenação */}
                  <div className="relative">
                    <select
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                      value={sortSpeciesOrder}
                      onChange={e => setSortSpeciesOrder(e.target.value as any)}
                    >
                      <option value="az" className="dark:bg-slate-900">Nome (Alfabética A-Z)</option>
                      <option value="za" className="dark:bg-slate-900">Nome (Alfabética Z-A)</option>
                      <option value="newest" className="dark:bg-slate-900">Cadastros Recentes</option>
                    </select>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSpeciesSearch('');
                        setFilterSpeciesPhoto('all');
                        setSortSpeciesOrder('az');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-505 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold transition-all"
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingSpecies(true)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap"
                    >
                      <Plus size={13} /> Nova
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Grid list */}
              {speciesList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-350 dark:border-slate-800 py-16">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Tag size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Nenhuma espécie cadastrada</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2 text-sm leading-relaxed">
                    Adicione novas espécies ou peixes locais para que os mesmos fiquem disponíveis de forma automatizada ao preencher fichas.
                  </p>
                </div>
              ) : filteredSpeciesList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 py-16">
                  <Search size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4 animate-bounce" />
                  <p className="text-slate-400 dark:text-slate-500 font-semibold">Nenhuma espécie localizada para a busca.</p>
                </div>
              ) : (
                <div id="species-grid" className="flex flex-col gap-5">
                  {filteredSpeciesList.map(s => {
                    const isIncomplete = isSpeciesIncomplete(s);
                    return (
                      <div 
                        key={s.id} 
                        className={`rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row md:h-[185px] w-full relative group cursor-pointer ${isIncomplete ? 'border-red-300 dark:border-red-900/40 hover:border-red-400 bg-red-50/5 dark:bg-red-950/5 shadow-red-100/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                        onClick={() => { setSelectedSpeciesForView(s); setActiveSpeciesPhotoIndex(0); }}
                      >
                        {/* Photo banner / Left Side */}
                        <div className="w-full md:w-[332px] h-48 md:h-[185px] flex-shrink-0 bg-slate-50 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                          {s.images && s.images.length > 0 ? (
                            <img 
                              src={s.images[0]} 
                              alt={s.commonName} 
                              className="w-full h-full md:w-[332px] md:h-[185px] object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="text-slate-350 dark:text-slate-600 flex flex-col items-center gap-2 p-4 text-center">
                              <ImageIcon size={32} strokeWidth={1.5} className="text-slate-300 dark:text-slate-700" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Sem fotos</span>
                            </div>
                          )}
                          
                          {s.images && s.images.length > 0 && (
                            <div className="absolute top-3 right-3 bg-slate-900/75 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                              <Camera size={10} /> {s.images.length} {s.images.length === 1 ? 'Foto' : 'Fotos'}
                            </div>
                          )}
                        </div>

                        {/* Right side details */}
                        <div className="flex-1 p-4 md:py-3 md:px-5 flex flex-col justify-between h-full overflow-hidden">
                          <div className="space-y-2 md:space-y-1.5">
                            {/* Title & Scientific name */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="truncate flex-1">
                                <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-base md:text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {s.commonName}
                                </h4>
                                <span className="text-[10px] md:text-xs italic text-slate-500 dark:text-slate-400 font-bold font-sans flex items-center gap-1 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded-lg w-fit mt-1 max-w-full truncate">
                                  <Sparkles size={11} className="text-indigo-500 shrink-0" /> <span className="truncate">{s.scientificName || 'Não informado'}</span>
                                </span>
                              </div>
                              
                              {/* Completeness Badge */}
                              <div className="shrink-0 flex items-center">
                                {isIncomplete ? (
                                  <span className="bg-red-50 dark:bg-red-955/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                    <Info size={10} /> Incompleto
                                  </span>
                                ) : (
                                  <span className="bg-green-50 dark:bg-green-955/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/30 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                                    ✓ Completo
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Info grid - Compact horizontal row */}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <span className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px]">
                                <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[9px]">Família:</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                                  {s.family && s.family.trim() !== '' ? s.family : 'Não informado'}
                                </span>
                              </span>
                              <span className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px]">
                                <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[9px]">Ordem:</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                                  {s.order && s.order.trim() !== '' ? s.order : 'Não informado'}
                                </span>
                              </span>
                              <span className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px]">
                                <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[9px]">Grupo:</span>
                                <span className="font-extrabold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                                  {s.group && s.group.trim() !== '' ? s.group : 'Não informado'}
                                </span>
                              </span>
                            </div>

                            {/* External URL buttons */}
                            <div className="flex flex-wrap gap-1.5 pt-0.5" onClick={e => e.stopPropagation()}>
                              {s.conservationUrl && s.conservationUrl.trim() !== '' ? (
                                <a 
                                  href={s.conservationUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50/50 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-655 dark:text-red-400 border border-red-100/50 dark:border-red-900/20 text-[10px] font-bold rounded-lg transition-all"
                                >
                                  <Info size={10} />
                                  <span>IUCN Red List</span>
                                  <ExternalLink size={9} className="opacity-60" />
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100/40 dark:bg-slate-800/20 text-slate-400 dark:text-slate-600 text-[10px] font-medium rounded-lg border border-slate-150/30 dark:border-slate-800/30 select-none">
                                  Sem IUCN
                                </span>
                              )}

                              {s.seeMoreUrl && s.seeMoreUrl.trim() !== '' ? (
                                <a 
                                  href={s.seeMoreUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/50 hover:bg-blue-100/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-655 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/20 text-[10px] font-bold rounded-lg transition-all"
                                >
                                  <Anchor size={10} className="text-blue-500" />
                                  <span>FishBase</span>
                                  <ExternalLink size={9} className="opacity-60" />
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100/40 dark:bg-slate-800/20 text-slate-400 dark:text-slate-600 text-[10px] font-medium rounded-lg border border-slate-150/30 dark:border-slate-800/30 select-none">
                                  Sem FishBase
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Footer action buttons */}
                          <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800/60 pt-2 mt-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => { setSelectedSpeciesForView(s); setActiveSpeciesPhotoIndex(0); }}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-black text-blue-650 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg transition-all cursor-pointer shadow-xs"
                            >
                              <Camera size={11} />
                              <span>Fotos ({s.images?.length || 0})</span>
                            </button>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditSpeciesClick(s)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 size={11} />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Excluir espécie "${s.commonName}" do banco?`)) {
                                    onDeleteSpecies(s.id);
                                  }
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={11} />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PHOTO LIGHTBOX GALLERY MODAL */}
      {selectedSpeciesForView && (
        <div id="photos-view-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-indigo-400">Catálogo de Espécies</span>
                <h3 className="text-base sm:text-lg font-extrabold font-sans leading-tight mt-0.5">
                  {selectedSpeciesForView.commonName} <span className="font-medium text-slate-400 text-xs sm:text-sm italic pl-1.5">{selectedSpeciesForView.scientificName}</span>
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSpeciesForView(null)} 
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
              {selectedSpeciesForView.images && selectedSpeciesForView.images.length > 0 ? (
                <div className="space-y-4">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden relative border border-slate-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner flex items-center justify-center">
                    <img 
                      src={selectedSpeciesForView.images[activeSpeciesPhotoIndex] || selectedSpeciesForView.images[0]} 
                      alt={selectedSpeciesForView.commonName} 
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full uppercase">
                      {activeSpeciesPhotoIndex + 1} de {selectedSpeciesForView.images.length}
                    </div>

                    {selectedSpeciesForView.images.length > 1 && (
                      <>
                        <button 
                          type="button" 
                          onClick={() => setActiveSpeciesPhotoIndex(p => (p - 1 + selectedSpeciesForView.images!.length) % selectedSpeciesForView.images!.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center font-bold text-lg select-none"
                        >
                          ‹
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setActiveSpeciesPhotoIndex(p => (p + 1) % selectedSpeciesForView.images!.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center font-bold text-lg select-none"
                        >
                          ›
                        </button>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {selectedSpeciesForView.images.map((imgUrl, index) => (
                      <button 
                        key={index} 
                        type="button"
                        onClick={() => setActiveSpeciesPhotoIndex(index)}
                        className={`aspect-square rounded-xl overflow-hidden relative border transition-all ${index === activeSpeciesPhotoIndex ? 'ring-2 ring-blue-600 border-blue-600 scale-105 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:scale-[1.01]'}`}
                      >
                        <img src={imgUrl} alt={`${selectedSpeciesForView.commonName} thumb ${index}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-12 text-center text-slate-500 dark:text-slate-400 font-semibold text-sm">
                  <Camera size={36} className="text-slate-350 mx-auto mb-2" />
                  Nenhuma foto cadastrada para esta espécie.
                </div>
              )}

              {/* Informações taxonômicas e Links */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Classificação e Informações</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Família</span>
                    <span className={`text-sm font-bold ${!selectedSpeciesForView.family ? 'text-red-500 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                      {selectedSpeciesForView.family || 'Falta preencher'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Ordem</span>
                    <span className={`text-sm font-bold ${!selectedSpeciesForView.order ? 'text-red-500 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                      {selectedSpeciesForView.order || 'Falta preencher'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Grupo</span>
                    <span className={`text-sm font-bold ${!selectedSpeciesForView.group ? 'text-red-500 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                      {selectedSpeciesForView.group || 'Falta preencher'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* IUCN Link */}
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Dados de Conservação (IUCN)</span>
                    {selectedSpeciesForView.conservationUrl ? (
                      <a 
                        href={selectedSpeciesForView.conservationUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-850 flex items-center gap-1 hover:underline break-all"
                      >
                        Acessar link IUCN <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs font-extrabold text-red-500 uppercase">Link ausente (Falta preencher)</span>
                    )}
                  </div>

                  {/* FishBase Link */}
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Ver mais (FishBase)</span>
                    {selectedSpeciesForView.seeMoreUrl ? (
                      <a 
                        href={selectedSpeciesForView.seeMoreUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-850 flex items-center gap-1 hover:underline break-all"
                      >
                        Acessar FishBase <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs font-extrabold text-red-500 uppercase">Link ausente (Falta preencher)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                type="button" 
                onClick={() => setSelectedSpeciesForView(null)} 
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-extrabold shadow-sm transition-colors"
              >
                Fechar Galeria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Crop & Rotation Photo Editor */}
      <ImageEditorModal 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        imageSrc={editorImageSrc}
        onConfirm={(editedB64) => {
          setAddSpeciesImages(prev => [...prev, editedB64]);
        }}
      />

      {/* Species Export Progress Modal Overlay */}
      {speciesExportProgress && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 font-sans animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in scale-in duration-300">
            {/* Spinning Icon */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-950/50"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              <Tag size={28} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>

            {/* Stage title */}
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                {speciesExportProgress.stage === 'images' && 'Carregando Fotos da Espécie'}
                {speciesExportProgress.stage === 'worms' && 'Preenchendo Dados via WoRMS'}
                {speciesExportProgress.stage === 'pdf' && 'Construindo o Catálogo em PDF'}
                {speciesExportProgress.stage === 'saving' && 'Finalizando Download'}
                {!speciesExportProgress.stage && 'Processando Catálogo'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                {speciesExportProgress.message}
              </p>
            </div>

            {/* Progress Bar */}
            {speciesExportProgress.total > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${Math.min(100, Math.max(5, (speciesExportProgress.current / speciesExportProgress.total) * 100))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <span>Progresso</span>
                  <span>
                    {speciesExportProgress.current} / {speciesExportProgress.total} ({Math.round((speciesExportProgress.current / speciesExportProgress.total) * 100)}%)
                  </span>
                </div>
              </div>
            )}

            {/* Warning / Tip */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 font-medium text-left flex items-start gap-2">
              <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p>Por favor, aguarde. Estamos integrando os dados científicos oficiais e gerando o documento em alta resolução.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastrosTab;
