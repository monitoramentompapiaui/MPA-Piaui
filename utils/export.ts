
import * as XLSX from 'xlsx';
import { LandingForm } from '../types';
import { getGeneralGearType } from './gearUtils';
import { parseToISODate } from './dateUtils';

const excelDateToJSDate = (serial: any): string => {
  if (!serial) return '';
  if (typeof serial === 'string') return parseToISODate(serial);
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
};

export const exportToExcel = (data: LandingForm[], filename: string) => {
  if (data.length === 0) return;

  const rows = data.flatMap(form => {
    const base = {
      // Identificação
      'Ficha N.': form.idNumber || '-',
      'ID Interno': form.id || '-',
      'Local': form.identification.location || '-',
      'Coletor': form.identification.collectorName || '-',
      'Ano': form.identification.year || '-',
      'Mês': form.identification.month || '-',
      'Período (Estação)': form.identification.period || '-',
      'Pescador / Proprietário': form.identification.fishermanName || '-',
      'Nome da Embarcação': form.identification.vesselName || '-',
      'Pesqueiro / Local de Captura': form.identification.fishingGround || '-',

      // Pescaria
      'Tipo da Embarcação': form.fishing.vesselType || '-',
      'Tipo de Propulsão': form.fishing.propulsionType || '-',
      'N° de Pescadores': form.fishing.fisherCount !== undefined ? form.fishing.fisherCount : '-',
      'Fase da Lua': form.fishing.moonPhase || '-',
      'Data de Saída': form.fishing.departureDate || '-',
      'Data de Chegada': form.fishing.arrivalDate || '-',
      'Dias de Pescaria': form.fishing.fishingDays !== undefined ? form.fishing.fishingDays : '-',
      'Arte de Pesca': form.fishing.gearType || '-',
      'Arte de Pesca Geral': form.fishing.gearTypeGeneral || '-',

      // Arte de Pesca Específica (Colunas Agrupadas Lado a Lado por Nome do Apetrecho)
      'Rede de Emalhe: Comprimento (m)': form.gear?.length || '-',
      'Rede de Emalhe: Altura (m)': form.gear?.height || '-',
      'Rede de Emalhe: Tamanho da Malha': form.gear?.meshSize || '-',

      'Linha de Mão: N° de Anzóis': form.gear?.hookCount || '-',
      'Linha de Mão: Tamanho do Anzol': form.gear?.hookSize || '-',

      'Armadilha: N° de Armadilhas': form.gear?.trapCount || '-',

      'Jequi: Malha de Sangra (cm)': form.gear?.jequiBleedingMesh || '-',

      'Arrasto de Fundo: Comprimento da Rede (m)': form.gear?.netLength || '-',
      'Arrasto de Fundo: Altura da Boca (m)': form.gear?.mouthHeight || '-',
      'Arrasto de Fundo: Tamanho da Malha (mm)': form.gear?.trawlMeshSize || '-',
    };

    if (!form.production || form.production.length === 0) {
      return [{
        ...base,
        'Espécie': '-',
        'Nome Científico': '-',
        'Peso Total (Kg)': 0,
        'Preço de Venda (R$/Kg)': 0,
        'Receita Estimada (R$)': 0,
        'Grupo Especial': '-',
        'N° de Cordas': '-',
        'Exemplares por Corda': '-',
        'Peso Individual do Exemplar (kg)': '-',
        'N° de Sacos': '-',
        'Peso do Saco (kg)': '-',
        'Rendimento da Polpa (kg)': '-',
        'Preço Unitário Original (R$)': '-'
      }];
    }

    return form.production.map(item => ({
      ...base,
      'Espécie': item.species || '-',
      'Nome Científico': item.scientificName || '-',
      'Peso Total (Kg)': item.weight !== undefined ? item.weight : 0,
      'Preço de Venda (R$/Kg)': item.price !== undefined ? item.price : 0,
      'Receita Estimada (R$)': (item.weight !== undefined && item.price !== undefined) ? (item.weight * item.price) : 0,
      'Grupo Especial': item.groupType || '-',
      'N° de Cordas': item.numCordas !== undefined ? item.numCordas : '-',
      'Exemplares por Corda': item.numExemplares !== undefined ? item.numExemplares : '-',
      'Peso Individual do Exemplar (kg)': item.pesoIndividual !== undefined ? item.pesoIndividual : '-',
      'N° de Sacos': item.numSacos !== undefined ? item.numSacos : '-',
      'Peso do Saco (kg)': item.pesoSaco !== undefined ? item.pesoSaco : '-',
      'Rendimento da Polpa (kg)': item.rendimentoPolpa !== undefined ? item.rendimentoPolpa : '-',
      'Preço Unitário Original (R$)': item.originalPrice !== undefined ? item.originalPrice : '-'
    }));
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Desembarques");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const importFromExcel = (file: File): Promise<LandingForm[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (json.length === 0) {
          resolve([]);
          return;
        }

        const formsMap = new Map<string, LandingForm>();

        json.forEach((row, index) => {
          const fichaId = row['Ficha N.']?.toString() || row['Ficha (N °)']?.toString() || `IMPORT-${index}`;
          const collector = row['Coletor'] || 'N/A';
          const arrival = excelDateToJSDate(row['Data Chegada'] || row['Data de Chegada']);
          const groupKey = `${fichaId}-${collector}-${arrival}`;

          if (!formsMap.has(groupKey)) {
            formsMap.set(groupKey, {
              id: crypto.randomUUID(),
              idNumber: fichaId,
              createdAt: new Date().toISOString(),
              identification: {
                collectorName: collector,
                location: row['Local'] || '',
                fishingGround: row['Pesqueiro'] || '',
                year: parseInt(row['Ano']) || new Date().getFullYear(),
                month: row['Mes'] || row['Mês'] || '',
                fishermanName: row['Proprietário'] || row['Proprietario'] || row['Pescador'] || '',
                vesselName: row['Nome Embarcacao'] || row['Nome Embarcação'] || ''
              },
              fishing: {
                vesselType: row['Embarcacao'] || row['Tipo da embarcação'] || '',
                propulsionType: '',
                fisherCount: parseInt(row['Num Pescadores'] || row['N° de pescadores']) || 0,
                gearType: String(row['Arte Pesca'] || row['Arte de Pesca'] || 'Tarrafa'),
                gearTypeGeneral: getGeneralGearType(String(row['Arte Pesca'] || row['Arte de Pesca'] || 'Tarrafa')),
                departureDate: excelDateToJSDate(row['Data Saida'] || row['Data de Saída']),
                arrivalDate: arrival,
                fishingDays: parseInt(row['Dias Pescaria'] || row['Dias de Pescaria']) || 0,
                moonPhase: row['Fase Lua'] || row['Fase da Lua'] || ''
              },
              gear: {
                meshSize: row['Rede de Emalhe: Tamanho da Malha'] || row['Apetrecho: Tamanho da Malha'] || '',
                height: row['Rede de Emalhe: Altura (m)'] && row['Rede de Emalhe: Altura (m)'] !== '-' ? String(row['Rede de Emalhe: Altura (m)']) : (row['Apetrecho: Altura (m)'] && row['Apetrecho: Altura (m)'] !== '-' ? String(row['Apetrecho: Altura (m)']) : ''),
                length: row['Rede de Emalhe: Comprimento (m)'] && row['Rede de Emalhe: Comprimento (m)'] !== '-' ? String(row['Rede de Emalhe: Comprimento (m)']) : (row['Apetrecho: Comprimento (m)'] && row['Apetrecho: Comprimento (m)'] !== '-' ? String(row['Apetrecho: Comprimento (m)']) : ''),
                hookCount: row['Linha de Mão: N° de Anzóis'] && row['Linha de Mão: N° de Anzóis'] !== '-' ? String(row['Linha de Mão: N° de Anzóis']) : (row['Apetrecho: N° de Anzóis'] && row['Apetrecho: N° de Anzóis'] !== '-' ? String(row['Apetrecho: N° de Anzóis']) : ''),
                trapCount: row['Armadilha: N° de Armadilhas'] && row['Armadilha: N° de Armadilhas'] !== '-' ? String(row['Armadilha: N° de Armadilhas']) : (row['Apetrecho: N° de Armadilhas'] && row['Apetrecho: N° de Armadilhas'] !== '-' ? String(row['Apetrecho: N° de Armadilhas']) : ''),
                jequiBleedingMesh: row['Jequi: Malha de Sangra (cm)'] && row['Jequi: Malha de Sangra (cm)'] !== '-' ? String(row['Jequi: Malha de Sangra (cm)']) : '',
                hookSize: row['Linha de Mão: Tamanho do Anzol'] || row['Linha: Tamanho do Anzol'] || '',
                netLength: row['Arrasto de Fundo: Comprimento da Rede (m)'] && row['Arrasto de Fundo: Comprimento da Rede (m)'] !== '-' ? String(row['Arrasto de Fundo: Comprimento da Rede (m)']) : (row['Arrasto: Comprimento da Rede (m)'] && row['Arrasto: Comprimento da Rede (m)'] !== '-' ? String(row['Arrasto: Comprimento da Rede (m)']) : ''),
                mouthHeight: row['Arrasto de Fundo: Altura da Boca (m)'] && row['Arrasto de Fundo: Altura da Boca (m)'] !== '-' ? String(row['Arrasto de Fundo: Altura da Boca (m)']) : (row['Arrasto: Altura da Boca (m)'] && row['Arrasto: Altura da Boca (m)'] !== '-' ? String(row['Arrasto: Altura da Boca (m)']) : ''),
                trawlMeshSize: row['Arrasto de Fundo: Tamanho da Malha (mm)'] || row['Arrasto: Tamanho da Malha (mm)'] || ''
              },
              production: []
            });
          }

          const currentForm = formsMap.get(groupKey)!;
          const speciesName = row['Especie'] || row['Espécie'] || 'Importado';
          const scientificName = row['Nome Cientifico'] || row['Nome Científico'] || '';
          const weight = parseFloat(row['Peso Total (Kg)'] || row['Peso (Kg)'] || row['Produção (Kg)']);
          const price = parseFloat(row['Preço de Venda (R$/Kg)'] || row['Preço (R$/Kg)'] || '0');
          const revenue = parseFloat(row['Receita Estimada (R$)'] || row['Receita (RS)'] || row['Receita (R$)']);

          const groupType = row['Grupo Especial'] !== '-' ? row['Grupo Especial'] : undefined;
          const numCordas = row['N° de Cordas'] !== undefined && row['N° de Cordas'] !== '-' ? parseInt(row['N° de Cordas']) : undefined;
          const numExemplares = row['Exemplares por Corda'] !== undefined && row['Exemplares por Corda'] !== '-' ? parseInt(row['Exemplares por Corda']) : undefined;
          const pesoIndividual = row['Peso Individual do Exemplar (kg)'] !== undefined && row['Peso Individual do Exemplar (kg)'] !== '-' ? parseFloat(row['Peso Individual do Exemplar (kg)']) : undefined;
          const numSacos = row['N° de Sacos'] !== undefined && row['N° de Sacos'] !== '-' ? parseInt(row['N° de Sacos']) : undefined;
          const pesoSaco = row['Peso do Saco (kg)'] !== undefined && row['Peso do Saco (kg)'] !== '-' ? parseFloat(row['Peso do Saco (kg)']) : undefined;
          const rendimentoPolpa = row['Rendimento da Polpa (kg)'] !== undefined && row['Rendimento da Polpa (kg)'] !== '-' ? parseFloat(row['Rendimento da Polpa (kg)']) : undefined;
          const originalPrice = row['Preço Unitário Original (R$)'] !== undefined && row['Preço Unitário Original (R$)'] !== '-' ? parseFloat(row['Preço Unitário Original (R$)']) : undefined;

          if (!isNaN(weight) && weight > 0) {
            currentForm.production.push({
              id: crypto.randomUUID(),
              species: speciesName,
              scientificName: scientificName,
              weight: weight,
              price: !isNaN(price) && price > 0 ? price : (!isNaN(revenue) ? (revenue / weight) : 0),
              groupType,
              numCordas,
              numExemplares,
              pesoIndividual,
              numSacos,
              pesoSaco,
              rendimentoPolpa,
              originalPrice
            });
          }
        });

        resolve(Array.from(formsMap.values()));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
