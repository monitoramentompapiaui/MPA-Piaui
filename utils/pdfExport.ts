import { jsPDF } from 'jspdf';
import { LandingForm } from '../types';

const SCIENTIFIC_NAMES: Record<string, string> = {
  'caranguejo uçá': 'Ucides cordatus',
  'caranguejo uça': 'Ucides cordatus',
  'ostra de raiz': 'Crassostrea rhizophorae',
  'ostra de rocha': 'Crassostrea gasar',
  'marisco de água doce': 'Corbiculidae',
  'ostra de pedra': 'Crassostrea',
  'unha de velho': 'Tagelus plebeius',
  'sururu': 'Mytella guyanensis'
};

interface FilterParams {
  year: string;
  location: string;
  species: string;
  startDate?: string;
  endDate?: string;
}

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const MONTHS_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const MONTH_INDEXES: Record<string, number> = {
  'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
  'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
};

/**
 * Draws a page header with a mini gold and blue banner
 */
const drawPageHeader = (doc: jsPDF, title: string) => {
  // Mini Header Blue bar
  doc.setFillColor(42, 92, 170); // MPA Blue
  doc.rect(0, 0, 210, 14, 'F');
  
  // Gold thin accent line
  doc.setFillColor(251, 191, 36); // Amber
  doc.rect(0, 13, 210, 1, 'F');

  // Title text
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SISTEMA NACIONAL DE MONITORAMENTO DE DESEMBARQUE PESQUEIRO - RELATÓRIOS ESTATÍSTICOS', 15, 8);

  // Subtitle / Page Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 15, 22);
};

/**
 * Draws a standard page footer with a dynamic page counter
 */
const drawPageFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Relatório gerado eletronicamente pelo Painel de Controle de Pesca Artesanal - MPA Piauí', 15, 287);
  doc.text(`Página ${pageNum} de ${totalPages}`, 195, 287, { align: 'right' });
};

/**
 * Renders a fallback placeholder card if a chart is unavailable
 */
const drawFallbackChartPlaceholder = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const imgY = y + 8;
  const imgH = h - 11;
  
  // Draw a neat grey dashed box inside the white card
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(x + 4, imgY + 2, w - 8, imgH - 4, 'S');
  doc.setLineDashPattern([], 0); // Reset dash

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Gráfico indisponível (dados insuficientes ou em carregamento)', x + w / 2, imgY + imgH / 2, { align: 'center' });
};

/**
 * Elegant helper to draw a chart card containing the real dashboard canvas image
 */
const drawChartCardInPdf = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  type: string
) => {
  // Draw card container shadow border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.rect(x, y, w, h, 'FD');

  // Left MPA blue accent stripe for premium executive branding
  doc.setFillColor(42, 92, 170); // MPA Blue
  doc.rect(x, y, 1.5, h, 'F');

  // Chart Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(title.toUpperCase(), x + 5, y + 6.5);

  const registry = (window as any).chartRegistry;
  const chartObj = registry?.[type];
  const imgDataUrl = chartObj?.getImageDataUrl?.();

  if (imgDataUrl) {
    try {
      const padding = 3;
      const imgX = x + padding;
      const imgY = y + 8;
      const imgW = w - (padding * 2);
      const imgH = h - 11;
      
      doc.addImage(imgDataUrl, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST');
    } catch (err) {
      console.error(`Error rendering chart ${type} image to PDF:`, err);
      drawFallbackChartPlaceholder(doc, x, y, w, h);
    }
  } else {
    drawFallbackChartPlaceholder(doc, x, y, w, h);
  }
};

/**
 * Draws a clean table header inside a container column
 */
const drawSubTableHeader = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  headers: { text: string; x: number; align?: 'left' | 'right' | 'center' }[]
) => {
  doc.setFillColor(235, 241, 250);
  doc.rect(x, y, w, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(x, y, x + w, y);
  doc.line(x, y + 6, x + w, y + 6);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);

  headers.forEach(h => {
    doc.text(h.text, h.x, y + 4.2, { align: h.align || 'left' });
  });
};

