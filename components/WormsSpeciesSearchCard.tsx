import React, { useState, useEffect } from 'react';
import { WormsDistributionMap } from './WormsDistributionMap';
import { 
  Search, 
  HelpCircle, 
  BookOpen, 
  Info, 
  Check, 
  Copy, 
  ExternalLink, 
  ChevronRight, 
  Globe, 
  FileText, 
  Database, 
  X,
  RefreshCw,
  AlertCircle,
  MapPin,
  StickyNote,
  Link2,
  Image as ImageIcon,
  ScrollText,
  Map,
  Sparkles,
  Camera,
  Heart,
  Eye,
  Tag
} from 'lucide-react';

interface AphiaRecord {
  AphiaID: number;
  url: string;
  scientificname: string;
  authority: string;
  taxonRankID: number;
  rank: string;
  status: string;
  unacceptreason: string | null;
  valid_AphiaID: number;
  valid_name: string;
  valid_authority: string;
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  citation: string;
  lsid: string;
  isMarine: number | boolean | null;
  isBrackish: number | boolean | null;
  isFreshwater: number | boolean | null;
  isTerrestrial: number | boolean | null;
  isExtinct: number | boolean | null;
  match_type: string;
  modified: string;
}

interface Vernacular {
  vernacular: string;
  language_code?: string;
  language?: string;
}

interface ReferenceSource {
  source_id: number;
  use: string | null;
  reference: string;
  pdf: string | null;
  url: string | null;
}

interface GeographicDistribution {
  location: string;
  locality: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  decimalLatitude: number | null;
  decimalLongitude: number | null;
  status: string | null;
  establishmentMeans: string | null;
}

interface TaxonNote {
  note: string;
  type: string | null;
}

interface WikiData {
  title: string;
  extract: string;
  imageUrl?: string;
  pageUrl?: string;
  isEnglish?: boolean;
}

