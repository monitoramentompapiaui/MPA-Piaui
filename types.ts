
export enum GearType {
  TARRAFA = 'Tarrafa',
  REDE_EMALHE = 'Rede de emalhe',
  ESPINHEL = 'Espinhel',
  ARMADILHA = 'Armadilha'
}

export interface ProductionItem {
  id: string;
  species: string;
  scientificName?: string;
  weight: number;
  price: number;
  groupType?: 'caranguejo_siri' | 'ostra' | 'marisco' | 'default';
  numCordas?: number;
  numExemplares?: number;
  pesoIndividual?: number;
  numSacos?: number;
  pesoSaco?: number;
  rendimentoPolpa?: number;
  originalPrice?: number;
}

export interface IdentificationData {
  collectorName: string;
  location: string;
  fishingGround?: string; // "Pesqueiro"
  year: number;
  month: string;
  fishermanName?: string; // "Proprietário"
  vesselName?: string; // "Nome da Embarcação"
  period?: string; // "Período" (seco / chuvoso)
  isManualEntry?: boolean; // Diferencial para identificar cadastros manuais individuais
  createdByEmail?: string;
  createdByUsername?: string;
}

export interface FishingData {
  vesselType: string;
  propulsionType: string;
  fisherCount: number;
  gearType: string; // Suporta digitação livre (arte específica)
  gearTypeGeneral?: string; // Arte de pesca geral preenchida automaticamente
  departureDate: string;
  arrivalDate: string;
  fishingDays: number;
  moonPhase: string;
}

export interface GearDetails {
  meshSize?: string;
  height?: string;
  length?: string;
  hookCount?: string;
  trapCount?: string;
  jequiBleedingMesh?: string;
  hookSize?: string;
  netLength?: string;
  mouthHeight?: string;
  trawlMeshSize?: string;
}

export interface LandingForm {
  id: string;
  idNumber?: string; // "Ficha (N°)"
  createdAt: string;
  identification: IdentificationData;
  fishing: FishingData;
  gear: GearDetails;
  production: ProductionItem[];
  isBulkImport?: boolean; // indica se foi importado por lote
  isOfflinePending?: boolean; // indica se está pendente de sincronização offline
}

export interface Fisherman {
  id: string;
  name: string;
  location: string;
  gearType: string; // Suporta digitação livre (arte específica)
  gearTypeGeneral?: string; // Arte de pesca geral preenchida automaticamente
  vesselType: string;
  vesselName?: string;
  propulsionType: string;
  gearDetails: GearDetails;
}

export interface Species {
  id: string;
  commonName: string; // Nome Popular
  scientificName: string; // Nome Científico
  images?: string[]; // URLs de fotos enviadas ao Supabase
  family?: string;
  order?: string;
  group?: string;
  conservationUrl?: string; // Link da espécie no IUCN
  seeMoreUrl?: string; // Link da espécie no FishBase
}

export function isFishermanIncomplete(f: Fisherman): boolean {
  if (
    !f.name || f.name.trim() === '' ||
    !f.location || f.location.trim() === '' || f.location.trim() === '-' || f.location.trim() === 'Não informado' ||
    !f.gearType || f.gearType.trim() === '' || f.gearType.trim() === 'Não informado' ||
    f.vesselType === undefined || f.vesselType.trim() === ''
  ) {
    return true;
  }

  const gtLower = f.gearType.toLowerCase();
  const general = f.gearTypeGeneral || '';

  if (gtLower === 'tarrafa') {
    return !f.gearDetails || !f.gearDetails.length || !f.gearDetails.meshSize || f.gearDetails.meshSize.trim() === '';
  }
  if (gtLower === 'jequi') {
    return !f.gearDetails || !f.gearDetails.trapCount || !f.gearDetails.jequiBleedingMesh;
  }
  if (general === 'Rede de emalhe') {
    return !f.gearDetails || !f.gearDetails.meshSize || !f.gearDetails.length || !f.gearDetails.height;
  }
  if (general === 'Armadilha') {
    return !f.gearDetails || !f.gearDetails.trapCount;
  }
  if (general === 'Linha de mão') {
    return !f.gearDetails || !f.gearDetails.hookCount || !f.gearDetails.length || !f.gearDetails.hookSize || f.gearDetails.hookSize.trim() === '';
  }
  if (general === 'Arrasto de fundo' || gtLower === 'arrasto de fundo') {
    return !f.gearDetails || !f.gearDetails.netLength || !f.gearDetails.mouthHeight || !f.gearDetails.trawlMeshSize || f.gearDetails.trawlMeshSize.trim() === '';
  }

  return false;
}

export function isSpeciesIncomplete(s: Species): boolean {
  return (
    !s.commonName || s.commonName.trim() === '' ||
    !s.scientificName || s.scientificName.trim() === '' || s.scientificName.trim() === 'Não informado' ||
    !s.family || s.family.trim() === '' || s.family.trim() === 'Não informado' ||
    !s.order || s.order.trim() === '' || s.order.trim() === 'Não informado' ||
    !s.group || s.group.trim() === '' || s.group.trim() === 'Não informado' ||
    !s.conservationUrl || s.conservationUrl.trim() === '' ||
    !s.seeMoreUrl || s.seeMoreUrl.trim() === ''
  );
}