export const exportToPdf = (data: LandingForm[], filters: FilterParams): void => {
  if (data.length === 0) return;

  const totalPages = 11;
  const now = new Date();

  // Initialize jsPDF A4 document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Calculate high-level summary metrics
  const totalWeight = data.reduce((sum, f) => sum + (f.production?.reduce((pSum, p) => pSum + (p.weight || 0), 0) || 0), 0);
  const totalValue = data.reduce((sum, f) => sum + (f.production?.reduce((pSum, p) => pSum + ((p.weight || 0) * (p.price || 0)), 0) || 0), 0);
  const totalFichas = data.length;

  const uniquePescadores = new Set(data.map(f => f.identification?.fishermanName?.trim()).filter(Boolean));
  const totalPescadores = uniquePescadores.size || 0;

  const uniqueLocalidades = new Set(data.map(f => f.identification?.location?.trim()).filter(Boolean));
  const totalLocalidades = uniqueLocalidades.size || 0;

  const uniqueEspecies = new Set(data.flatMap(f => f.production?.map(p => p.species?.trim())).filter(Boolean));
  const totalEspecies = uniqueEspecies.size || 0;

  // Formatting helpers
  const formatKg = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg';
  const formatCurrency = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatTons = (v: number) => (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' t';

  // 1. Species data aggregation
  const speciesMap = new Map<string, { weight: number; revenue: number; scientificName: string }>();
  data.forEach(f => {
    f.production?.forEach(p => {
      const name = p.species?.trim() || 'Desconhecida';
      const weight = p.weight || 0;
      const price = p.price || 0;
      const rev = weight * price;

      const existing = speciesMap.get(name) || { weight: 0, revenue: 0, scientificName: p.scientificName || '' };
      existing.weight += weight;
      existing.revenue += rev;
      if (!existing.scientificName && p.scientificName) {
        existing.scientificName = p.scientificName;
      }
      speciesMap.set(name, existing);
    });
  });

  const sortedSpecies = Array.from(speciesMap.entries())
    .map(([name, info]) => ({
      name,
      scientificName: info.scientificName || SCIENTIFIC_NAMES[name.toLowerCase()] || 'Recurso cadastrado',
      weight: info.weight,
      revenue: info.revenue,
      avgPrice: info.weight > 0 ? info.revenue / info.weight : 0
    }))
    .sort((a, b) => b.weight - a.weight);

  // 2. Location data aggregation
  const locationMap = new Map<string, { count: number; weight: number; revenue: number }>();
  data.forEach(f => {
    const loc = f.identification?.location?.trim() || 'Não Informada';
    const weight = f.production?.reduce((sum, p) => sum + (p.weight || 0), 0) || 0;
    const rev = f.production?.reduce((sum, p) => sum + ((p.weight || 0) * (p.price || 0)), 0) || 0;

    const existing = locationMap.get(loc) || { count: 0, weight: 0, revenue: 0 };
    existing.count += 1;
    existing.weight += weight;
    existing.revenue += rev;
    locationMap.set(loc, existing);
  });

  const sortedLocations = Array.from(locationMap.entries())
    .map(([name, info]) => ({
      name,
      count: info.count,
      weight: info.weight,
      revenue: info.revenue
    }))
    .sort((a, b) => b.weight - a.weight);

  // 3. Gear data aggregation
  const gearMap = new Map<string, { count: number; weight: number; revenue: number }>();
  data.forEach(f => {
    const gear = f.fishing?.gearType || 'Não Informada';
    const weight = f.production?.reduce((sum, p) => sum + (p.weight || 0), 0) || 0;
    const rev = f.production?.reduce((sum, p) => sum + ((p.weight || 0) * (p.price || 0)), 0) || 0;

    const existing = gearMap.get(gear) || { count: 0, weight: 0, revenue: 0 };
    existing.count += 1;
    existing.weight += weight;
    existing.revenue += rev;
    gearMap.set(gear, existing);
  });

  const sortedGears = Array.from(gearMap.entries())
    .map(([name, info]) => ({
      name,
      count: info.count,
      weight: info.weight,
      revenue: info.revenue
    }))
    .sort((a, b) => b.weight - a.weight);

  // 4. User rankings (manual entry only)
  const userCounts: Record<string, { email: string; name: string; count: number }> = {};
  data.forEach(f => {
    if (f.identification?.isManualEntry !== true) return;
    const email = f.identification?.createdByEmail || 'Acesso Offline';
    const name = f.identification?.createdByUsername || (email !== 'Acesso Offline' ? email.split('@')[0] : 'Usuário Local');
    const key = email.toLowerCase();
    if (!userCounts[key]) {
      userCounts[key] = { email, name, count: 0 };
    }
    userCounts[key].count += 1;
  });
  const sortedUsers = Object.values(userCounts).sort((a, b) => b.count - a.count);

  // 5. Collector rankings (manual entry only)
  const collectorCounts: Record<string, number> = {};
  data.forEach(f => {
    if (f.identification?.isManualEntry !== true) return;
    const collector = (f.identification?.collectorName || 'Agente de Campo').trim();
    if (collector) {
      collectorCounts[collector] = (collectorCounts[collector] || 0) + 1;
    }
  });
  const sortedCollectors = Object.entries(collectorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);


  // ====================================================
  // === PAGE 1: COVER, EXECUTIVE SUMMARY & TOP TABLES ===
  // ====================================================

  // Header Banner
  doc.setFillColor(42, 92, 170); // MPA Blue
  doc.rect(0, 0, 210, 28, 'F');
  
  doc.setFillColor(251, 191, 36); // Amber Gold
  doc.rect(0, 25, 210, 3, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('MINISTÉRIO DA PESCA E AQUICULTURA - MPA BRASIL', 15, 10);
  doc.text('SUPERINTENDÊNCIA FEDERAL DA PESCA NO ESTADO DO PIAUÍ - SFP PI', 15, 14);

  doc.setFontSize(16);
  doc.text('BOLETIM ESTATÍSTICO DE DESEMBARQUE PESQUEIRO', 15, 21.5);

  // Document Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('RELATÓRIO HISTÓRICO DE MONITORAMENTO DA ATIVIDADE PESQUEIRA ARTESANAL', 15, 36);

  // Filters Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.rect(15, 41, 180, 23, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PARAMETRIZAÇÃO DOS FILTROS APLICADOS', 19, 46.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);

  const startDStr = filters.startDate ? filters.startDate.split('-').reverse().join('/') : 'Início';
  const endDStr = filters.endDate ? filters.endDate.split('-').reverse().join('/') : 'Atual';
  const periodStr = (filters.startDate || filters.endDate) ? `${startDStr} até ${endDStr}` : 'Série Histórica Completa';

  doc.text(`• Ano de Exercício: ${filters.year === 'all' ? 'Todos os Registros' : filters.year}`, 20, 52);
  doc.text(`• Comunidade: ${filters.location === 'all' ? 'Todas as Localidades' : filters.location}`, 20, 56.5);
  doc.text(`• Espécie de Recurso: ${filters.species === 'all' ? 'Todas as Espécies' : filters.species}`, 20, 61);

  doc.text(`• Período Temporal: ${periodStr}`, 105, 52);
  doc.text(`• Data de Emissão: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, 105, 56.5);
  doc.text(`• Código do Relatório: MPA-PI-DES-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`, 105, 61);

  // Draw 4 KPI summary cards
  const drawKpiCard = (x: number, y: number, w: number, h: number, title: string, value: string, r: number, g: number, b: number) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, y, w, h, 'FD');

    doc.setFillColor(r, g, b);
    doc.rect(x, y, 1.2, h, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(title, x + 5, y + 4.2);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(value, x + 5, y + 10.5);
  };

  const kpiY = 69;
  const kpiW = 86;
  const kpiH = 14;

  drawKpiCard(15, kpiY, kpiW, kpiH, 'VOLUME TOTAL DESEMBARCADO', formatTons(totalWeight), 42, 92, 170);
  drawKpiCard(109, kpiY, kpiW, kpiH, 'VALOR ESTIMADO DA COMERCIALIZAÇÃO', formatCurrency(totalValue), 16, 185, 129);
  drawKpiCard(15, kpiY + 17, kpiW, kpiH, 'N° DE FICHAS DE CAPTURA REGISTRADAS', `${totalFichas} formulários`, 99, 102, 241);
  drawKpiCard(109, kpiY + 17, kpiW, kpiH, 'PESCADORES, COMUNIDADES & ESPÉCIES', `${totalPescadores} Pesc. | ${totalLocalidades} Loc. | ${totalEspecies} Esp.`, 245, 158, 11);

  // Side-by-side Tables: Top Species and Top Locations
  const tableSecY = kpiY + 36;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TABELAS COMPARATIVAS DE PRODUÇÃO E ESFORÇO', 15, tableSecY);

  const colW = 86;
  const tableH = 72; // Space for header and 10 rows

  // Left Column Table: Top Species (Top 10)
  const leftColX = 15;
  const tableY = tableSecY + 3;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftColX, tableY, colW, tableH, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('TOP 10 ESPÉCIES PRINCIPAIS POR CAPTURA (t)', leftColX + 4, tableY + 5);

  const leftHeaders = [
    { text: 'Espécie Popular', x: leftColX + 4 },
    { text: 'Volume (t)', x: leftColX + 54, align: 'right' as const },
    { text: 'Faturamento', x: leftColX + 82, align: 'right' as const }
  ];
  drawSubTableHeader(doc, leftColX, tableY + 7, colW, leftHeaders);

  let spRowY = tableY + 13;
  const rowH = 5.2;
  const speciesToRender = sortedSpecies.slice(0, 10);

  speciesToRender.forEach((sp, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(leftColX, spRowY, colW, rowH, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(leftColX, spRowY + rowH, leftColX + colW, spRowY + rowH);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    let name = sp.name;
    if (name.length > 20) name = name.substring(0, 18) + '..';
    doc.text(name, leftColX + 4, spRowY + 3.6);

    doc.setFont('Helvetica', 'normal');
    doc.text((sp.weight / 1000).toFixed(3) + ' t', leftColX + 54, spRowY + 3.6, { align: 'right' });
    
    doc.setFont('Helvetica', 'bold');
    doc.text((sp.revenue >= 1000000 ? `R$ ${(sp.revenue / 1000000).toFixed(2)}M` : `R$ ${(sp.revenue / 1000).toFixed(1)}k`), leftColX + 82, spRowY + 3.6, { align: 'right' });

    spRowY += rowH;
  });

  // Right Column Table: Top Locations (Top 10)
  const rightColX = 109;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(rightColX, tableY, colW, tableH, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('TOP 10 LOCALIDADES POR CAPTURA (t)', rightColX + 4, tableY + 5);

  const rightHeaders = [
    { text: 'Comunidade / Porto', x: rightColX + 4 },
    { text: 'Fichas', x: rightColX + 54, align: 'right' as const },
    { text: 'Volume (t)', x: rightColX + 82, align: 'right' as const }
  ];
  drawSubTableHeader(doc, rightColX, tableY + 7, colW, rightHeaders);

  let locRowY = tableY + 13;
  const locsToRender = sortedLocations.slice(0, 10);

  locsToRender.forEach((loc, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(rightColX, locRowY, colW, rowH, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(rightColX, locRowY + rowH, rightColX + colW, locRowY + rowH);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    let name = loc.name;
    if (name.length > 20) name = name.substring(0, 18) + '..';
    doc.text(name, rightColX + 4, locRowY + 3.6);

    doc.setFont('Helvetica', 'normal');
    doc.text(`${loc.count} f`, rightColX + 54, locRowY + 3.6, { align: 'right' });

    doc.setFont('Helvetica', 'bold');
    doc.text((loc.weight / 1000).toFixed(3) + ' t', rightColX + 82, locRowY + 3.6, { align: 'right' });

    locRowY += rowH;
  });


  // Bottom Section: Gears and Registers
  const bTableSecY = tableY + tableH + 5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ARTES DE PESCA E CONTROLE DE AGENTES REGISTROS', 15, bTableSecY);

  const bTableY = bTableSecY + 3;
  const bTableH = 43; // Space for header and 6 rows

  // Bottom Left: Gears (Top 6)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(leftColX, bTableY, colW, bTableH, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('APETRECHOS / ARTES DE PESCA DETECTADAS', leftColX + 4, bTableY + 5);

  const gearHeaders = [
    { text: 'Arte / Método', x: leftColX + 4 },
    { text: 'Registros', x: leftColX + 54, align: 'right' as const },
    { text: 'Volume (t)', x: leftColX + 82, align: 'right' as const }
  ];
  drawSubTableHeader(doc, leftColX, bTableY + 7, colW, gearHeaders);

  let gearRowY = bTableY + 13;
  const gearsToRender = sortedGears.slice(0, 5);

  gearsToRender.forEach((g, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(leftColX, gearRowY, colW, rowH, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(leftColX, gearRowY + rowH, leftColX + colW, gearRowY + rowH);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    let name = g.name;
    if (name.length > 20) name = name.substring(0, 18) + '..';
    doc.text(name, leftColX + 4, gearRowY + 3.6);

    doc.setFont('Helvetica', 'normal');
    doc.text(`${g.count} saídas`, leftColX + 54, gearRowY + 3.6, { align: 'right' });

    doc.setFont('Helvetica', 'bold');
    doc.text((g.weight / 1000).toFixed(3) + ' t', leftColX + 82, gearRowY + 3.6, { align: 'right' });

    gearRowY += rowH;
  });

  // Bottom Right: Ranking de Digitadores / Coletores
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(rightColX, bTableY, colW, bTableH, 'FD');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('PRODUTIVIDADE DE REGISTROS DE CAMPO', rightColX + 4, bTableY + 5);

  const regHeaders = [
    { text: 'Agente / Digitador', x: rightColX + 4 },
    { text: 'Fichas Digitadas', x: rightColX + 82, align: 'right' as const }
  ];
  drawSubTableHeader(doc, rightColX, bTableY + 7, colW, regHeaders);

  let regRowY = bTableY + 13;
  const collectorsToRender = sortedCollectors.slice(0, 5);

  collectorsToRender.forEach((col, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(rightColX, regRowY, colW, rowH, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(rightColX, regRowY + rowH, rightColX + colW, regRowY + rowH);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    let name = col.name;
    if (name.length > 24) name = name.substring(0, 22) + '..';
    doc.text(name, rightColX + 4, regRowY + 3.6);

    doc.setFont('Helvetica', 'bold');
    doc.text(`${col.count} formulários`, rightColX + 82, regRowY + 3.6, { align: 'right' });

    regRowY += rowH;
  });

  drawPageFooter(doc, 1, totalPages);


  // ====================================================
  // === PAGES 2 - 10: ACTUAL GRAPHIC CHARTS IN PNG ===
  // ====================================================

  const pagesDef = [
    {
      title: '1. SÉRIE HISTÓRICA E GEOGRAFIA DE PRODUÇÃO PESQUEIRA',
      charts: [
        { type: 'production_year', title: 'Produção Anual Acumulada (Série Temporal)' },
        { type: 'local', title: 'Produção por Comunidade / Localidade de Desembarque' }
      ]
    },
    {
      title: '2. VARIAÇÃO MENSAL E MÉTODOS DE CAPTURA DE PRODUÇÃO',
      charts: [
        { type: 'month', title: 'Produção Mensal Acumulada (Variação do Exercício)' },
        { type: 'gear', title: 'Produção Pesqueira por Arte / Apetrecho de Pesca' }
      ]
    },
    {
      title: '3. CLASSIFICAÇÃO DE GRUPOS E ESTAÇÕES CLIMÁTICAS',
      charts: [
        { type: 'production_group', title: 'Produção por Grupo de Recursos Recenseados' },
        { type: 'production_season', title: 'Variação da Produção por Estação Climática (Seco x Chuvoso)' }
      ]
    },
    {
      title: '4. SÉRIE HISTÓRICA E PRINCIPAIS RECURSOS DE RECEITA',
      charts: [
        { type: 'revenue_year', title: 'Faturamento Bruto por Ano (Comercialização Estimada)' },
        { type: 'revenue_species', title: 'Top 10 Recursos de Maior Rendimento Financeiro (Receita)' }
      ]
    },
    {
      title: '5. MÉTODOS DE CAPTURA E GEOGRAFIA DE FATURAMENTO',
      charts: [
        { type: 'revenue_gear', title: 'Faturamento Financeiro Bruto por Apetrecho de Pesca' },
        { type: 'revenue_local', title: 'Faturamento Financeiro por Comunidade de Desembarque' }
      ]
    },
    {
      title: '6. FATURAMENTO POR GRUPO E RENDIMENTOS TEMP. DE CPUE',
      charts: [
        { type: 'revenue_group', title: 'Faturamento Financeiro Bruto por Grupo de Recursos' },
        { type: 'cpue_year', title: 'Evolução Temporal do Rendimento de Captura CPUE (kg/dia) por Ano' }
      ]
    },
    {
      title: '7. RENDIMENTO CPUE POR COMUNIDADES E SÉRIES MENSAIS',
      charts: [
        { type: 'cpue_local', title: 'Rendimento de Captura CPUE (Mediana kg/dia) por Comunidade' },
        { type: 'cpue_month', title: 'Variação Sazonal Mensal do Rendimento de Captura CPUE (kg/dia)' }
      ]
    },
    {
      title: '8. RENDIMENTO CPUE POR FATORES CLIMÁTICOS E LUNARES',
      charts: [
        { type: 'cpue_season', title: 'Rendimento de Captura CPUE por Estação Climática' },
        { type: 'cpue_moon', title: 'Rendimento de Captura CPUE por Fase do Ciclo Lunar' }
      ]
    },
    {
      title: '9. RENDIMENTO CPUE POR APETRECHOS E ESPÉCIES DETALHADAS',
      charts: [
        { type: 'cpue_gear', title: 'Rendimento de Captura CPUE por Apetrecho / Método Utilizado' },
        { type: 'cpue_species', title: 'Rendimento CPUE Mediana (kg/dia) para as Top 10 Espécies' }
      ]
    }
  ];

  pagesDef.forEach((pDef, idx) => {
    doc.addPage();
    const currPageNum = idx + 2;

    drawPageHeader(doc, pDef.title);

    // Render stacked charts (2 per page)
    // Chart 1
    drawChartCardInPdf(
      doc,
      15,
      28,
      180,
      112,
      pDef.charts[0].title,
      pDef.charts[0].type
    );

    // Chart 2
    drawChartCardInPdf(
      doc,
      15,
      148,
      180,
      112,
      pDef.charts[1].title,
      pDef.charts[1].type
    );

    drawPageFooter(doc, currPageNum, totalPages);
  });


  // ====================================================
  // === PAGE 11: RECENT FIELD FORMS & CLOSING ===
  // ====================================================
  doc.addPage();
  const page11Num = 11;

  drawPageHeader(doc, '10. HISTÓRICO DE AUDITORIA E ENCERRAMENTO CONSTITUCIONAL');

  // Audit Table header
  const tableY4 = 28;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('REGISTROS INDIVIDUAIS DE CAMPO RECENTES (AUDITORIA)', 15, tableY4);

  const formHeaders = [
    { text: 'Código Ficha', x: 18 },
    { text: 'Data Chegada', x: 42 },
    { text: 'Porto / Comunidade', x: 67 },
    { text: 'Pescador Titular', x: 105 },
    { text: 'Arte / Apetrecho', x: 154 },
    { text: 'Peso Total (kg)', x: 192, align: 'right' as const }
  ];
  drawSubTableHeader(doc, 15, tableY4 + 2, 180, formHeaders);
  
  let formRowY = tableY4 + 8;
  const formRowH = 6;

  // Take the most recent 16 forms for full auditing
  const recentFormsList = [...data]
    .sort((a, b) => {
      const dateA = a.fishing?.arrivalDate || a.createdAt || '';
      const dateB = b.fishing?.arrivalDate || b.createdAt || '';
      return dateB.localeCompare(dateA);
    })
    .slice(0, 16);

  recentFormsList.forEach((form, fIdx) => {
    if (fIdx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(15, formRowY, 180, formRowH, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(15, formRowY + formRowH, 195, formRowY + formRowH);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(form.idNumber || 'S/N', 18, formRowY + 4);

    doc.setFont('Helvetica', 'normal');
    const dStr = form.fishing?.arrivalDate 
      ? form.fishing.arrivalDate.split('-').reverse().join('/') 
        : (form.createdAt ? new Date(form.createdAt).toLocaleDateString('pt-BR') : '-');
    doc.text(dStr, 42, formRowY + 4);

    let loc = form.identification?.location || '-';
    if (loc.length > 20) loc = loc.substring(0, 18) + '..';
    doc.text(loc, 67, formRowY + 4);

    let fisher = form.identification?.fishermanName || '-';
    if (fisher.length > 25) fisher = fisher.substring(0, 23) + '..';
    doc.text(fisher, 105, formRowY + 4);

    let gear = form.fishing?.gearType || '-';
    if (gear.length > 20) gear = gear.substring(0, 18) + '..';
    doc.text(gear, 154, formRowY + 4);

    const w = form.production?.reduce((sum, p) => sum + (p.weight || 0), 0) || 0;
    doc.setFont('Helvetica', 'bold');
    doc.text(formatKg(w), 192, formRowY + 4, { align: 'right' });

    formRowY += formRowH;
  });

  // Institutional closing statement
  const closingY = formRowY + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, closingY, 180, 20, 'FD');

  doc.setFillColor(42, 92, 170); // Accent left bar
  doc.rect(15, closingY, 1.2, 20, 'F');

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const closingText = 'DECLARAÇÃO DE CONFORMIDADE: Este relatório estatístico consolida os dados de monitoramento e pesquisa de desembarque pesqueiro artesanal coletados e auditados no Estado do Piauí. Os registros estruturados apoiam o ordenamento pesqueiro, os planos locais de sustentabilidade estuarina e marinha, e a comprovação de esforço de pesca artesanal para fins de fomento, seguridade social e políticas públicas federais do Ministério da Pesca e Aquicultura.';
  const textLines = doc.splitTextToSize(closingText, 172);
  doc.text(textLines, 19, closingY + 4.5);

  // Signatures at the bottom
  const sigY = closingY + 42;
  doc.setDrawColor(203, 213, 225);
  doc.line(25, sigY, 95, sigY);
  doc.line(115, sigY, 185, sigY);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('COORDENAÇÃO DE INFORMAÇÕES PESQUEIRAS E ESTATÍSTICA', 60, sigY + 4.2, { align: 'center' });
  doc.text('SUPERINTENDÊNCIA FEDERAL DA PESCA E AQUICULTURA NO PIAUÍ', 150, sigY + 4.2, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Secretaria de Registro, Monitoramento e Pesquisa - SFP PI', 60, sigY + 6.8, { align: 'center' });
  doc.text('Ministério da Pesca e Aquicultura - Governo Federal', 150, sigY + 6.8, { align: 'center' });

  drawPageFooter(doc, page11Num, totalPages);

  // Save with dynamic name representing the current filter and date
  const formattedDate = now.toISOString().split('T')[0];
  doc.save(`MPA_Piaui_Boletim_Estatistico_${formattedDate}.pdf`);
};