// ---------------------------------------------------------
// HIGH-FIDELITY LOCAL HOTSPOT DATA (PROTOTYPE SYSTEM)
// ---------------------------------------------------------
const HOTSPOT_SPECIES: {
  record: AphiaRecord;
  synonyms: AphiaRecord[];
  vernaculars: Vernacular[];
  sources: ReferenceSource[];
  distributions: GeographicDistribution[];
  notes: TaxonNote[];
  wikiData: WikiData;
}[] = [
  {
    record: {
      AphiaID: 107474,
      url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=107474",
      scientificname: "Ucides cordatus",
      authority: "(Linnaeus, 1763)",
      taxonRankID: 220,
      rank: "Species",
      status: "Accepted",
      unacceptreason: null,
      valid_AphiaID: 107474,
      valid_name: "Ucides cordatus",
      valid_authority: "(Linnaeus, 1763)",
      kingdom: "Animalia",
      phylum: "Arthropoda",
      class: "Malacostraca",
      order: "Decapoda",
      family: "Ucididae",
      genus: "Ucides",
      citation: "Linnaeus, C. (1763). Centuria Insectorum... Amoenitates Academicae. 6: 384-415.",
      lsid: "urn:lsid:marinespecies.org:taxname:107474",
      isMarine: true,
      isBrackish: true,
      isFreshwater: false,
      isTerrestrial: false,
      isExtinct: false,
      match_type: "exact",
      modified: "2024-01-15T12:00:00Z"
    },
    synonyms: [
      {
        AphiaID: 241031,
        url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=241031",
        scientificname: "Cancer cordatus",
        authority: "Linnaeus, 1763",
        taxonRankID: 220,
        rank: "Species",
        status: "unaccepted",
        unacceptreason: "Synonym",
        valid_AphiaID: 107474,
        valid_name: "Ucides cordatus",
        valid_authority: "(Linnaeus, 1763)",
        kingdom: "Animalia",
        phylum: "Arthropoda",
        class: "Malacostraca",
        order: "Decapoda",
        family: "Ucididae",
        genus: "Ucides",
        citation: "",
        lsid: "urn:lsid:marinespecies.org:taxname:241031",
        isMarine: true,
        isBrackish: true,
        isFreshwater: false,
        isTerrestrial: false,
        isExtinct: false,
        match_type: "exact",
        modified: "2020-01-01"
      }
    ],
    vernaculars: [
      { vernacular: "Caranguejo-uçá", language: "Portuguese", language_code: "pt" },
      { vernacular: "Uçá", language: "Portuguese", language_code: "pt" },
      { vernacular: "Ghost Crab", language: "English", language_code: "en" }
    ],
    sources: [
      {
        source_id: 45612,
        use: "original description",
        reference: "Linnaeus, C. (1763). Amoenitates Academicae, Holmiae.",
        pdf: null,
        url: "https://www.marinespecies.org/aphia.php?p=sourcedetails&id=45612"
      },
      {
        source_id: 102911,
        use: "ecology",
        reference: "Melo, G. A. S. (1996). Manual de identificação dos Brachyura (caranguejos e siris) do litoral brasileiro. Plêiade, São Paulo.",
        pdf: null,
        url: null
      }
    ],
    distributions: [
      {
        location: "Delta do Parnaíba, Piauí",
        locality: "Manguezais costeiros",
        country: "Brasil",
        latitude: -2.85,
        longitude: -41.8,
        decimalLatitude: -2.85,
        decimalLongitude: -41.8,
        status: "native",
        establishmentMeans: "native"
      },
      {
        location: "Costa do Nordeste",
        locality: "Zonas estuarinas de mangue",
        country: "Brasil",
        latitude: -8.0,
        longitude: -35.0,
        decimalLatitude: -8.0,
        decimalLongitude: -35.0,
        status: "native",
        establishmentMeans: "native"
      }
    ],
    notes: [
      {
        type: "Ecologia",
        note: "Espécie bioindicadora de extrema relevância ecológica para os biomas de manguezal brasileiros. Alimenta-se principalmente de folhas em decomposição de Rhizophora mangle."
      }
    ],
    wikiData: {
      title: "Ucides cordatus",
      extract: "O caranguejo-uçá (Ucides cordatus) é um crustáceo decápode da família dos ucidídeos. É uma espécie muito importante para a pesca de subsistência e comercial nos manguezais do litoral do Piauí e de todo o Nordeste brasileiro. Habita galerias profundas escavadas na lama entre as raízes do manguezal.",
      imageUrl: "https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&q=80&w=1200",
      pageUrl: "https://pt.wikipedia.org/wiki/Caranguejo-u%C3%A7%C3%A1"
    }
  },
  {
    record: {
      AphiaID: 514112,
      url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=514112",
      scientificname: "Litopenaeus schmitti",
      authority: "(Burkenroad, 1936)",
      taxonRankID: 220,
      rank: "Species",
      status: "Accepted",
      unacceptreason: null,
      valid_AphiaID: 514112,
      valid_name: "Litopenaeus schmitti",
      valid_authority: "(Burkenroad, 1936)",
      kingdom: "Animalia",
      phylum: "Arthropoda",
      class: "Malacostraca",
      order: "Decapoda",
      family: "Penaeidae",
      genus: "Litopenaeus",
      citation: "Burkenroad, M. D. (1936). A new species of Penaeus from the American Atlantic... Annals of the New York Academy of Sciences.",
      lsid: "urn:lsid:marinespecies.org:taxname:514112",
      isMarine: true,
      isBrackish: true,
      isFreshwater: false,
      isTerrestrial: false,
      isExtinct: false,
      match_type: "exact",
      modified: "2023-08-10T15:30:00Z"
    },
    synonyms: [
      {
        AphiaID: 158334,
        url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=158334",
        scientificname: "Penaeus schmitti",
        authority: "Burkenroad, 1936",
        taxonRankID: 220,
        rank: "Species",
        status: "unaccepted",
        unacceptreason: "Alternate representation",
        valid_AphiaID: 514112,
        valid_name: "Litopenaeus schmitti",
        valid_authority: "(Burkenroad, 1936)",
        kingdom: "Animalia",
        phylum: "Arthropoda",
        class: "Malacostraca",
        order: "Decapoda",
        family: "Penaeidae",
        genus: "Litopenaeus",
        citation: "",
        lsid: "urn:lsid:marinespecies.org:taxname:158334",
        isMarine: true,
        isBrackish: true,
        isFreshwater: false,
        isTerrestrial: false,
        isExtinct: false,
        match_type: "exact",
        modified: "2018-05-12"
      }
    ],
    vernaculars: [
      { vernacular: "Camarão-branco", language: "Portuguese", language_code: "pt" },
      { vernacular: "White Shrimp", language: "English", language_code: "en" }
    ],
    sources: [
      {
        source_id: 74512,
        use: "systematics",
        reference: "Pérez Farfante, I. & Kensley, B. (1997). Penaeoid and Sergestoid Shrimps and Prawns of the World. Muséum National d'Histoire Naturelle, Paris.",
        pdf: null,
        url: null
      }
    ],
    distributions: [
      {
        location: "Plataforma Continental do Piauí",
        locality: "Fundos de areia e lama",
        country: "Brasil",
        latitude: -2.7,
        longitude: -41.5,
        decimalLatitude: -2.7,
        decimalLongitude: -41.5,
        status: "native",
        establishmentMeans: "native"
      }
    ],
    notes: [
      {
        type: "Importância Comercial",
        note: "Altamente comercializado pela pesca artesanal arrastoeira e motorizada ao longo da costa piauiense, constituindo pilar de faturamento das colônias Z-1 e Z-2."
      }
    ],
    wikiData: {
      title: "Litopenaeus schmitti",
      extract: "Litopenaeus schmitti, conhecido popularmente como camarão-branco, é uma espécie de crustáceo decápode amplamente distribuída no Atlântico Ocidental tropical, habitando águas costeiras rasas com fundos arenosos ou lodosos. É um recurso pesqueiro de enorme valor econômico e de farta ocorrência nas capturas pesqueiras piauienses.",
      imageUrl: "https://images.unsplash.com/photo-1559742811-82410b510405?auto=format&fit=crop&q=80&w=1200",
      pageUrl: "https://en.wikipedia.org/wiki/Litopenaeus_schmitti"
    }
  },
  {
    record: {
      AphiaID: 506165,
      url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=506165",
      scientificname: "Anomalocardia flexuosa",
      authority: "(Linnaeus, 1767)",
      taxonRankID: 220,
      rank: "Species",
      status: "Accepted",
      unacceptreason: null,
      valid_AphiaID: 506165,
      valid_name: "Anomalocardia flexuosa",
      valid_authority: "(Linnaeus, 1767)",
      kingdom: "Animalia",
      phylum: "Mollusca",
      class: "Bivalvia",
      order: "Venerida",
      family: "Veneridae",
      genus: "Anomalocardia",
      citation: "Linnaeus, C. (1767). Systema Naturae... reformata. Holmiae.",
      lsid: "urn:lsid:marinespecies.org:taxname:506165",
      isMarine: true,
      isBrackish: true,
      isFreshwater: false,
      isTerrestrial: false,
      isExtinct: false,
      match_type: "exact",
      modified: "2022-11-20T09:15:00Z"
    },
    synonyms: [
      {
        AphiaID: 345112,
        url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=345112",
        scientificname: "Anomalocardia brasiliana",
        authority: "(Gmelin, 1791)",
        taxonRankID: 220,
        rank: "Species",
        status: "unaccepted",
        unacceptreason: "Synonym",
        valid_AphiaID: 506165,
        valid_name: "Anomalocardia flexuosa",
        valid_authority: "(Linnaeus, 1767)",
        kingdom: "Animalia",
        phylum: "Mollusca",
        class: "Bivalvia",
        order: "Venerida",
        family: "Veneridae",
        genus: "Anomalocardia",
        citation: "",
        lsid: "urn:lsid:marinespecies.org:taxname:345112",
        isMarine: true,
        isBrackish: true,
        isFreshwater: false,
        isTerrestrial: false,
        isExtinct: false,
        match_type: "exact",
        modified: "2015-02-10"
      }
    ],
    vernaculars: [
      { vernacular: "Sururu", language: "Portuguese", language_code: "pt" },
      { vernacular: "Marisco", language: "Portuguese", language_code: "pt" },
      { vernacular: "West Indian Venus Clam", language: "English", language_code: "en" }
    ],
    sources: [
      {
        source_id: 11234,
        use: "nomenclature",
        reference: "Huber, M. (2010). Compendium of bivalves. ConchBooks, Hackenheim.",
        pdf: null,
        url: null
      }
    ],
    distributions: [
      {
        location: "Estuário do Rio Igaraçu, Parnaíba",
        locality: "Bancos de areia-lodo estuarinos",
        country: "Brasil",
        latitude: -2.89,
        longitude: -41.76,
        decimalLatitude: -2.89,
        decimalLongitude: -41.76,
        status: "native",
        establishmentMeans: "native"
      }
    ],
    notes: [
      {
        type: "Importância Social",
        note: "Base da alimentação familiar e fonte de renda de centenas de marisqueiras tradicionais do litoral piauiense. Altamente resiliente a variações de salinidade nos estuários."
      }
    ],
    wikiData: {
      title: "Anomalocardia flexuosa",
      extract: "O sururu (Anomalocardia flexuosa), anteriormente conhecido cientificamente como Anomalocardia brasiliana, é um molusco bivalve marinho-estuarino da família Veneridae. É um organismo filtrador que vive semi-enterrado em fundos lodosos ou arenosos, apresentando extraordinária relevância econômica e gastronômica regional no Nordeste brasileiro.",
      imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=1200",
      pageUrl: "https://pt.wikipedia.org/wiki/Sururu"
    }
  },
  {
    record: {
      AphiaID: 272554,
      url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=272554",
      scientificname: "Lutjanus purpureus",
      authority: "Poey, 1866",
      taxonRankID: 220,
      rank: "Species",
      status: "Accepted",
      unacceptreason: null,
      valid_AphiaID: 272554,
      valid_name: "Lutjanus purpureus",
      valid_authority: "Poey, 1866",
      kingdom: "Animalia",
      phylum: "Chordata",
      class: "Actinopterygii",
      order: "Perciformes",
      family: "Lutjanidae",
      genus: "Lutjanus",
      citation: "Poey, F. (1866). Repertorio fisico-natural de la isla de Cuba. Havane.",
      lsid: "urn:lsid:marinespecies.org:taxname:272554",
      isMarine: true,
      isBrackish: false,
      isFreshwater: false,
      isTerrestrial: false,
      isExtinct: false,
      match_type: "exact",
      modified: "2021-06-18T10:00:00Z"
    },
    synonyms: [
      {
        AphiaID: 301223,
        url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=301223",
        scientificname: "Mesoprion purpureus",
        authority: "Poey, 1866",
        taxonRankID: 220,
        rank: "Species",
        status: "unaccepted",
        unacceptreason: "Synonym",
        valid_AphiaID: 272554,
        valid_name: "Lutjanus purpureus",
        valid_authority: "Poey, 1866",
        kingdom: "Animalia",
        phylum: "Chordata",
        class: "Actinopterygii",
        order: "Perciformes",
        family: "Lutjanidae",
        genus: "Lutjanus",
        citation: "",
        lsid: "urn:lsid:marinespecies.org:taxname:301223",
        isMarine: true,
        isBrackish: false,
        isFreshwater: false,
        isTerrestrial: false,
        isExtinct: false,
        match_type: "exact",
        modified: "2010-05-01"
      }
    ],
    vernaculars: [
      { vernacular: "Pargo-verdadeiro", language: "Portuguese", language_code: "pt" },
      { vernacular: "Pargo", language: "Portuguese", language_code: "pt" },
      { vernacular: "Red Snapper", language: "English", language_code: "en" }
    ],
    sources: [
      {
        source_id: 39123,
        use: "taxonomy",
        reference: "Allen, G. R. (1985). FAO Species Catalogue. Vol. 6. Snappers of the world. FAO, Rome.",
        pdf: null,
        url: null
      }
    ],
    distributions: [
      {
        location: "Costa Norte do Brasil (PI/CE)",
        locality: "Zonas rochosas e recifais profundas",
        country: "Brasil",
        latitude: -1.5,
        longitude: -40.5,
        decimalLatitude: -1.5,
        decimalLongitude: -40.5,
        status: "native",
        establishmentMeans: "native"
      }
    ],
    notes: [
      {
        type: "Hábitat e Biologia",
        note: "Peixe demersal marinho que habita fundos rochosos profundos (conhecidos regionalmente como 'cabeços'). É um predador voraz e um dos peixes mais exportados da região."
      }
    ],
    wikiData: {
      title: "Lutjanus purpureus",
      extract: "O pargo-verdadeiro (Lutjanus purpureus) é uma espécie de peixe marinho de águas profundas pertencente à prestigiosa família dos lutjanídeos. Amplamente valorizado pela pesca de linha e pargueira, é característico pela sua coloração vermelha intensa e carne de excelente qualidade, sendo um dos principais produtos da pauta de exportações de pescado do norte e nordeste brasileiro.",
      imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=1200",
      pageUrl: "https://pt.wikipedia.org/wiki/Lutjanus_purpureus"
    }
  },
  {
    record: {
      AphiaID: 159416,
      url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=159416",
      scientificname: "Mugil curema",
      authority: "Valenciennes, 1836",
      taxonRankID: 220,
      rank: "Species",
      status: "Accepted",
      unacceptreason: null,
      valid_AphiaID: 159416,
      valid_name: "Mugil curema",
      valid_authority: "Valenciennes, 1836",
      kingdom: "Animalia",
      phylum: "Chordata",
      class: "Actinopterygii",
      order: "Mugiliformes",
      family: "Mugilidae",
      genus: "Mugil",
      citation: "Valenciennes, A. (1836). In: Cuvier, G. & Valenciennes, A. (1836). Histoire naturelle des poissons.",
      lsid: "urn:lsid:marinespecies.org:taxname:159416",
      isMarine: true,
      isBrackish: true,
      isFreshwater: false,
      isTerrestrial: false,
      isExtinct: false,
      match_type: "exact",
      modified: "2023-01-20T10:00:00Z"
    },
    synonyms: [
      {
        AphiaID: 275811,
        url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=275811",
        scientificname: "Mugil curema curema",
        authority: "Valenciennes, 1836",
        taxonRankID: 220,
        rank: "Species",
        status: "unaccepted",
        unacceptreason: "Synonym",
        valid_AphiaID: 159416,
        valid_name: "Mugil curema",
        valid_authority: "Valenciennes, 1836",
        kingdom: "Animalia",
        phylum: "Chordata",
        class: "Actinopterygii",
        order: "Mugiliformes",
        family: "Mugilidae",
        genus: "Mugil",
        citation: "",
        lsid: "urn:lsid:marinespecies.org:taxname:275811",
        isMarine: true,
        isBrackish: true,
        isFreshwater: false,
        isTerrestrial: false,
        isExtinct: false,
        match_type: "exact",
        modified: "2018-02-15"
      }
    ],
    vernaculars: [
      { vernacular: "Tainha", language: "Portuguese", language_code: "pt" },
      { vernacular: "Tainha-curimã", language: "Portuguese", language_code: "pt" },
      { vernacular: "Parati", language: "Portuguese", language_code: "pt" },
      { vernacular: "White mullet", language: "English", language_code: "en" }
    ],
    sources: [
      {
        source_id: 88123,
        use: "original description",
        reference: "Cuvier, G. & Valenciennes, A. (1836). Histoire naturelle des poissons. Tome onzième.",
        pdf: null,
        url: null
      }
    ],
    distributions: [
      {
        location: "Costa e Estuários do Piauí",
        locality: "Zonas rasas estuarinas e costeiras",
        country: "Brasil",
        latitude: -2.9,
        longitude: -41.7,
        decimalLatitude: -2.9,
        decimalLongitude: -41.7,
        status: "native",
        establishmentMeans: "native"
      }
    ],
    notes: [
      {
        type: "Ecologia",
        note: "Espécie catádroma de grande abundância nos canais de maré e áreas estuarinas do Piauí, servindo de base para a pesca artesanal de tarrafa e rede de emaranhar."
      }
    ],
    wikiData: {
      title: "Mugil curema",
      extract: "Mugil curema Valenciennes, 1836, popularmente conhecido como tainha, parati, curimã ou parati-olho-de-fogo, é um peixe marinho estuarino da família Mugilidae. Apresenta corpo cilíndrico, coloração prateada e excelente adaptabilidade a variações de salinidade. É um recurso pesqueiro de enorme relevância socioeconômica e gastronômica na região norte do Brasil, especialmente no estado do Piauí.",
      imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=1200",
      pageUrl: "https://pt.wikipedia.org/wiki/Mugil_curema"
    }
  }
];

// Utility to fetch resource safely translating 204 to empty array
const fetchResource = async <T,>(url: string): Promise<T[]> => {
  try {
    const res = await fetch(url);
    if (res.status === 204) return [];
    if (!res.ok) return [];
    const data = await res.json();
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  } catch (e) {
    console.warn(`Error fetching resource from ${url}:`, e);
    return [];
  }
};

export const WormsSpeciesSearchCard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AphiaRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AphiaRecord | null>(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'synonyms' | 'vernaculars' | 'sources' | 'distributions' | 'notes' | 'links' | 'images'>('overview');
  
  // Rich data states
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [synonyms, setSynonyms] = useState<AphiaRecord[]>([]);
  const [vernaculars, setVernaculars] = useState<Vernacular[]>([]);
  const [sources, setSources] = useState<ReferenceSource[]>([]);
  const [distributions, setDistributions] = useState<GeographicDistribution[]>([]);
  const [notes, setNotes] = useState<TaxonNote[]>([]);
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [copiedLsid, setCopiedLsid] = useState(false);

  // Lightbox & Suggest Image Modal States
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestEmail, setSuggestEmail] = useState('');
  const [suggestUrl, setSuggestUrl] = useState('');
  const [suggestSuccess, setSuggestSuccess] = useState(false);

  // Search History State (Disabled as requested)
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Autocomplete Suggestions State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ name: string; scientific: string; hotspot: typeof HOTSPOT_SPECIES[0] }[]>([]);

  // No default Hotspot species on mount to keep the search bar blank when the tab is opened
  useEffect(() => {
    // Keep initially blank as requested
  }, []);

  const addToHistory = (query: string) => {
    // History disabled as requested
  };

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lower = val.toLowerCase();
    const matches: typeof suggestions = [];

    HOTSPOT_SPECIES.forEach(spec => {
      const sc = spec.record.scientificname;
      // Match scientific name
      if (sc.toLowerCase().includes(lower)) {
        matches.push({ name: sc, scientific: sc, hotspot: spec });
      }
      // Match vernacular names
      spec.vernaculars.forEach(v => {
        if (v.vernacular.toLowerCase().includes(lower)) {
          matches.push({ name: `${v.vernacular} (${sc})`, scientific: sc, hotspot: spec });
        }
      });
    });

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const handleLoadHotspot = (hotspot: typeof HOTSPOT_SPECIES[0]) => {
    setError(null);
    setResults(HOTSPOT_SPECIES.map(h => h.record));
    setSelectedRecord(hotspot.record);
    setSynonyms(hotspot.synonyms);
    setVernaculars(hotspot.vernaculars);
    setSources(hotspot.sources);
    setDistributions(hotspot.distributions);
    setNotes(hotspot.notes);
    setWikiData(hotspot.wikiData);
    setActiveTab('overview');
  };

  const handleSearchWithQuery = async (queryStr: string) => {
    const cleanQuery = queryStr.trim();
    if (!cleanQuery) return;

    // Save to history
    addToHistory(cleanQuery);

    // Check if query matches any hotspot query locally first for lightning-fast feedback (Prototype Hotspot Mode)
    const lowerQuery = cleanQuery.toLowerCase();
    const matchedHotspot = HOTSPOT_SPECIES.find(
      h => h.record.scientificname.toLowerCase().includes(lowerQuery) || 
           h.vernaculars.some(v => v.vernacular.toLowerCase().includes(lowerQuery))
    );

    if (matchedHotspot) {
      handleLoadHotspot(matchedHotspot);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);
    setSelectedRecord(null);
    setSynonyms([]);
    setVernaculars([]);
    setSources([]);
    setDistributions([]);
    setNotes([]);
    setWikiData(null);

    try {
      // WoRMS scientific name search
      const url = `https://www.marinespecies.org/rest/AphiaRecordsByName/${encodeURIComponent(cleanQuery)}?like=true&marine_only=true`;
      const response = await fetch(url);
      
      if (response.status === 204) {
        setError('Nenhuma espécie marinha localizada.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Erro na comunicação com a base de dados do WoRMS.');
      }

      const data = await response.json();
      const rawRecords = Array.isArray(data) ? data : data ? [data] : [];
      
      // Filter marine records to fit coastal context
      const marineRecords = rawRecords.filter((rec: any) => rec && (rec.isMarine === 1 || rec.isMarine === true || rec.isBrackish === 1 || rec.isBrackish === true));

      if (marineRecords.length === 0) {
        setError('Nenhum organismo marinho ou estuarino foi localizado para este termo.');
      } else {
        setResults(marineRecords);
        // Automatically open the first result for convenience
        handleSelectRecord(marineRecords[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError('Ocorreu um erro ao buscar na base WoRMS.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSearchWithQuery(searchQuery);
  };

  const handleSelectRecord = async (record: AphiaRecord) => {
    // Check if selected is a local hotspot
    const localMatch = HOTSPOT_SPECIES.find(h => h.record.AphiaID === record.AphiaID);
    if (localMatch) {
      handleLoadHotspot(localMatch);
      return;
    }

    setSelectedRecord(record);
    setActiveTab('overview');
    setIsLoadingDetails(true);
    setCopiedLsid(false);

    // Reset details states
    setSynonyms([]);
    setVernaculars([]);
    setSources([]);
    setDistributions([]);
    setNotes([]);
    setWikiData(null);

    const aphiaID = record.AphiaID;
    const scientificName = record.scientificname;

    try {
      // Parallel fetches for standard WoRMS endpoints
      const synUrl = `https://www.marinespecies.org/rest/AphiaSynonymsByAphiaID/${aphiaID}`;
      const vernUrl = `https://www.marinespecies.org/rest/AphiaVernacularsByAphiaID/${aphiaID}`;
      const sourcesUrl = `https://www.marinespecies.org/rest/AphiaSourcesByAphiaID/${aphiaID}`;
      const distUrl = `https://www.marinespecies.org/rest/AphiaDistributionsByAphiaID/${aphiaID}`;
      const notesUrl = `https://www.marinespecies.org/rest/AphiaNotesByAphiaID/${aphiaID}`;

      // Execute main requests
      const [
        synData,
        vernData,
        sourcesData,
        distData,
        notesData,
      ] = await Promise.all([
        fetchResource<AphiaRecord>(synUrl),
        fetchResource<Vernacular>(vernUrl),
        fetchResource<ReferenceSource>(sourcesUrl),
        fetchResource<GeographicDistribution>(distUrl),
        fetchResource<TaxonNote>(notesUrl),
      ]);

      let resolvedWikiData: any = null;

      // Wikipedia API fetch to get rich intro text + species illustration/image
      const cleanName = scientificName.replace(/\s+/g, '_');
      try {
        const ptRes = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`);
        if (ptRes.ok) {
          const data = await ptRes.json();
          if (data.extract) {
            resolvedWikiData = {
              title: data.title,
              extract: data.extract,
              imageUrl: data.originalimage?.source,
              pageUrl: data.content_urls?.desktop?.page,
              isEnglish: false
            };
          }
        }
      } catch {}

      if (!resolvedWikiData) {
        try {
          const enRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`);
          if (enRes.ok) {
            const data = await enRes.json();
            if (data.extract) {
              resolvedWikiData = {
                title: data.title,
                extract: data.extract,
                imageUrl: data.originalimage?.source,
                pageUrl: data.content_urls?.desktop?.page,
                isEnglish: true
              };
            }
          }
        } catch {}
      }

      setSynonyms(synData);
      setVernaculars(vernData);
      setSources(sourcesData);
      setDistributions(distData);
      setNotes(notesData);
      setWikiData(resolvedWikiData);

    } catch (err) {
      console.error('Error fetching detail sub-resources:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCopyLsid = (lsid: string) => {
    navigator.clipboard.writeText(lsid);
    setCopiedLsid(true);
    setTimeout(() => setCopiedLsid(false), 2000);
  };

  const handleExportPDF = async () => {
    if (!selectedRecord) return;

    // Capture the active map SVG from the DOM to integrate directly in the PDF report
    const mapSvgEl = document.querySelector('.map-container svg');
    let mapImageHtml = '';
    if (mapSvgEl) {
      try {
        const clonedSvg = mapSvgEl.cloneNode(true) as SVGElement;
        
        // Traverse all elements in the cloned SVG and apply light-theme styling attributes
        // so it renders perfectly without requiring any external Tailwind CSS classes.
        const allElements = clonedSvg.querySelectorAll('*');
        allElements.forEach((el: any) => {
          const className = el.getAttribute('class') || '';
          
          if (el.tagName === 'path') {
            // Map shape or land outline
            el.setAttribute('fill', '#f1f5f9');
            el.setAttribute('stroke', '#cbd5e1');
            el.setAttribute('stroke-width', '0.2');
          } else if (el.tagName === 'circle') {
            // Selection overlay, main marker, or inner core white dot
            if (className.includes('fill-rose-500/25') || className.includes('fill-rose-500/20')) {
              el.setAttribute('fill', 'rgba(244, 63, 94, 0.25)');
              el.setAttribute('stroke', 'rgba(244, 63, 94, 0.45)');
              el.setAttribute('stroke-width', '0.04');
            } else if (className.includes('fill-rose-600') || className.includes('fill-rose-500') || className.includes('fill-[#e11d48]')) {
              el.setAttribute('fill', '#e11d48');
              el.setAttribute('stroke', '#ffffff');
              el.setAttribute('stroke-width', '0.05');
            } else if (className.includes('fill-[#2a5caa]')) {
              el.setAttribute('fill', '#2a5caa');
              el.setAttribute('stroke', '#ffffff');
              el.setAttribute('stroke-width', '0.05');
            } else if (className.includes('fill-white')) {
              el.setAttribute('fill', '#ffffff');
            } else {
              el.setAttribute('fill', '#f43f5e');
            }
          } else if (el.tagName === 'g') {
            // Apply neutral fill/stroke variables if present in parent groups
            if (className.includes('fill-slate-100')) {
              el.setAttribute('fill', '#f1f5f9');
            }
            if (className.includes('text-slate-200') || className.includes('text-slate-250') || className.includes('text-slate-300')) {
              el.setAttribute('stroke', '#cbd5e1');
            }
          }
        });

        // Set inline attributes for the main SVG container
        clonedSvg.removeAttribute('class');
        clonedSvg.setAttribute('style', 'background-color: #f8fafc;');
        
        // Reset zoom and pan transform in the cloned SVG so it renders the full default extent without cutoff
        const viewportG = clonedSvg.querySelector('g');
        if (viewportG) {
          viewportG.style.transform = 'none';
          viewportG.style.transition = 'none';
        }
        
        // Define width and height for conversion matching the exact viewBox aspect ratio to prevent clipping/empty space
        const viewBoxStr = clonedSvg.getAttribute('viewBox') || '0 0 1000 500';
        const viewBoxParts = viewBoxStr.split(' ').map(Number);
        const vbWidth = (viewBoxParts.length === 4 && viewBoxParts[2] > 0) ? viewBoxParts[2] : 1000;
        const vbHeight = (viewBoxParts.length === 4 && viewBoxParts[3] > 0) ? viewBoxParts[3] : 500;
        const width = 1000;
        const height = Math.round((vbHeight / vbWidth) * width);
        clonedSvg.setAttribute('width', width.toString());
        clonedSvg.setAttribute('height', height.toString());

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(clonedSvg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);

        // Convert SVG to high-res PNG
        const pngDataUrl = await new Promise<string>((resolve) => {
          const image = new Image();
          image.src = blobUrl;
          image.crossOrigin = 'anonymous';
          
          image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width * 2; // high resolution for print
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.scale(2, 2);
              ctx.drawImage(image, 0, 0, width, height);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve('');
            }
            URL.revokeObjectURL(blobUrl);
          };
          image.onerror = () => {
            resolve('');
            URL.revokeObjectURL(blobUrl);
          };
        });

        if (pngDataUrl) {
          mapImageHtml = `<img src="${pngDataUrl}" style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 12px; border: 1px solid #cbd5e1; padding: 4px;" alt="Mapa de ocorrências reais GBIF/IBGE">`;
        }
      } catch (err) {
        console.error('Erro ao serializar SVG do mapa para PNG no PDF:', err);
      }
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para gerar o documento PDF.');
      return;
    }

    // Prepare content strings
    const scientificName = selectedRecord.scientificname;
    const authority = selectedRecord.authority;
    const lsid = selectedRecord.lsid;
    const aphiaId = selectedRecord.AphiaID;
    const rank = translateRank(selectedRecord.rank);
    const status = translateStatus(selectedRecord.status);
    
    const hierarchy = [
      { label: 'Reino', val: selectedRecord.kingdom },
      { label: 'Filo', val: selectedRecord.phylum },
      { label: 'Classe', val: selectedRecord.class },
      { label: 'Ordem', val: selectedRecord.order },
      { label: 'Família', val: selectedRecord.family },
      { label: 'Gênero', val: selectedRecord.genus },
      { label: 'Espécie', val: selectedRecord.scientificname }
    ].filter(h => h.val).map(h => `<strong>${h.label}</strong>: ${h.val}`).join(' | ');

    const synonymsHtml = synonyms.length > 0 
      ? synonyms.map(s => `
          <div class="item-card flex-row">
            <div>
              <span class="syn-name"><em>${s.scientificname}</em></span>
              <span class="syn-auth">${s.authority}</span>
            </div>
            <span class="syn-id">AphiaID: ${s.AphiaID}</span>
          </div>
        `).join('')
      : '<p class="no-data">Nenhum sinônimo catalogado.</p>';

    const vernacularsHtml = vernaculars.length > 0
      ? vernaculars.map(v => `
          <div class="item-card flex-row">
            <strong>${v.vernacular}</strong>
            <span class="lang-badge">${v.language || 'Não especificado'}</span>
          </div>
        `).join('')
      : '<p class="no-data">Nenhum nome popular catalogado.</p>';

    const distributionsHtml = distributions.length > 0
      ? distributions.map(d => `
          <div class="item-card">
            <strong>• ${d.location}</strong> ${d.locality ? `(${d.locality})` : ''} 
            ${d.country ? `| País: ${d.country}` : ''}
          </div>
        `).join('')
      : '<p class="no-data">Nenhum registro de distribuição explícito.</p>';

    const notesHtml = notes.length > 0
      ? notes.map(n => `
          <div class="item-card">
            <strong>${n.type || 'Nota'}</strong>: ${n.note}
          </div>
        `).join('')
      : '<p class="no-data">Nenhuma nota científica registrada.</p>';

    const sourcesHtml = sources.length > 0
      ? sources.map(s => `
          <div class="item-card">
            <strong>${s.use || 'Referência'}</strong>: ${s.reference}
          </div>
        `).join('')
      : '<p class="no-data font-medium">Nenhuma fonte bibliográfica registrada.</p>';

    const ptTitle = "Sistema de Monitoramento de Desembarque Pesqueiro MPA Piauí";

    // Build the document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha Técnica: ${scientificName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #0F172A;
            background-color: #f5f8fc;
            margin: 0;
            padding: 30px;
            font-size: 13px;
            line-height: 1.5;
          }

          /* Header style matching wireframe */
          .header {
            background-color: #07162d;
            color: #a4d4e8;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-left {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            opacity: 0.8;
            width: 25%;
          }
          .header-center {
            font-size: 16px;
            font-weight: 700;
            text-align: center;
            color: #a4d4e8;
            flex: 1;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          .header-right {
            font-size: 11px;
            color: #a4d4e8;
            opacity: 0.9;
            text-align: right;
            width: 25%;
          }

          /* Grid layout */
          .layout-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .layout-column {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          /* Card design */
          .layout-card {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 18px;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
          }
          .card-title {
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }

          /* Photo Block */
          .photo-container {
            width: 100%;
            height: 220px;
            border-radius: 6px;
            overflow: hidden;
            background-color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .specimen-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .no-photo-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: #94a3b8;
            text-align: center;
            padding: 20px;
          }
          .no-photo-text {
            font-size: 11px;
            font-weight: 600;
          }

          /* Synonyms (2 columns, line-height 1) */
          .synonyms-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            line-height: 1.0 !important;
          }
          .synonym-item {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
            line-height: 1.0 !important;
            display: flex;
            flex-direction: column;
          }
          .syn-name {
            font-weight: 700;
            font-size: 11.5px;
            color: #FF8A00;
            line-height: 1.0 !important;
          }
          .syn-auth {
            font-size: 9.5px;
            color: #64748b;
            margin-top: 2px;
            line-height: 1.0 !important;
          }

          /* Taxonomy (2 columns) */
          .taxonomy-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 14px;
          }
          .taxonomy-item {
            display: flex;
            flex-direction: column;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 4px;
          }
          .tax-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.05em;
          }
          .tax-value {
            font-size: 12px;
            font-weight: 600;
            color: #0f172a;
            margin-top: 2px;
          }
          .italic {
            font-style: italic;
          }

          /* Species info details */
          .scientific-name {
            font-size: 22px;
            font-weight: 700;
            color: #2a5caa;
            margin: 0;
            line-height: 1.2;
          }
          .authority {
            font-size: 13px;
            color: #64748B;
            font-style: italic;
            margin: 4px 0 10px 0;
          }
          .badge-row {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
          }
          .badge {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 4px 8px;
            border-radius: 4px;
          }
          .badge-blue {
            background-color: #F1F5F9;
            color: #2a5caa;
            border: 1px solid #CBD5E1;
          }
          .badge-status {
            background-color: ${status === 'ACEITO' ? '#ECFDF5' : '#FFFBEB'};
            color: ${status === 'ACEITO' ? '#065F46' : '#92400E'};
            border: 1px solid ${status === 'ACEITO' ? '#A7F3D0' : '#FDE68A'};
          }
          .id-meta {
            font-size: 10px;
            color: #64748b;
            margin-top: 6px;
            font-family: monospace;
          }
          .species-description {
            font-size: 12px;
            color: #334155;
            text-align: justify;
            line-height: 1.5;
          }

          /* Map Block */
          .map-container-block {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .map-image-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
          }
          .map-image-wrapper img {
            width: 100%;
            max-height: 220px;
            object-fit: contain;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
          }
          .no-map-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: #94a3b8;
            height: 180px;
            background-color: #f8fafc;
            width: 100%;
            border-radius: 6px;
          }
          .no-map-text {
            font-size: 11px;
            font-weight: 600;
          }

          /* References & external portals button styling */
          .references-block {
            font-size: 11px;
            color: #475569;
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
          }
          .ref-item {
            line-height: 1.4;
          }
          .conservation-buttons {
            display: flex;
            gap: 10px;
            margin-top: 8px;
          }
          .cons-btn {
            flex: 1;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            text-decoration: none;
            padding: 8px 12px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: inline-block;
          }
          .btn-iucn {
            background-color: #d97706;
            color: #ffffff;
            border: 1px solid #b45309;
          }
          .btn-fishbase {
            background-color: #2563eb;
            color: #ffffff;
            border: 1px solid #1d4ed8;
          }

          /* Footer */
          .footer {
            margin-top: 30px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          /* Print Optimizations */
          @media print {
            body {
              padding: 0;
              background-color: #f5f8fc !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              background-color: #07162d !important;
              color: #a4d4e8 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .layout-card {
              background-color: #ffffff !important;
              border-color: #cbd5e1 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .synonym-item {
              background-color: #f8fafc !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .badge-status {
              background-color: ${status === 'ACEITO' ? '#ECFDF5' : '#FFFBEB'} !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .btn-iucn {
              background-color: #d97706 !important;
              color: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .btn-fishbase {
              background-color: #2563eb !important;
              color: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">Ficha Técnica Taxonômica</div>
          <div class="header-center">
            FAMÍLIA: ${selectedRecord.family ? selectedRecord.family.toUpperCase() : 'NÃO ESPECIFICADA'}
          </div>
          <div class="header-right">
            Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}hrs
          </div>
        </div>

        <div class="layout-grid">
          <!-- COLUNA ESQUERDA -->
          <div class="layout-column">
            <!-- Bloco 1: Foto da Espécie -->
            <div class="layout-card">
              <div class="card-title">FOTOGRAFIA DA ESPÉCIE</div>
              <div class="photo-container">
                ${wikiData?.imageUrl ? `
                  <img src="${wikiData.imageUrl}" class="specimen-image" alt="${scientificName}">
                ` : `
                  <div class="no-photo-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <div class="no-photo-text">Fotografia não disponível no Wikipédia</div>
                  </div>
                `}
              </div>
            </div>

            <!-- Bloco 2: Sinônimos (2 colunas, line-height 1) -->
            <div class="layout-card">
              <div class="card-title">SINÔNIMOS REGISTRADOS (WoRMS)</div>
              <div class="synonyms-container">
                ${synonyms.length > 0 ? synonyms.map(s => `
                  <div class="synonym-item">
                    <span class="syn-name"><em>${s.scientificname}</em></span>
                    <span class="syn-auth">${s.authority || ''}</span>
                  </div>
                `).join('') : '<div class="no-photo-text" style="color: #94a3b8; font-style: italic;">Nenhum sinônimo registrado.</div>'}
              </div>
            </div>

            <!-- Bloco 3: Informações Taxonômicas (2 colunas) -->
            <div class="layout-card">
              <div class="card-title">HIERARQUIA TAXONÔMICA (WoRMS)</div>
              <div class="taxonomy-container">
                ${[
                  { label: 'Reino', val: selectedRecord.kingdom },
                  { label: 'Filo', val: selectedRecord.phylum },
                  { label: 'Classe', val: selectedRecord.class },
                  { label: 'Ordem', val: selectedRecord.order },
                  { label: 'Família', val: selectedRecord.family },
                  { label: 'Gênero', val: selectedRecord.genus },
                  { label: 'Espécie', val: selectedRecord.scientificname, italic: true }
                ].filter(level => level.val).map(level => `
                  <div class="taxonomy-item">
                    <span class="tax-label">${level.label}</span>
                    <span class="tax-value ${level.italic ? 'italic' : ''}">${level.val}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- COLUNA DIREITA -->
          <div class="layout-column">
            <!-- Bloco 1: Informações da Espécie -->
            <div class="layout-card">
              <div class="card-title">INFORMAÇÕES DA ESPÉCIE</div>
              <div class="species-header-info">
                <h2 class="scientific-name"><em>${scientificName}</em></h2>
                <div class="authority">${authority}</div>
                <div class="badge-row">
                  <span class="badge badge-blue">${rank}</span>
                  <span class="badge badge-status">Status: ${status}</span>
                </div>
                <div class="id-meta">
                  <strong>AphiaID:</strong> <code>${aphiaId}</code> &nbsp;|&nbsp; 
                  <strong>LSID:</strong> <code>${lsid}</code>
                </div>
              </div>
              <div class="species-description">
                ${wikiData ? wikiData.extract : "Nenhum resumo ecológico encontrado para este táxon específico na Wikipédia."}
              </div>
            </div>

            <!-- Bloco 2: Mapa de Distribuição -->
            <div class="layout-card">
              <div class="card-title">MAPA DE DISTRIBUIÇÃO GEOGRÁFICA</div>
              <div class="map-container-block">
                ${mapImageHtml ? `
                  <div class="map-image-wrapper">
                    ${mapImageHtml}
                  </div>
                ` : `
                  <div class="no-map-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                      <line x1="8" y1="2" x2="8" y2="18" />
                      <line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                    <div class="no-map-text">Nenhuma ocorrência mapeada para esta espécie</div>
                  </div>
                `}
              </div>
            </div>

            <!-- Bloco 3: Referências e botões IUCN / FishBase -->
            <div class="layout-card">
              <div class="card-title">REFERÊNCIAS E PORTAIS DE CONSERVAÇÃO</div>
              <div class="references-block">
                <div class="ref-item"><strong>WoRMS:</strong> Registro oficial sob AphiaID ${aphiaId}.</div>
                <div class="ref-item"><strong>IBGE:</strong> Base de limites territoriais e de biomas integrados.</div>
                <div class="ref-item"><strong>GBIF:</strong> Amostragem de ocorrências de biodiversidade global.</div>
              </div>
              <div class="conservation-buttons">
                <a href="https://www.iucnredlist.org/search?query=${encodeURIComponent(scientificName)}" target="_blank" class="cons-btn btn-iucn">
                  Lista Vermelha IUCN
                </a>
                <a href="https://www.fishbase.se/summary/${encodeURIComponent(scientificName)}" target="_blank" class="cons-btn btn-fishbase">
                  Portal FishBase
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">
            Créditos: WoRMS • Wikipédia • GBIF • IBGE • IUCN • FishBase
          </div>
          <div class="footer-right">
            Página 1 de 1
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestUrl.trim()) return;
    setSuggestSuccess(true);
    setTimeout(() => {
      setSuggestSuccess(false);
      setIsSuggestModalOpen(false);
      setSuggestUrl('');
      setSuggestEmail('');
    }, 2500);
  };

  const translateStatus = (status: string): string => {
    const s = status.toLowerCase().trim();
    if (s === 'accepted') return 'ACEITO';
    if (s === 'unaccepted') return 'NÃO ACEITO';
    if (s === 'nomen dubium') return 'Nomen Dubium';
    if (s === 'nomen nudum') return 'Nomen Nudum';
    return status.toUpperCase();
  };

  const translateRank = (rank: string): string => {
    const r = rank.toLowerCase().trim();
    if (r === 'species') return 'Espécie';
    if (r === 'genus') return 'Gênero';
    if (r === 'family') return 'Família';
    if (r === 'order') return 'Ordem';
    if (r === 'class') return 'Classe';
    if (r === 'phylum') return 'Filo';
    if (r === 'kingdom') return 'Reino';
    return rank;
  };

  const renderEnvBadges = (rec: AphiaRecord) => {
    const environments = [
      { key: 'isMarine', label: 'Marinho', icon: '🌊', active: rec.isMarine === 1 || rec.isMarine === true, bg: 'bg-[#F5F6FA] text-[#2a5caa] border-slate-200' },
      { key: 'isBrackish', label: 'Salobro / Estuarino', icon: '💧', active: rec.isBrackish === 1 || rec.isBrackish === true, bg: 'bg-[#F5F6FA] text-teal-700 border-teal-200' },
      { key: 'isFreshwater', label: 'Água Doce', icon: '🏞️', active: rec.isFreshwater === 1 || rec.isFreshwater === true, bg: 'bg-[#F5F6FA] text-blue-600 border-blue-200' },
    ];

    const activeEnvs = environments.filter(e => e.active);

    return (
      <div className="flex flex-wrap gap-2">
        {activeEnvs.length > 0 ? activeEnvs.map(env => (
          <span key={env.key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border uppercase tracking-wider ${env.bg}`}>
            <span>{env.icon}</span>
            <span>{env.label}</span>
          </span>
        )) : (
          <span className="text-sm text-slate-400 italic">Nenhum ambiente de ocorrência registrado</span>
        )}
      </div>
    );
  };

  return (
    <div id="worms-search-section" className="w-full flex flex-col gap-6 animate-in fade-in duration-300 font-sans text-[15px] leading-relaxed">
      
      {/* Cabeçalho Azul Marinho */}
      <div 
        className="bg-[#2a5caa] text-white rounded-xl p-6 border-b border-slate-800/20 shadow-[0_6px_18px_rgba(10,61,98,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ transition: 'all 200ms ease' }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-[#3b82f6] text-white font-extrabold px-2.5 py-0.5 rounded text-[10px] uppercase tracking-widest">
              Integração WoRMS
            </span>
            <span className="text-xs text-slate-200 font-semibold">• API Real-time</span>
          </div>
          <h1 className="text-[30px] font-semibold tracking-tight text-white leading-tight">
            BUSCA CIENTÍFICA WORMS
          </h1>
          <p className="text-xs text-slate-200 max-w-xl font-normal opacity-90">
            Valide e pesquise taxonomia e dados científicos oficiais de espécies marinhas e estuarinas.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3 bg-white/10 border border-white/25 px-4 py-3 rounded-lg max-w-sm">
          <Globe className="text-[#3b82f6] shrink-0 animate-spin" size={20} style={{ animationDuration: '20s' }} />
          <p className="text-[12px] text-slate-100 font-normal leading-tight">
            Base de dados do <span className="text-white font-bold">World Register of Marine Species</span> integrada.
          </p>
        </div>
      </div>

      {/* Barra de Busca Central com Autocomplete do Protótipo */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-[0_6px_18px_rgba(10,61,98,0.08)]">
        <form onSubmit={handleSearch} className="w-full flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 pointer-events-none">
              <Search size={18} />
            </span>
            <input
              type="text"
              required
              aria-label="Digitar nome científico ou popular"
              placeholder="Digite o nome científico ou popular (ex: Ucides cordatus, Camarão, Sururu...)"
              value={searchQuery}
              onChange={e => handleQueryChange(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) {
                  handleQueryChange(searchQuery);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-11 pr-4 py-3.5 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-[#6B7280] outline-none focus:border-[#2a5caa] focus:ring-2 focus:ring-[#2a5caa]/20 transition-all"
            />

            {/* Dropdown de sugestões em tempo real */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 max-h-60 overflow-y-auto">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery(sug.scientific);
                      handleLoadHotspot(sug.hotspot);
                      setShowSuggestions(false);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{sug.name}</span>
                      <span className="text-[10px] text-slate-400 italic">Espécie: {sug.scientific}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#2a5caa] bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded uppercase">
                      Carregar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#2a5caa] hover:bg-[#2a5caa]/90 text-white px-8 py-3.5 rounded-lg font-semibold text-xs uppercase tracking-widest transition-all duration-200 hover:shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                <span>Consultando...</span>
              </>
            ) : (
              <>
                <Search size={14} />
                <span>Consultar</span>
              </>
            )}
          </button>
        </form>

        {/* Histórico de Busca */}
        {searchHistory.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800/60 pt-3">
            {searchHistory.map((hist, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(hist);
                  handleSearchWithQuery(hist);
                }}
                className="text-xs bg-slate-100 hover:bg-[#2a5caa]/10 text-[#2a5caa] dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/50 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {hist}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSearchHistory([]);
                try {
                  localStorage.removeItem('worms_search_history');
                } catch {}
              }}
              className="text-[10px] text-rose-600 hover:underline font-bold uppercase tracking-wider ml-auto cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Grid Geral de Layout: Painel Lateral 1/5 vs Área Principal 4/5 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* PAINEL LATERAL (1/5 da largura da tela no Desktop) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 shadow-[0_6px_18px_rgba(10,61,98,0.08)] flex flex-col gap-4 self-stretch">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-[#2a5caa] dark:text-[#3b82f6] uppercase tracking-widest">
              {results.length > 0 ? `Taxons Localizados (${results.length})` : 'Lista de Táxons'}
            </h3>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={15} />
              <p className="text-xs font-medium text-rose-800 dark:text-rose-300 leading-relaxed">{error}</p>
            </div>
          )}

          {results.length > 0 ? (
            <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-1">
              {results.map((rec) => {
                const isSelected = selectedRecord?.AphiaID === rec.AphiaID;
                const isAccepted = rec.status?.toLowerCase() === 'accepted';
                
                return (
                  <button
                    key={rec.AphiaID}
                    type="button"
                    onClick={() => handleSelectRecord(rec)}
                    className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected 
                        ? 'bg-[#F5F6FA] dark:bg-slate-850 border-[#2a5caa] dark:border-[#3b82f6]' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                        <span className="italic font-bold text-[#2a5caa] dark:text-[#3b82f6]">{rec.scientificname}</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5 truncate" title={rec.authority}>
                        {rec.authority}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : !error && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 rounded-full text-slate-350 dark:text-slate-600">
                <HelpCircle size={20} />
              </div>
              <div className="max-w-[180px]">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nenhum táxon pesquisado</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Digite um termo ou use as sugestões do protótipo acima.</p>
              </div>
            </div>
          )}
        </div>

        {/* ÁREA PRINCIPAL COM DETALHES DE ESPÉCIES */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-[0_6px_18px_rgba(10,61,98,0.08)] flex flex-col justify-between self-stretch">
          {selectedRecord ? (
            <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-300">
              
              {/* Header do Painel Principal */}
              <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200">
                      {translateRank(selectedRecord.rank)}
                    </span>
                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
                      selectedRecord.status?.toLowerCase() === 'accepted'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20'
                        : 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/20'
                    }`}>
                      STATUS: {translateStatus(selectedRecord.status)}
                    </span>
                  </div>
                  <div className="text-[12px] font-mono text-slate-500 uppercase tracking-widest font-semibold">
                    AphiaID: {selectedRecord.AphiaID}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[30px] font-semibold tracking-tight text-[#2a5caa] dark:text-white leading-tight">
                      <span className="italic font-bold">{selectedRecord.scientificname}</span>
                    </h2>
                    <p className="text-sm md:text-base font-semibold text-[#6B7280] dark:text-slate-400 mt-1">
                      {selectedRecord.authority}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="shrink-0 inline-flex items-center justify-center gap-2 bg-[#2a5caa] hover:bg-[#2a5caa]/90 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 hover:shadow-md cursor-pointer"
                  >
                    <FileText size={14} />
                    <span>Baixar em PDF</span>
                  </button>
                </div>
              </div>

              {/* Se o táxon for sinônimo, mostrar o aceito */}
              {selectedRecord.status?.toLowerCase() !== 'accepted' && selectedRecord.valid_name && (
                <div className="p-4 bg-amber-50/50 text-amber-800 dark:bg-amber-950/10 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-start gap-3">
                  <Info className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" size={16} />
                  <div className="text-xs font-medium leading-relaxed">
                    <p className="font-bold text-[#FF8A00]">Este táxon é atualmente classificado como um sinônimo ou nome inativo.</p>
                    <p className="mt-1">
                      Nome oficial válido aceito pelo WoRMS: <button type="button" onClick={() => handleSelectRecord({ ...selectedRecord, AphiaID: selectedRecord.valid_AphiaID, scientificname: selectedRecord.valid_name, authority: selectedRecord.valid_authority || '' })} className="italic font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{selectedRecord.valid_name}</button> {selectedRecord.valid_authority && `(${selectedRecord.valid_authority})`}
                    </p>
                  </div>
                </div>
              )}

              {/* Abas de Navegação (Tabs) */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none pb-px select-none">
                {[
                  { id: 'overview', label: 'Geral', count: null, icon: Globe },
                  { id: 'synonyms', label: 'Sinônimos', count: synonyms.length, icon: Sparkles },
                  { id: 'vernaculars', label: 'Nomes Populares', count: vernaculars.length, icon: Tag },
                  { id: 'sources', label: 'Fontes Bibliográficas', count: sources.length, icon: ScrollText },
                  { id: 'notes', label: 'Notas', count: notes.length, icon: StickyNote },
                  { id: 'links', label: 'Bancos Externos', count: 5, icon: Link2 },
                  { id: 'images', label: 'Imagens', count: wikiData?.imageUrl ? 1 : 0, icon: ImageIcon },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap outline-none ${
                        isActive
                          ? 'border-[#2a5caa] text-[#2a5caa] dark:border-[#3b82f6] dark:text-[#3b82f6]'
                          : 'border-transparent text-[#6B7280] hover:text-[#2a5caa] dark:hover:text-[#3b82f6]'
                      }`}
                    >
                      <TabIcon size={13} className="shrink-0" />
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isActive 
                            ? 'bg-[#2a5caa] text-white dark:bg-[#3b82f6]' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Janela de Conteúdo das Abas */}
              <div className="flex-1 min-h-[350px]">
                
                {isLoadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 font-semibold text-xs">
                    <RefreshCw className="animate-spin text-[#2a5caa]" size={24} />
                    <span>Carregando dados estruturados do WoRMS e Wikipédia...</span>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-200 space-y-6">
                    
                    {/* ABA 1: GERAL */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        
                        {/* Resumo Científico com Imagem */}
                        <div className="bg-[#F5F6FA] dark:bg-slate-950 p-5 rounded-lg border border-transparent flex flex-col md:flex-row gap-6 items-center md:items-start shadow-[0_6px_18px_rgba(10,61,98,0.08)]">
                          {wikiData?.imageUrl && (
                            <div className="w-full md:w-[448px] shrink-0 flex justify-center">
                              <img 
                                src={wikiData.imageUrl} 
                                alt={selectedRecord.scientificname} 
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                onClick={() => setIsLightboxOpen(true)}
                                className="w-full object-cover rounded-[12px] shadow-md border border-slate-200 dark:border-slate-800 cursor-zoom-in hover:scale-103 transition-all duration-300"
                              />
                            </div>
                          )}
                          <div className="space-y-2 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2a5caa] dark:text-[#3b82f6] flex items-center gap-1">
                              <BookOpen size={12} /> RESUMO CIENTÍFICO (WIKIPÉDIA)
                            </span>
                            <p className="text-[15px] text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
                              {wikiData ? wikiData.extract : "Nenhum resumo ecológico encontrado para este táxon específico. Consulte o portal do WoRMS para informações aprofundadas."}
                            </p>
                            {wikiData?.pageUrl && (
                              <a 
                                href={wikiData.pageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2a5caa] dark:text-[#3b82f6] hover:underline pt-1"
                              >
                                Ler artigo completo na Wikipédia <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Hierarquia Taxonômica */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-[#6B7280] block flex items-center gap-1">
                            <Database size={13} /> Classificação Taxonômica
                          </span>
                          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {[
                              { label: 'Reino', val: selectedRecord.kingdom },
                              { label: 'Filo', val: selectedRecord.phylum },
                              { label: 'Classe', val: selectedRecord.class },
                              { label: 'Ordem', val: selectedRecord.order },
                              { label: 'Família', val: selectedRecord.family },
                              { label: 'Gênero', val: selectedRecord.genus },
                              { label: 'Espécie', val: selectedRecord.scientificname, italic: true }
                            ].map((level, i) => {
                              if (!level.val) return null;
                              return (
                                <div key={i} className="flex items-center gap-1.5">
                                  {i > 0 && <ChevronRight size={10} className="text-slate-350 shrink-0" />}
                                  <div className="flex flex-col">
                                    <span className="text-[9px] uppercase tracking-widest text-[#6B7280] font-bold">
                                      {level.label}
                                    </span>
                                    <span className={level.italic ? 'italic font-bold text-[#2a5caa] dark:text-[#3b82f6] text-sm' : 'text-slate-700 dark:text-slate-300'}>
                                      {level.val}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Distribuição Geográfica com integração IBGE */}
                        <WormsDistributionMap 
                          distributions={distributions}
                          scientificName={selectedRecord.scientificname}
                        />

                        {/* Ambientes de Ocorrência */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-[#6B7280] block">Ambientes de Ocorrência Registrados</span>
                          {renderEnvBadges(selectedRecord)}
                        </div>

                        {/* Sinônimos Registrados */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-[#6B7280] block flex items-center gap-1">
                            <Sparkles size={13} className="text-[#FF8A00]" /> Sinônimos Registrados (WoRMS)
                          </span>
                          {synonyms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {synonyms.slice(0, 4).map((syn, idx) => (
                                <div key={idx} className="p-3 bg-[#F5F6FA] dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 rounded-lg flex flex-col gap-0.5">
                                  <span className="italic font-bold text-xs text-[#FF8A00]">{syn.scientificname}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">{syn.authority}</span>
                                </div>
                              ))}
                              {synonyms.length > 4 && (
                                <button type="button" onClick={() => setActiveTab('synonyms')} className="text-xs font-bold text-[#2a5caa] dark:text-[#3b82f6] hover:underline text-left mt-1 cursor-pointer">
                                  Ver todos os {synonyms.length} sinônimos...
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Nenhum sinônimo registrado para esta espécie.</p>
                          )}
                        </div>

                        {/* Nomes Populares */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-[#6B7280] block flex items-center gap-1">
                            <Tag size={13} className="text-[#2a5caa] dark:text-[#3b82f6]" /> Nomes Populares
                          </span>
                          {vernaculars.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {vernaculars.slice(0, 8).map((v, idx) => (
                                <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded font-medium border border-slate-200 dark:border-slate-700">
                                  {v.vernacular} <span className="text-[9px] text-slate-400 font-bold uppercase ml-1">({v.language || '?'})</span>
                                </span>
                              ))}
                              {vernaculars.length > 8 && (
                                <button type="button" onClick={() => setActiveTab('vernaculars')} className="text-xs font-bold text-[#2a5caa] dark:text-[#3b82f6] hover:underline cursor-pointer ml-1">
                                  +{vernaculars.length - 8} mais...
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Nenhum nome popular registrado.</p>
                          )}
                        </div>

                      </div>
                    )}
                    
                    {/* ABA 2: SINÔNIMOS */}
                    {activeTab === 'synonyms' && (
                      <div className="space-y-4">
                        {synonyms.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {synonyms.map((syn, idx) => (
                              <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-1.5 hover:border-[#2a5caa] transition-all duration-200 shadow-sm">
                                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                  <span>SINÔNIMO TAXONÔMICO</span>
                                  <span>AphiaID: {syn.AphiaID}</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  <span className="italic font-bold text-[#FF8A00]">{syn.scientificname}</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                  {syn.authority}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center text-[#6B7280]">
                            <p className="text-xs font-semibold">Nenhum sinônimo catalogado</p>
                            <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">Este táxon representa um nome oficial estável e de consenso.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ABA 3: VERNACULAR NAMES */}
                    {activeTab === 'vernaculars' && (
                      <div className="space-y-4">
                        {vernaculars.length > 0 ? (
                          <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                            {vernaculars.map((vern, idx) => {
                              const isPt = (vern.language || '').toLowerCase().includes('portuguese') || (vern.language || '').toLowerCase().includes('português');
                              return (
                                <div key={idx} className="p-4 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                                      {vern.vernacular}
                                    </span>
                                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                      {vern.language || 'Não especificado'}
                                    </span>
                                  </div>
                                  {isPt && (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
                                      Nacional
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center text-[#6B7280]">
                            <p className="text-xs font-semibold">Nenhum nome popular catalogado</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ABA 4: FONTES BIBLIOGRÁFICAS */}
                    {activeTab === 'sources' && (
                      <div className="space-y-4">
                        {sources.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {sources.map((src, idx) => (
                              <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-2">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 text-[9px] font-bold uppercase tracking-widest text-[#2a5caa]">
                                  <span>FONTE CIENTÍFICA DE REFERÊNCIA</span>
                                  {src.use && <span className="bg-slate-100 px-2 py-0.5 rounded">{src.use}</span>}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                  {src.reference}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                            <p className="text-xs font-semibold">Sem fontes registradas nesta base.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ABA 5: NOTAS */}
                    {activeTab === 'notes' && (
                      <div className="space-y-4">
                        {notes.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {notes.map((note, idx) => (
                              <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                <div className="flex items-center gap-1.5 text-slate-500 border-b border-slate-100 pb-1.5">
                                  <StickyNote size={14} className="text-[#FF8A00]" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">{note.type || 'Nota Taxonômica'}</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                                  {note.note}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-450">
                            <p className="text-xs font-semibold">Nenhuma nota científica registrada.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ABA 6: BANCOS EXTERNOS */}
                    {activeTab === 'links' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {[
                            { label: "Taxonomia GBIF", id: "GBIF API Portal", url: `https://www.gbif.org/species/search?q=${encodeURIComponent(selectedRecord.scientificname)}` },
                            { label: "NCBI Taxonomy", id: "NCBI Entrez Search", url: `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name=${encodeURIComponent(selectedRecord.scientificname)}` },
                            { label: "ITIS Report", id: "Integrated Taxonomic System", url: `https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=` },
                            { label: "BOLD Systems", id: "Barcode of Life Data System", url: `http://www.boldsystems.org/index.php/Taxbrowser_Taxonpage?taxid=` },
                            { label: "Lista Vermelha IUCN", id: "Red List of Threatened Species", url: `https://www.iucnredlist.org/search?query=${encodeURIComponent(selectedRecord.scientificname)}` }
                          ].map((link, idx) => (
                            <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-4 hover:border-[#2a5caa] transition-all duration-200 shadow-sm">
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B7280]">REPOSITÓRIO ADICIONAL</span>
                                <span className="text-xs font-bold text-[#2a5caa] dark:text-white">{link.label}</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[180px]">{link.id}</span>
                              </div>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-slate-50 hover:bg-[#2a5caa]/10 text-[#2a5caa] dark:bg-slate-800 dark:text-slate-350 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ABA 7: IMAGENS */}
                    {activeTab === 'images' && (
                      <div className="space-y-4">
                        {wikiData?.imageUrl ? (
                          <div className="flex flex-col gap-4">
                            {/* Galeria Grid (3 colunas em desktop, 2 em tablet, 1 em mobile) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div 
                                className="relative group overflow-hidden rounded-[12px] border border-slate-200 dark:border-slate-800 shadow-md aspect-[4/3] cursor-zoom-in"
                                onClick={() => setIsLightboxOpen(true)}
                              >
                                <img 
                                  src={wikiData.imageUrl} 
                                  alt={selectedRecord.scientificname} 
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white text-xs font-bold gap-1 uppercase tracking-widest">
                                  <Eye size={16} /> Ver Lightbox
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center bg-[#F5F6FA] dark:bg-slate-950 p-4 rounded-lg">
                              <span className="text-xs text-[#6B7280] font-semibold">Fotografia Oficial Taxonômica</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsSuggestModalOpen(true)}
                                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                >
                                  <Camera size={14} />
                                  <span>Sugerir Imagem</span>
                                </button>
                                <a
                                  href={wikiData.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#2a5caa] hover:bg-[#2a5caa]/90 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                >
                                  <span>Alta Resolução</span>
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-4">
                            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-350 shadow-sm">
                              <ImageIcon size={30} />
                            </div>
                            <div className="max-w-xs space-y-2">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sem mídias diretas catalogadas</p>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                Nenhuma imagem oficial disponível no momento para esta espécie. Ajude-nos sugerindo uma imagem abaixo!
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1 justify-center">
                              <button
                                type="button"
                                onClick={() => setIsSuggestModalOpen(true)}
                                className="text-xs bg-slate-900 hover:bg-slate-850 text-white px-4 py-2.5 rounded-lg font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                              >
                                <Camera size={14} />
                                <span>Sugerir Imagem</span>
                              </button>
                              <a
                                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(selectedRecord.scientificname)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-lg font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                              >
                                <span>Pesquisar no Google</span>
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}

              </div>

              {/* Botão de Cópia LSID e Link WoRMS */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5 mt-3 gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Database size={14} className="text-[#2a5caa]" />
                  <span className="font-mono text-[10px] uppercase">Identificador LSID:</span>
                  <code className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[11px] font-mono truncate max-w-[220px]">
                    {selectedRecord.lsid}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyLsid(selectedRecord.lsid)}
                    className="p-1 bg-white hover:bg-slate-50 text-[#2a5caa] border border-slate-200 rounded transition-all cursor-pointer shadow-sm"
                    title="Copiar LSID"
                  >
                    {copiedLsid ? <Check className="text-emerald-600" size={10} /> : <Copy size={10} />}
                  </button>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <a
                    href={`https://www.marinespecies.org/aphia.php?p=taxdetails&id=${selectedRecord.AphiaID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#2a5caa] hover:bg-[#2a5caa]/90 text-white px-5 py-2.5 rounded-lg font-semibold text-xs uppercase tracking-widest transition-all cursor-pointer w-full sm:w-auto shadow-sm"
                  >
                    <span>Portal Oficial WoRMS</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-350 shadow-inner">
                <BookOpen size={30} className="text-slate-500" />
              </div>
              <div className="max-w-xs">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ficha de Detalhes Taxonômicos</p>
                <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
                  Busque uma espécie ou clique em uma das sugestões do protótipo acima para iniciar a exploração!
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* LIGHTBOX DE IMAGENS EM TELA CHEIA (HOTSPOT DE PROTÓTIPO) */}
      {isLightboxOpen && wikiData?.imageUrl && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex flex-col items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            type="button"
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Fechar Lightbox"
          >
            <X size={24} />
          </button>
          <img 
            src={wikiData.imageUrl} 
            alt={selectedRecord?.scientificname || 'Espécie'} 
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="text-center text-white mt-4 space-y-1">
            <h4 className="text-lg font-bold italic">{selectedRecord?.scientificname}</h4>
            <p className="text-xs text-slate-300">Visualização Científica de Alta Qualidade</p>
          </div>
        </div>
      )}

      {/* MODAL / FORMULÁRIO DE SUGERIR IMAGEM */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl relative font-sans">
            <button 
              type="button"
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              onClick={() => setIsSuggestModalOpen(false)}
              aria-label="Fechar Modal"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <Camera className="text-[#2a5caa]" size={20} />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">
                Sugerir Imagem da Espécie
              </h3>
            </div>
            
            {suggestSuccess ? (
              <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-200">
                  <Check size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Sugestão Enviada!</h4>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Sua imagem passará por curadoria científica antes de ser homologada no banco de dados. Obrigado pela colaboração!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="space-y-4">
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Ajude a enriquecer o inventário de espécies do Piauí enviando links de fotografias científicas em alta resolução.
                </p>
                
                <div className="space-y-1">
                  <label htmlFor="species-field" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Espécie</label>
                  <input 
                    id="species-field"
                    type="text" 
                    readOnly 
                    value={selectedRecord?.scientificname || ''} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-lg text-xs italic font-bold text-[#2a5caa] outline-none"
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="suggest-url" className="text-[11px] font-bold text-[#2a5caa] uppercase tracking-widest block">URL da Imagem (JPEG/PNG)</label>
                  <input 
                    id="suggest-url"
                    type="url" 
                    required
                    placeholder="https://exemplo.com/foto_especie.jpg"
                    value={suggestUrl}
                    onChange={e => setSuggestUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-[#2a5caa] focus:ring-1 focus:ring-[#2a5caa]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="suggest-email" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Seu E-mail de Contato (Opcional)</label>
                  <input 
                    id="suggest-email"
                    type="email" 
                    placeholder="nome@exemplo.com"
                    value={suggestEmail}
                    onChange={e => setSuggestEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-[#2a5caa] focus:ring-1 focus:ring-[#2a5caa]"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-[#2a5caa] hover:bg-[#2a5caa]/90 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 shadow-md cursor-pointer text-center"
                >
                  Enviar Sugestão
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RODAPÉ DISCRETO */}
      <footer className="border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-6 text-center text-[11px] text-[#6B7280] uppercase tracking-widest font-semibold flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>Curadoria Científica: MPA Piauí & Lab. de Biologia Marinha</span>
        <span>World Register of Marine Species • API v1</span>
      </footer>

    </div>
  );
};
