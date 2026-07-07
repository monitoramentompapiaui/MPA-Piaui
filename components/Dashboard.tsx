
import React, { useMemo, useState, useRef, memo, useEffect } from 'react';
import { LandingForm, Species } from '../types';
import { exportToPdf } from '../utils/pdfExport';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, ResponsiveContainer, Cell, LineChart, Line 
} from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  BarController,
  LineController,
  ScatterController
} from 'chart.js';
import { 
  Fish, TrendingUp, DollarSign, ArrowRight, 
  Palette, BarChart3, LineChart as LineIcon, AreaChart as AreaIcon,
  Layout, Filter, Download, Award, X, Check, Search, ChevronDown, ChevronUp,
  Users, Calendar, MapPin, Anchor, User
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  ChartTooltip,
  ChartLegend,
  BarController,
  LineController,
  ScatterController
);

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

const calculateRegression = (pts: { x: number, y: number }[]) => {
  const n = pts.length;
  if (n < 2) return [];
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += pts[i].x;
    sumY += pts[i].y;
    sumXY += pts[i].x * pts[i].y;
    sumXX += pts[i].x * pts[i].x;
  }
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return [];
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  const sortedX = pts.map(p => p.x).sort((a, b) => a - b);
  const minX = sortedX[0];
  const maxX = sortedX[sortedX.length - 1];
  
  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];
};

interface Props {
  forms: LandingForm[];
  onNewForm: () => void;
  speciesList?: Species[];
}

type ChartType = 'bar' | 'line' | 'area' | 'scatter';
type ColorTheme = 'blue' | 'emerald' | 'indigo' | 'rose' | 'amber';

const THEMES: Record<ColorTheme, { colors: string[], label: string }> = {
  blue: { colors: ['#2a5caa', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'], label: 'Oceano' },
  emerald: { colors: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'], label: 'Floresta' },
  indigo: { colors: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'], label: 'Crepúsculo' },
  rose: { colors: ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3'], label: 'Coral' },
  amber: { colors: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'], label: 'Dourado' }
};

interface ChartCardProps {
  title: string;
  allForms: LandingForm[];
  type: 'local' | 'month' | 'gear' | 'species' | 'moon' | 'production_group' | 'production_season' | 'revenue_species' | 'revenue_gear' | 'revenue_local' | 'revenue_group' | 'cpue_local' | 'cpue_month' | 'cpue_season' | 'cpue_moon' | 'cpue_gear' | 'cpue_species' | 'production_year' | 'cpue_year' | 'revenue_year';
  yAxisLabel: string;
  xAxisLabel: string;
  speciesList?: Species[];
  reverseLayout?: boolean;
}

const getGroupLabel = (groupType: string | undefined): string => {
  if (!groupType) return 'Outros';
  const gt = groupType.toLowerCase().trim();
  if (gt === 'caranguejo_siri') return 'Caranguejo / Siri';
  if (gt === 'ostra') return 'Ostra';
  if (gt === 'marisco') return 'Marisco';
  return 'Outros';
};

const getSeasonLabel = (period: string | undefined): string => {
  if (!period) return 'Não informado';
  const p = period.toLowerCase().trim();
  if (p === 'seco') return 'Seco';
  if (p === 'chuvoso') return 'Chuvoso';
  return 'Não informado';
};

const ProfessionalChartCard: React.FC<ChartCardProps> = ({ 
  title, allForms, type, yAxisLabel, xAxisLabel, speciesList = [], reverseLayout = false
}) => {
  const isRevenue = type.includes('revenue');
  const isCpue = type.startsWith('cpue_');
  const isBoxPlot = type === 'production_season' || type === 'moon' || isCpue;
  const [chartType, setChartType] = useState<'bar' | 'line'>(type === 'month' ? 'line' : 'bar');
  const theme = 'blue';
  
  // Filtros Locais
  const [localSpecies, setLocalSpecies] = useState<string>('all');
  const [localGear, setLocalGear] = useState<string>('all');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [chartWidthPercent, setChartWidthPercent] = useState<number>(66.6);
  const [isDragging, setIsDragging] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!(window as any).chartRegistry) {
      (window as any).chartRegistry = {};
    }
    (window as any).chartRegistry[type] = {
      title,
      getImageDataUrl: () => {
        if (canvasRef.current) {
          return canvasRef.current.toDataURL('image/png');
        }
        return null;
      }
    };
    return () => {
      if ((window as any).chartRegistry) {
        delete (window as any).chartRegistry[type];
      }
    };
  }, [type, title]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseXInContainer = e.clientX - containerRect.left;
      let newPct = (mouseXInContainer / containerRect.width) * 100;
      
      if (newPct < 25) newPct = 25;
      if (newPct > 75) newPct = 75;
      
      if (reverseLayout) {
        setChartWidthPercent(100 - newPct);
      } else {
        setChartWidthPercent(newPct);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, reverseLayout]);

  const speciesOptions = useMemo(() => 
    Array.from(new Set(allForms.flatMap(f => f.production.map(p => p.species)))).sort(), 
  [allForms]);

  const gearOptions = useMemo(() => 
    Array.from(new Set(allForms.map(f => f.fishing.gearTypeGeneral || f.fishing.gearType || 'Não informado'))).sort(),
  [allForms]);

  const chartData = useMemo(() => {
    let filtered = allForms.filter(f => {
      const matchSpecies = localSpecies === 'all' || f.production.some(p => p.species === localSpecies);
      const matchGear = localGear === 'all' || (f.fishing.gearTypeGeneral || f.fishing.gearType || 'Não informado') === localGear;
      return matchSpecies && matchGear;
    });

    // Helper for box plot stats calculation without raw min and max, calculating standard deviation, outliers and extremes
    const calculateBoxPlotStats = (name: string, values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      if (n === 0) {
        return {
          name,
          whiskerMin: 0,
          q1_min: 0,
          median_q1: 0,
          q3_median: 0,
          max_q3: 0,
          realQ1: 0,
          realMedian: 0,
          realQ3: 0,
          stdDev: 0,
          outliers: [] as number[],
          extremes: [] as number[],
          whiskerMax: 0
        };
      }

      // Quantiles
      const q1 = sorted[Math.floor(n * 0.25)];
      const median = sorted[Math.floor(n * 0.5)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const iqr = q3 - q1;

      // Mean & Standard Deviation
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const mean = sum / n;
      const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);

      // Whisker limits (Tukey style: standard box plot uses 1.5 * IQR)
      const lowerLimit = q1 - 1.5 * iqr;
      const upperLimit = q3 + 1.5 * iqr;

      // Actual values within the limits (whisker endpoints)
      const valuesWithinLimits = sorted.filter(v => v >= lowerLimit && v <= upperLimit);
      const whiskerMin = valuesWithinLimits.length > 0 ? valuesWithinLimits[0] : q1;
      const whiskerMax = valuesWithinLimits.length > 0 ? valuesWithinLimits[valuesWithinLimits.length - 1] : q3;

      // Extreme limits
      const lowerExtremeLimit = q1 - 3.0 * iqr;
      const upperExtremeLimit = q3 + 3.0 * iqr;

      // Classify Outliers and Extremes
      const outliers: number[] = [];
      const extremes: number[] = [];

      sorted.forEach(v => {
        if (v < lowerLimit || v > upperLimit) {
          if (v < lowerExtremeLimit || v > upperExtremeLimit) {
            extremes.push(v);
          } else {
            outliers.push(v);
          }
        }
      });

      return {
        name,
        whiskerMin,
        q1_min: q1 - whiskerMin,
        median_q1: median - q1,
        q3_median: q3 - median,
        max_q3: whiskerMax - q3,
        realQ1: q1,
        realMedian: median,
        realQ3: q3,
        stdDev,
        outliers,
        extremes,
        whiskerMax
      };
    };

    if (type === 'moon') {
      const moonMap: Record<string, number[]> = {};
      filtered.forEach(f => {
        const tons = f.production.reduce((acc, p) => acc + p.weight, 0) / 1000;
        if (!moonMap[f.fishing.moonPhase]) moonMap[f.fishing.moonPhase] = [];
        moonMap[f.fishing.moonPhase].push(tons);
      });
      return Object.entries(moonMap).map(([phase, weights]) => calculateBoxPlotStats(phase, weights));
    }

    if (type === 'species') {
      const speciesMap: Record<string, number> = {};
      filtered.forEach(f => {
        f.production.forEach(p => {
          if (p.species) {
            speciesMap[p.species] = (speciesMap[p.species] || 0) + (p.weight / 1000);
          }
        });
      });
      return Object.entries(speciesMap)
        .map(([name, tons]) => ({ name, tons }))
        .sort((a, b) => b.tons - a.tons);
    }

    if (type === 'month') {
      const map: Record<string, number> = {};
      filtered.forEach(f => {
        const m = f.identification?.month;
        const y = f.identification?.year;
        if (!m || !y) return;
        const mLower = m.toLowerCase().trim();
        const key = `${mLower}_${y}`;
        const tons = f.production.reduce((acc, p) => acc + p.weight, 0) / 1000;
        map[key] = (map[key] || 0) + tons;
      });

      const MONTH_ABBREVIATIONS: Record<string, string> = {
        'janeiro': 'jan', 'fevereiro': 'fev', 'março': 'mar', 'abril': 'abr',
        'maio': 'mai', 'junho': 'jun', 'julho': 'jul', 'agosto': 'ago',
        'setembro': 'set', 'outubro': 'out', 'novembro': 'nov', 'dezembro': 'dez'
      };

      const MONTH_INDEXES: Record<string, number> = {
        'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
        'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
      };

      return Object.entries(map)
        .map(([key, tons]) => {
          const [mLower, yStr] = key.split('_');
          const yearNum = parseInt(yStr, 10);
          const mIdx = MONTH_INDEXES[mLower] !== undefined ? MONTH_INDEXES[mLower] : 0;
          const abbrev = MONTH_ABBREVIATIONS[mLower] || mLower.slice(0, 3);
          const yearTwoDigits = yStr.length >= 4 ? yStr.slice(-2) : yStr;
          const label = `${abbrev}/${yearTwoDigits}`;
          return {
            name: label,
            tons,
            sortKey: yearNum * 12 + mIdx
          };
        })
        .sort((a, b) => a.sortKey - b.sortKey);
    }

    if (type === 'production_group') {
      const map: Record<string, number> = {};
      const speciesGroupMap = new Map<string, string>();
      if (speciesList && speciesList.length > 0) {
        speciesList.forEach(s => {
          if (s.commonName && s.group) {
            speciesGroupMap.set(s.commonName.toLowerCase().trim(), s.group.trim());
          }
        });
      }

      filtered.forEach(f => {
        f.production.forEach(p => {
          const cleanSpecies = (p.species || '').toLowerCase().trim();
          let groupName = '';
          if (speciesGroupMap.has(cleanSpecies)) {
            groupName = speciesGroupMap.get(cleanSpecies)!;
          } else {
            groupName = getGroupLabel(p.groupType);
          }
          if (!groupName || groupName.toLowerCase().trim() === 'default') {
            groupName = 'Outros';
          }
          const tons = p.weight / 1000;
          map[groupName] = (map[groupName] || 0) + tons;
        });
      });
      return Object.entries(map)
        .map(([name, tons]) => ({ name, tons }))
        .sort((a, b) => b.tons - a.tons);
    }

    if (type === 'production_season') {
      const map: Record<string, number[]> = {};
      filtered.forEach(f => {
        const key = getSeasonLabel(f.identification.period);
        const tons = f.production.reduce((acc, p) => acc + p.weight, 0) / 1000;
        if (!map[key]) map[key] = [];
        map[key].push(tons);
      });
      return Object.entries(map).map(([name, weights]) => calculateBoxPlotStats(name, weights))
        .sort((a, b) => b.realMedian - a.realMedian);
    }

    if (type === 'revenue_species') {
      const speciesMap: Record<string, number> = {};
      filtered.forEach(f => {
        f.production.forEach(p => {
          if (p.species) {
            const revenue = p.weight * (p.price || 0);
            speciesMap[p.species] = (speciesMap[p.species] || 0) + revenue;
          }
        });
      });
      const sorted = Object.entries(speciesMap)
        .map(([name, val]) => ({ name, tons: val }))
        .sort((a, b) => b.tons - a.tons);
      
      if (sorted.length <= 10) {
        return sorted;
      } else {
        const top10 = sorted.slice(0, 10);
        const othersVal = sorted.slice(10).reduce((acc, curr) => acc + curr.tons, 0);
        return [...top10, { name: 'Outros', tons: othersVal }];
      }
    }

    if (type === 'revenue_gear') {
      const map: Record<string, number> = {};
      filtered.forEach(f => {
        const key = f.fishing.gearTypeGeneral || f.fishing.gearType || 'Não informado';
        const revenue = f.production.reduce((acc, p) => acc + (p.weight * (p.price || 0)), 0);
        map[key] = (map[key] || 0) + revenue;
      });
      return Object.entries(map)
        .map(([name, val]) => ({ name, tons: val }))
        .sort((a, b) => b.tons - a.tons);
    }

    if (type === 'revenue_local') {
      const map: Record<string, number> = {};
      filtered.forEach(f => {
        const key = f.identification.location;
        const revenue = f.production.reduce((acc, p) => acc + (p.weight * (p.price || 0)), 0);
        map[key] = (map[key] || 0) + revenue;
      });
      return Object.entries(map)
        .map(([name, val]) => ({ name, tons: val }))
        .sort((a, b) => b.tons - a.tons);
    }

    if (type === 'revenue_group') {
      const map: Record<string, number> = {};
      const speciesGroupMap = new Map<string, string>();
      if (speciesList && speciesList.length > 0) {
        speciesList.forEach(s => {
          if (s.commonName && s.group) {
            speciesGroupMap.set(s.commonName.toLowerCase().trim(), s.group.trim());
          }
        });
      }

      filtered.forEach(f => {
        f.production.forEach(p => {
          const cleanSpecies = (p.species || '').toLowerCase().trim();
          let groupName = '';
          if (speciesGroupMap.has(cleanSpecies)) {
            groupName = speciesGroupMap.get(cleanSpecies)!;
          } else {
            groupName = getGroupLabel(p.groupType);
          }
          if (!groupName || groupName.toLowerCase().trim() === 'default') {
            groupName = 'Outros';
          }
          const revenue = p.weight * (p.price || 0);
          map[groupName] = (map[groupName] || 0) + revenue;
        });
      });
      return Object.entries(map)
        .map(([name, val]) => ({ name, tons: val }))
        .sort((a, b) => b.tons - a.tons);
    }

    if (type === 'cpue_local' || type === 'cpue_month' || type === 'cpue_season' || type === 'cpue_moon' || type === 'cpue_year') {
      // CPUE Geral: soma total da produção do mês de cada pescador e depois é dividido por 30
      const fisherMonthMap: Record<string, { fishermanName: string; month: string; year: string; totalWeight: number; forms: LandingForm[] }> = {};
      filtered.forEach(f => {
        const name = (f.identification?.fishermanName || 'Não identificado').trim();
        const m = f.identification?.month?.toLowerCase().trim() || 'desconhecido';
        const y = f.identification?.year?.toString() || 'desconhecido';
        const key = `${name}_${m}_${y}`;
        const formWeight = f.production.reduce((acc, p) => acc + p.weight, 0); // weight in kg
        
        if (!fisherMonthMap[key]) {
          fisherMonthMap[key] = {
            fishermanName: name,
            month: m,
            year: y,
            totalWeight: 0,
            forms: []
          };
        }
        fisherMonthMap[key].totalWeight += formWeight;
        fisherMonthMap[key].forms.push(f);
      });

      const MONTH_ABBREVIATIONS: Record<string, string> = {
        'janeiro': 'jan', 'fevereiro': 'fev', 'março': 'mar', 'abril': 'abr',
        'maio': 'mai', 'junho': 'jun', 'julho': 'jul', 'agosto': 'ago',
        'setembro': 'set', 'outubro': 'out', 'novembro': 'nov', 'dezembro': 'dez'
      };

      const MONTH_INDEXES: Record<string, number> = {
        'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
        'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
      };

      if (type === 'cpue_year') {
        const cpueMap: Record<string, number[]> = {};
        Object.values(fisherMonthMap).forEach(fm => {
          const cpue = fm.totalWeight / 30; // CPUE Geral
          const key = fm.year;
          if (!cpueMap[key]) cpueMap[key] = [];
          cpueMap[key].push(cpue);
        });

        return Object.entries(cpueMap).map(([year, values]) => calculateBoxPlotStats(year, values))
          .sort((a, b) => a.name.localeCompare(b.name));
      }

      if (type === 'cpue_local') {
        const cpueMap: Record<string, number[]> = {};
        Object.values(fisherMonthMap).forEach(fm => {
          const cpue = fm.totalWeight / 30; // CPUE Geral (soma do mês dividido por 30)
          const locations = Array.from(new Set(fm.forms.map(f => f.identification.location).filter(Boolean)));
          if (locations.length === 0) {
            locations.push('Não informado');
          }
          locations.forEach(loc => {
            if (!cpueMap[loc]) cpueMap[loc] = [];
            cpueMap[loc].push(cpue);
          });
        });

        return Object.entries(cpueMap).map(([loc, values]) => calculateBoxPlotStats(loc, values))
          .sort((a, b) => b.realMedian - a.realMedian);
      }

      if (type === 'cpue_month') {
        const cpueMap: Record<string, number[]> = {};
        Object.values(fisherMonthMap).forEach(fm => {
          const cpue = fm.totalWeight / 30; // CPUE Geral
          const key = `${fm.month}_${fm.year}`;
          if (!cpueMap[key]) cpueMap[key] = [];
          cpueMap[key].push(cpue);
        });

        return Object.entries(cpueMap).map(([key, values]) => {
          const [mLower, yStr] = key.split('_');
          const yearNum = parseInt(yStr, 10) || 0;
          const mIdx = MONTH_INDEXES[mLower] !== undefined ? MONTH_INDEXES[mLower] : 0;
          const abbrev = MONTH_ABBREVIATIONS[mLower] || mLower.slice(0, 3);
          const yearTwoDigits = yStr.length >= 4 ? yStr.slice(-2) : yStr;
          const label = `${abbrev}/${yearTwoDigits}`;
          const stats = calculateBoxPlotStats(label, values);
          return {
            ...stats,
            sortKey: yearNum * 12 + mIdx
          };
        }).sort((a, b) => a.sortKey - b.sortKey);
      }

      if (type === 'cpue_season') {
        const cpueMap: Record<string, number[]> = {};
        Object.values(fisherMonthMap).forEach(fm => {
          const cpue = fm.totalWeight / 30; // CPUE Geral
          const seasons = Array.from(new Set(fm.forms.map(f => getSeasonLabel(f.identification.period)).filter(Boolean)));
          if (seasons.length === 0) {
            seasons.push('Não informado');
          }
          seasons.forEach(season => {
            if (!cpueMap[season]) cpueMap[season] = [];
            cpueMap[season].push(cpue);
          });
        });

        return Object.entries(cpueMap).map(([season, values]) => calculateBoxPlotStats(season, values))
          .sort((a, b) => b.realMedian - a.realMedian);
      }

      if (type === 'cpue_moon') {
        const cpueMap: Record<string, number[]> = {};
        Object.values(fisherMonthMap).forEach(fm => {
          const cpue = fm.totalWeight / 30; // CPUE Geral
          const moons = Array.from(new Set(fm.forms.map(f => f.fishing.moonPhase).filter(Boolean)));
          if (moons.length === 0) {
            moons.push('Não informado');
          }
          moons.forEach(moon => {
            if (!cpueMap[moon]) cpueMap[moon] = [];
            cpueMap[moon].push(cpue);
          });
        });

        return Object.entries(cpueMap).map(([moon, values]) => calculateBoxPlotStats(moon, values))
          .sort((a, b) => b.realMedian - a.realMedian);
      }
    }

    if (type === 'cpue_gear') {
      // CPUE por Arte de Pesca: soma total da arte de pesca do mês dividido por 30
      const gearMonthMap: Record<string, { gear: string; month: string; year: string; totalWeight: number }> = {};
      filtered.forEach(f => {
        const gear = f.fishing.gearTypeGeneral || f.fishing.gearType || 'Não informado';
        const m = f.identification?.month?.toLowerCase().trim() || 'desconhecido';
        const y = f.identification?.year?.toString() || 'desconhecido';
        const key = `${gear}_${m}_${y}`;
        const formWeight = f.production.reduce((acc, p) => acc + p.weight, 0); // weight in kg
        
        if (!gearMonthMap[key]) {
          gearMonthMap[key] = { gear, month: m, year: y, totalWeight: 0 };
        }
        gearMonthMap[key].totalWeight += formWeight;
      });

      const cpueMap: Record<string, number[]> = {};
      Object.values(gearMonthMap).forEach(gm => {
        const cpue = gm.totalWeight / 30;
        if (!cpueMap[gm.gear]) cpueMap[gm.gear] = [];
        cpueMap[gm.gear].push(cpue);
      });

      return Object.entries(cpueMap).map(([gear, values]) => calculateBoxPlotStats(gear, values))
        .sort((a, b) => b.realMedian - a.realMedian);
    }

    if (type === 'cpue_species') {
      // CPUE por espécies (Top 10 espécies): soma total do mês por espécie dividido por 30
      const speciesTotals: Record<string, number> = {};
      filtered.forEach(f => {
        f.production.forEach(p => {
          if (p.species) {
            const sp = p.species.trim();
            speciesTotals[sp] = (speciesTotals[sp] || 0) + p.weight;
          }
        });
      });

      const top10SpeciesNames = Object.entries(speciesTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]);

      const speciesMonthMap: Record<string, { species: string; month: string; year: string; totalWeight: number }> = {};
      filtered.forEach(f => {
        f.production.forEach(p => {
          if (!p.species) return;
          const sp = p.species.trim();
          if (!top10SpeciesNames.includes(sp)) return;
          const m = f.identification?.month?.toLowerCase().trim() || 'desconhecido';
          const y = f.identification?.year?.toString() || 'desconhecido';
          const key = `${sp}_${m}_${y}`;
          
          if (!speciesMonthMap[key]) {
            speciesMonthMap[key] = { species: sp, month: m, year: y, totalWeight: 0 };
          }
          speciesMonthMap[key].totalWeight += p.weight;
        });
      });

      const cpueMap: Record<string, number[]> = {};
      Object.values(speciesMonthMap).forEach(sm => {
        const cpue = sm.totalWeight / 30;
        if (!cpueMap[sm.species]) cpueMap[sm.species] = [];
        cpueMap[sm.species].push(cpue);
      });

      // Ensure even empty top 10 species are represented in the map
      top10SpeciesNames.forEach(sp => {
        if (!cpueMap[sp]) cpueMap[sp] = [];
      });

      return Object.entries(cpueMap).map(([species, values]) => calculateBoxPlotStats(species, values))
        .sort((a, b) => b.realMedian - a.realMedian);
    }

    if (type === 'production_year') {
      const map: Record<string, number> = {};
      filtered.forEach(f => {
        const key = f.identification?.year?.toString() || 'Não informado';
        const tons = f.production.reduce((acc, p) => acc + p.weight, 0) / 1000;
        map[key] = (map[key] || 0) + tons;
      });
      return Object.entries(map)
        .map(([name, tons]) => ({ name, tons }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (type === 'revenue_year') {
      const map: Record<string, number> = {};
      filtered.forEach(f => {
        const key = f.identification?.year?.toString() || 'Não informado';
        const revenue = f.production.reduce((acc, p) => acc + (p.weight * (p.price || 0)), 0);
        map[key] = (map[key] || 0) + revenue;
      });
      return Object.entries(map)
        .map(([name, val]) => ({ name, tons: val }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const map: Record<string, number> = {};
    filtered.forEach(f => {
      const key = type === 'local' ? f.identification.location : 
                  (f.fishing.gearTypeGeneral || f.fishing.gearType || 'Não informado');
      const tons = f.production.reduce((acc, p) => acc + p.weight, 0) / 1000;
      map[key] = (map[key] || 0) + tons;
    });
    return Object.entries(map).map(([name, tons]) => ({ name, tons })).sort((a,b) => b.tons - a.tons);
  }, [allForms, type, localSpecies, localGear, speciesList]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${title.toLowerCase().replace(/\s/g, '_')}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    let labels: string[] = [];
    let datasets: any[] = [];
    let activeType: 'bar' | 'line' = 'bar';

    labels = chartData.map(d => d.name);
    
    if (isBoxPlot) {
      activeType = 'bar';
      
      const isSeasonChart = type === 'production_season' || type === 'cpue_season';

      const getColorForName = (name: string) => {
        const n = name.toLowerCase().trim();
        if (isSeasonChart) {
          if (n === 'seco') return '#f97316';
          if (n === 'chuvoso') return '#3b82f6';
        }
        return '#2a5caa';
      };

      const getRgbaForName = (name: string, alpha: number) => {
        const n = name.toLowerCase().trim();
        if (isSeasonChart) {
          if (n === 'seco') return `rgba(249, 115, 22, ${alpha})`;
          if (n === 'chuvoso') return `rgba(59, 130, 246, ${alpha})`;
        }
        return `rgba(42, 92, 170, ${alpha})`;
      };

      const outliersData: any[] = [];
      const extremesData: any[] = [];

      chartData.forEach(d => {
        if (d.outliers) {
          d.outliers.forEach((v: number) => {
            outliersData.push({ x: d.name, y: v });
          });
        }
        if (d.extremes) {
          d.extremes.forEach((v: number) => {
            extremesData.push({ x: d.name, y: v });
          });
        }
      });

      datasets = [
        {
          label: 'Espaço Mínimo',
          data: chartData.map(d => d.whiskerMin || 0),
          backgroundColor: 'transparent',
          barPercentage: 0.5,
          categoryPercentage: 0.6,
        },
        {
          label: 'Limite Inferior (Whisker)',
          data: chartData.map(d => d.q1_min || 0),
          backgroundColor: chartData.map(d => getColorForName(d.name)),
          borderColor: 'transparent',
          borderWidth: 0,
          borderSkipped: false,
          barThickness: 0.8,
          categoryPercentage: 0.6,
        },
        {
          label: 'Caixa Q1-Mediana',
          data: chartData.map(d => d.median_q1 || 0),
          backgroundColor: chartData.map(d => getRgbaForName(d.name, 0.45)),
          borderColor: chartData.map(d => getColorForName(d.name)),
          borderWidth: 0.8,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
        },
        {
          label: 'Caixa Mediana-Q3',
          data: chartData.map(d => d.q3_median || 0),
          backgroundColor: chartData.map(d => getRgbaForName(d.name, 0.75)),
          borderColor: chartData.map(d => getColorForName(d.name)),
          borderWidth: 0.8,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
        },
        {
          label: 'Limite Superior (Whisker)',
          data: chartData.map(d => d.max_q3 || 0),
          backgroundColor: chartData.map(d => getColorForName(d.name)),
          borderColor: 'transparent',
          borderWidth: 0,
          borderSkipped: false,
          barThickness: 0.8,
          categoryPercentage: 0.6,
        }
      ];

      if (outliersData.length > 0) {
        datasets.push({
          type: 'line',
          label: 'Outliers',
          data: outliersData,
          showLine: false,
          pointStyle: 'circle',
          pointRadius: 3.3,
          pointBackgroundColor: 'transparent',
          pointBorderColor: '#000000',
          pointBorderWidth: 0.8,
          stacked: false,
          stack: 'unstacked_outliers'
        });
      }

      if (extremesData.length > 0) {
        datasets.push({
          type: 'line',
          label: 'Extremos',
          data: extremesData,
          showLine: false,
          pointStyle: 'star',
          pointRadius: 3.9,
          pointBackgroundColor: '#000000',
          pointBorderColor: '#000000',
          pointBorderWidth: 0.5,
          stacked: false,
          stack: 'unstacked_extremes'
        });
      }
    } else if (chartType === 'bar') {
      activeType = 'bar';
      datasets = [
        {
          label: isRevenue ? 'Receita (R$)' : 'Produção (t)',
          data: chartData.map(d => d.tons),
          backgroundColor: '#2a5caa',
          borderRadius: { topLeft: 3, topRight: 3, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: 'bottom',
          barPercentage: 0.75,
          categoryPercentage: 0.7,
        }
      ];
    } else {
      activeType = 'line';
      const tonsValues = chartData.map(d => d.tons || 0);
      const avgTons = tonsValues.length > 0 ? tonsValues.reduce((a, b) => a + b, 0) / tonsValues.length : 0;

      datasets = [
        {
          label: isRevenue ? 'Receita (R$)' : 'Produção (t)',
          data: chartData.map(d => d.tons),
          borderColor: '#2a5caa',
          backgroundColor: 'transparent',
          borderWidth: 2,
          fill: false,
          tension: 0.2,
          pointRadius: 3,
          pointBackgroundColor: '#2a5caa'
        },
        {
          label: 'IC 95% Inferior',
          data: chartData.map(d => (d.tons || 0) * 0.85),
          borderColor: 'transparent',
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'IC 95% Superior',
          data: chartData.map(d => (d.tons || 0) * 1.15),
          borderColor: 'transparent',
          pointRadius: 0,
          fill: '-1',
          backgroundColor: 'rgba(42, 92, 170, 0.12)',
        },
        {
          label: 'Média de Referência',
          data: chartData.map(() => avgTons),
          borderColor: '#c0392b',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ];
    }

    let currentYLabel = yAxisLabel;

    const options: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: isBoxPlot ? 'nearest' : 'index',
          intersect: isBoxPlot,
          callbacks: {
            label: function(context: any) {
              if (isBoxPlot) {
                const label = context.dataset.label;
                const unit = type.startsWith('cpue_') ? 'kg/dia' : 't';
                if (label === 'Outliers') {
                  return `Outlier: ${context.parsed.y.toFixed(2)} ${unit}`;
                }
                if (label === 'Extremos') {
                  return `Extremo: ${context.parsed.y.toFixed(2)} ${unit}`;
                }
                if (context.datasetIndex !== 2) return '';
                const item = chartData[context.dataIndex];
                if (!item) return '';
                const outliersStr = item.outliers && item.outliers.length > 0 
                  ? item.outliers.map((v: number) => v.toFixed(2)).join(', ') 
                  : 'Nenhum';
                const extremesStr = item.extremes && item.extremes.length > 0 
                  ? item.extremes.map((v: number) => v.toFixed(2)).join(', ') 
                  : 'Nenhum';
                return [
                  `Whisker Inferior: ${item.whiskerMin.toFixed(2)} ${unit}`,
                  `Q1 (25%): ${item.realQ1.toFixed(2)} ${unit}`,
                  `Mediana: ${item.realMedian.toFixed(2)} ${unit}`,
                  `Q3 (75%): ${item.realQ3.toFixed(2)} ${unit}`,
                  `Whisker Superior: ${item.whiskerMax.toFixed(2)} ${unit}`,
                  `Desvio Padrão: ${item.stdDev.toFixed(2)} ${unit}`,
                  `Outliers: ${outliersStr} ${unit}`,
                  `Extremos: ${extremesStr} ${unit}`
                ];
              }
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== undefined && context.parsed.y !== null) {
                if (isRevenue) {
                  label += 'R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else {
                  label += context.parsed.y.toFixed(2) + ' t';
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          stacked: isBoxPlot,
          grid: {
            display: false,
          },
          border: {
            display: true,
            color: '#c3c2b7',
          },
          ticks: {
            color: '#898781',
            font: {
              size: 10.5,
            },
          },
          title: {
            display: false,
          }
        },
        y: {
          stacked: isBoxPlot,
          grid: {
            display: false,
          },
          border: {
            display: true,
            color: '#c3c2b7',
          },
          ticks: {
            color: '#898781',
            font: {
              size: 10.5,
            },
            callback: function(value: any) {
              if (isRevenue) {
                if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
                if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                return 'R$ ' + value;
              }
              return value;
            }
          },
          title: {
            display: true,
            text: currentYLabel,
            color: '#898781',
            font: {
              size: 11,
              weight: 'bold',
            }
          }
        }
      }
    };

    chartInstanceRef.current = new ChartJS(canvasRef.current, {
      type: activeType as any,
      data: {
        labels,
        datasets
      },
      options
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [chartType, chartData, allForms]);

  let figNum = 1;
  let figDescription = '';
  if (type === 'production_year') {
    figNum = 1;
    figDescription = 'Análise da variação anual da produção pesqueira desembarcada.';
  } else if (type === 'local') {
    figNum = 2;
    figDescription = 'Distribuição espacial da produção pesqueira agregada por localidade de desembarque.';
  } else if (type === 'month') {
    figNum = 3;
    figDescription = 'Evolução temporal mensal da produção pesqueira desembarcada.';
  } else if (type === 'gear') {
    figNum = 4;
    figDescription = 'Distribuição metodológica da produção pesqueira de acordo com a arte de pesca utilizada.';
  } else if (type === 'production_group') {
    figNum = 5;
    figDescription = 'Distribuição da produção pesqueira agregada por grupo de recurso.';
  } else if (type === 'production_season') {
    figNum = 6;
    figDescription = 'Comparativo da produção pesqueira agregada entre as estações seca e chuvosa.';
  } else if (type === 'revenue_year') {
    figNum = 7;
    figDescription = 'Análise da variação anual da receita financeira estimada gerada.';
  } else if (type === 'revenue_species') {
    figNum = 8;
    figDescription = 'Distribuição da receita financeira estimada gerada pelas 10 principais espécies comercializadas.';
  } else if (type === 'revenue_gear') {
    figNum = 9;
    figDescription = 'Análise da receita financeira estimada de acordo com a arte de pesca utilizada.';
  } else if (type === 'revenue_local') {
    figNum = 10;
    figDescription = 'Distribuição da receita financeira estimada por localidade de desembarque.';
  } else if (type === 'revenue_group') {
    figNum = 11;
    figDescription = 'Distribuição da receita financeira estimada agregada por grupo de recurso.';
  } else if (type === 'cpue_year') {
    figNum = 12;
    figDescription = 'Análise de variação anual do rendimento (CPUE Geral em kg/dia).';
  } else if (type === 'cpue_local') {
    figNum = 13;
    figDescription = 'Distribuição do rendimento (CPUE Geral em kg/dia) por localidade de desembarque.';
  } else if (type === 'cpue_month') {
    figNum = 14;
    figDescription = 'Variação mensal do rendimento (CPUE Geral em kg/dia).';
  } else if (type === 'cpue_season') {
    figNum = 15;
    figDescription = 'Comparativo do rendimento (CPUE Geral em kg/dia) entre as estações seca e chuvosa.';
  } else if (type === 'cpue_moon') {
    figNum = 16;
    figDescription = 'Influência das fases lunares no rendimento (CPUE Geral em kg/dia).';
  } else if (type === 'cpue_gear') {
    figNum = 17;
    figDescription = 'Análise do rendimento (CPUE por Arte de Pesca em kg/dia) por método de captura.';
  } else if (type === 'cpue_species') {
    figNum = 18;
    figDescription = 'Distribuição do rendimento (CPUE por Espécie em kg/dia) das 10 principais espécies capturadas.';
  } else {
    figNum = 19;
    figDescription = 'Análise analítica de dados pesqueiros acumulados.';
  }

  const legendItems = useMemo(() => {
    return [
      { label: isRevenue ? 'Receita (R$)' : 'Produção (t)', color: '#2a5caa' },
      { label: 'IC 95% Sombreado', color: 'rgba(42,92,170,0.12)' },
      { label: 'Média de Referência', color: '#c0392b', isLine: true }
    ];
  }, [isRevenue]);

  return (
    <div className="flex flex-col w-full mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 px-2 gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{title}</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1">
            Figura {figNum}. {figDescription}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap justify-end">
          {/* Filtro Local de Espécie */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-bold">
            <span className="text-slate-400 dark:text-slate-500 uppercase">Espécie:</span>
            <select 
              value={localSpecies} 
              onChange={e => setLocalSpecies(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 font-extrabold outline-none cursor-pointer border-none p-0 pr-1 max-w-[100px]"
            >
              <option value="all">Todas</option>
              {speciesOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Filtro Local de Arte de Pesca */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-bold">
            <span className="text-slate-400 dark:text-slate-500 uppercase">Arte:</span>
            <select 
              value={localGear} 
              onChange={e => setLocalGear(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-300 font-extrabold outline-none cursor-pointer border-none p-0 pr-1 max-w-[100px]"
            >
              <option value="all">Todas</option>
              {gearOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {type !== 'moon' && type !== 'production_season' && (
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-550'}`} title="Barras"><BarChart3 size={14} /></button>
              <button onClick={() => setChartType('line')} className={`p-1.5 rounded-lg transition-all ${chartType === 'line' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-550'}`} title="Linhas"><LineIcon size={14} /></button>
            </div>
          )}

          <button 
            onClick={handleDownload}
            className="p-2 bg-slate-800 dark:bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors shadow-lg shrink-0"
            title="Download"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Altura aumentada em 20% (600px em vez de 500px) */}
        <div 
          ref={containerRef}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[600px] lg:h-[600px] w-full p-6 transition-all flex flex-col lg:flex-row gap-6"
        >
          {!reverseLayout ? (
            <>
              {/* Grafico (Esquerda) */}
              <div 
                className="w-full lg:w-2/3 h-[420px] lg:h-full pb-4 flex flex-col justify-between"
                style={isLargeScreen ? { width: `calc(${chartWidthPercent}% - 28px)`, flexShrink: 0 } : undefined}
              >
                <div className="relative flex-1 w-full h-[360px] lg:h-full">
                  <canvas ref={canvasRef} />
                </div>
                
                {/* Legenda Customizada (apenas se não for barra) */}
                {chartType !== 'bar' && (
                  <div className="flex items-center gap-4 flex-wrap mt-4 justify-center pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    {legendItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {item.isLine ? (
                          <span className="w-4 h-[2px] inline-block shrink-0" style={{ backgroundColor: item.color, borderStyle: item.label.includes('Referência') ? 'dashed' : 'solid' }}></span>
                        ) : (
                          <span 
                            className="w-[10px] h-[10px] inline-block shrink-0 rounded-[1px]" 
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                        <span>{item.label}</span>
                      </div>
                    ))}

                    {localSpecies !== 'all' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                        <span className="w-[10px] h-[10px] rounded-full inline-block shrink-0 bg-[#2a5caa]"></span>
                        <span>Filtro: </span>
                        <span className="font-bold">
                          {localSpecies} (
                          <span className="italic font-extrabold text-blue-600 dark:text-blue-400">
                            {SCIENTIFIC_NAMES[localSpecies.toLowerCase()] || 
                             speciesList?.find(s => s.commonName.toLowerCase() === localSpecies.toLowerCase())?.scientificName ||
                             'Espécie cadastrada'}
                          </span>
                          )
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divisor vertical interativo */}
              <div 
                onMouseDown={handleMouseDown}
                className={`hidden lg:flex w-2 hover:w-3 cursor-col-resize bg-slate-100 hover:bg-blue-500/50 dark:bg-slate-800/80 dark:hover:bg-blue-500/50 my-2 transition-all duration-150 items-center justify-center rounded-full group shrink-0 ${isDragging ? 'bg-blue-500 w-3' : ''}`}
                title="Arraste para redimensionar"
              >
                <div className="w-[2px] h-12 bg-slate-400 group-hover:bg-white rounded-full"></div>
              </div>

              {/* Tabela (Direita) */}
              <div 
                className="w-full lg:w-1/3 flex flex-col justify-between h-[320px] lg:h-full overflow-hidden"
                style={isLargeScreen ? { width: `calc(${100 - chartWidthPercent}% - 28px)`, flexShrink: 0 } : undefined}
              >
                <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-850 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        <th className="pb-2">{xAxisLabel}</th>
                        <th className="pb-2 text-right">{isRevenue ? 'Receita' : isCpue ? 'CPUE (Mediana)' : 'Produção'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-850/50">
                      {chartData.map((item: any, idx: number) => {
                        const val = item.tons !== undefined ? item.tons : (item.realMedian !== undefined ? item.realMedian : 0);
                        const totalTonsVal = chartData.reduce((acc, curr) => acc + (curr.tons !== undefined ? curr.tons : (curr.realMedian || 0)), 0);
                        const pct = totalTonsVal > 0 ? (val / totalTonsVal) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                            <td className="py-2.5 font-bold text-slate-700 dark:text-slate-300 truncate max-w-[70px] xs:max-w-[100px] md:max-w-[140px] xl:max-w-[180px]">
                              {item.name}
                            </td>
                            <td className="py-2.5 text-right font-black text-slate-850 dark:text-slate-200">
                              <div className="flex flex-col items-end">
                                <span>
                                  {isRevenue 
                                    ? `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                    : isCpue 
                                      ? `${val.toFixed(2)} kg/dia`
                                      : (val >= 0.01 ? `${val.toFixed(2)} t` : `${(val * 1000).toFixed(0)} kg`)}
                                </span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {chartData.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-slate-400 italic">
                            Sem dados disponíveis
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Rodapé da tabela com o total */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-2">
                  <span>{isCpue ? 'Média' : 'Total'}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-xs">
                    {(() => {
                      const total = chartData.reduce((acc: number, curr: any) => acc + (curr.tons !== undefined ? curr.tons : (curr.realMedian || 0)), 0);
                      if (isRevenue) {
                        return `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                      if (isCpue) {
                        const avg = chartData.length > 0 ? total / chartData.length : 0;
                        return `${avg.toFixed(2)} kg/dia`;
                      }
                      return total >= 0.01 ? `${total.toFixed(2)} t` : `${(total * 1000).toFixed(0)} kg`;
                    })()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Tabela (Esquerda) */}
              <div 
                className="w-full lg:w-1/3 flex flex-col justify-between h-[320px] lg:h-full overflow-hidden"
                style={isLargeScreen ? { width: `calc(${100 - chartWidthPercent}% - 28px)`, flexShrink: 0 } : undefined}
              >
                <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-850 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        <th className="pb-2">{xAxisLabel}</th>
                        <th className="pb-2 text-right">{isRevenue ? 'Receita' : isCpue ? 'CPUE (Mediana)' : 'Produção'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-850/50">
                      {chartData.map((item: any, idx: number) => {
                        const val = item.tons !== undefined ? item.tons : (item.realMedian !== undefined ? item.realMedian : 0);
                        const totalTonsVal = chartData.reduce((acc, curr) => acc + (curr.tons !== undefined ? curr.tons : (curr.realMedian || 0)), 0);
                        const pct = totalTonsVal > 0 ? (val / totalTonsVal) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                            <td className="py-2.5 font-bold text-slate-700 dark:text-slate-300 truncate max-w-[70px] xs:max-w-[100px] md:max-w-[140px] xl:max-w-[180px]">
                              {item.name}
                            </td>
                            <td className="py-2.5 text-right font-black text-slate-850 dark:text-slate-200">
                              <div className="flex flex-col items-end">
                                <span>
                                  {isRevenue 
                                    ? `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                    : isCpue 
                                      ? `${val.toFixed(2)} kg/dia`
                                      : (val >= 0.01 ? `${val.toFixed(2)} t` : `${(val * 1000).toFixed(0)} kg`)}
                                </span>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {chartData.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-slate-400 italic">
                            Sem dados disponíveis
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Rodapé da tabela com o total */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-2">
                  <span>{isCpue ? 'Média' : 'Total'}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-xs">
                    {(() => {
                      const total = chartData.reduce((acc: number, curr: any) => acc + (curr.tons !== undefined ? curr.tons : (curr.realMedian || 0)), 0);
                      if (isRevenue) {
                        return `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                      if (isCpue) {
                        const avg = chartData.length > 0 ? total / chartData.length : 0;
                        return `${avg.toFixed(2)} kg/dia`;
                      }
                      return total >= 0.01 ? `${total.toFixed(2)} t` : `${(total * 1000).toFixed(0)} kg`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Divisor vertical interativo */}
              <div 
                onMouseDown={handleMouseDown}
                className={`hidden lg:flex w-2 hover:w-3 cursor-col-resize bg-slate-100 hover:bg-blue-500/50 dark:bg-slate-800/80 dark:hover:bg-blue-500/50 my-2 transition-all duration-150 items-center justify-center rounded-full group shrink-0 ${isDragging ? 'bg-blue-500 w-3' : ''}`}
                title="Arraste para redimensionar"
              >
                <div className="w-[2px] h-12 bg-slate-400 group-hover:bg-white rounded-full"></div>
              </div>

              {/* Grafico (Direita) */}
              <div 
                className="w-full lg:w-2/3 h-[420px] lg:h-full pb-4 flex flex-col justify-between"
                style={isLargeScreen ? { width: `calc(${chartWidthPercent}% - 28px)`, flexShrink: 0 } : undefined}
              >
                <div className="relative flex-1 w-full h-[360px] lg:h-full">
                  <canvas ref={canvasRef} />
                </div>
                
                {/* Legenda Customizada (apenas se não for barra) */}
                {chartType !== 'bar' && (
                  <div className="flex items-center gap-4 flex-wrap mt-4 justify-center pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    {legendItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        {item.isLine ? (
                          <span className="w-4 h-[2px] inline-block shrink-0" style={{ backgroundColor: item.color, borderStyle: item.label.includes('Referência') ? 'dashed' : 'solid' }}></span>
                        ) : (
                          <span 
                            className="w-[10px] h-[10px] inline-block shrink-0 rounded-[1px]" 
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                        <span>{item.label}</span>
                      </div>
                    ))}

                    {localSpecies !== 'all' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                        <span className="w-[10px] h-[10px] rounded-full inline-block shrink-0 bg-[#2a5caa]"></span>
                        <span>Filtro: </span>
                        <span className="font-bold">
                          {localSpecies} (
                          <span className="italic font-extrabold text-blue-600 dark:text-blue-400">
                            {SCIENTIFIC_NAMES[localSpecies.toLowerCase()] || 
                             speciesList?.find(s => s.commonName.toLowerCase() === localSpecies.toLowerCase())?.scientificName ||
                             'Espécie cadastrada'}
                          </span>
                          )
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode, title: string, subtitle: string, style?: React.CSSProperties, innerStyle?: React.CSSProperties }> = ({ icon, title, subtitle, style, innerStyle }) => {
  return (
    <div className="border-b border-slate-200/60 dark:border-slate-800/60 pb-3 mb-6 mt-8" style={style}>
      <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400" style={innerStyle}>
        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-slate-150 uppercase tracking-widest font-sans">
            {title}
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<Props> = ({ forms, onNewForm, speciesList = [] }) => {
  // Filtros Globais
  const [globalYear, setGlobalYear] = useState<string>('all');
  const [globalLocation, setGlobalLocation] = useState<string>('all');
  const [globalSpecies, setGlobalSpecies] = useState<string>('all');
  const [speciesSearch, setSpeciesSearch] = useState<string>('');
  const [rankingType, setRankingType] = useState<'users' | 'collectors'>('users');
  const [showAllSpecies, setShowAllSpecies] = useState<boolean>(false);

  // Novos Filtros e Abas
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'reports'>('overview');
  const [reportsSearch, setReportsSearch] = useState<string>('');

  const filterOptions = useMemo(() => ({
    years: Array.from(new Set(forms.map(f => f.identification.year.toString()))).sort().reverse(),
    locations: Array.from(new Set(forms.map(f => f.identification.location))).sort(),
    species: Array.from(new Set(forms.flatMap(f => f.production.map(p => p.species)))).sort(),
  }), [forms]);

  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const matchYear = globalYear === 'all' || f.identification.year.toString() === globalYear;
      const matchLocation = globalLocation === 'all' || f.identification.location === globalLocation;
      const matchSpecies = globalSpecies === 'all' || f.production.some(p => p.species === globalSpecies);
      
      let matchDate = true;
      const recordDateStr = f.fishing?.arrivalDate || f.fishing?.departureDate || f.createdAt;
      if (recordDateStr) {
        const recordDatePart = recordDateStr.substring(0, 10);
        if (startDate && recordDatePart < startDate) {
          matchDate = false;
        }
        if (endDate && recordDatePart > endDate) {
          matchDate = false;
        }
      }
      
      return matchYear && matchLocation && matchSpecies && matchDate;
    });
  }, [forms, globalYear, globalLocation, globalSpecies, startDate, endDate]);

  useEffect(() => {
    const handlePdfExport = () => {
      exportToPdf(filteredForms, {
        year: globalYear,
        location: globalLocation,
        species: globalSpecies,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
    };
    window.addEventListener('trigger-pdf-export', handlePdfExport);
    return () => {
      window.removeEventListener('trigger-pdf-export', handlePdfExport);
    };
  }, [filteredForms, globalYear, globalLocation, globalSpecies, startDate, endDate]);

  const stats = useMemo(() => {
    const totalKg = filteredForms.reduce((acc, f) => acc + f.production.reduce((pAcc, p) => pAcc + p.weight, 0), 0);
    const totalTons = totalKg / 1000;
    const totalValue = filteredForms.reduce((acc, f) => acc + f.production.reduce((pAcc, p) => pAcc + (p.weight * p.price), 0), 0);

    const speciesCount: Record<string, number> = {};
    filteredForms.forEach(f => {
      f.production.forEach(p => {
        speciesCount[p.species] = (speciesCount[p.species] || 0) + p.weight;
      });
    });
    const topSpecies = Object.entries(speciesCount)
      .map(([name, weight]) => ({ name, weight: weight / 1000 }))
      .sort((a,b) => b.weight - a.weight)
      .slice(0, 6);

    const MONTH_INDEXES: Record<string, number> = {
      'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
      'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
    };

    let maxPeriodValue = -1;
    filteredForms.forEach(f => {
      const year = f.identification?.year;
      const mStr = f.identification?.month ? f.identification.month.toLowerCase().trim() : '';
      const mIdx = MONTH_INDEXES[mStr] !== undefined ? MONTH_INDEXES[mStr] : -1;
      if (year && mIdx !== -1) {
        const val = year * 12 + mIdx;
        if (val > maxPeriodValue) {
          maxPeriodValue = val;
        }
      }
    });

    let currentPeriodForms = filteredForms;
    let previousPeriodForms: typeof filteredForms = [];

    if (maxPeriodValue !== -1) {
      currentPeriodForms = filteredForms.filter(f => {
        const year = f.identification?.year;
        const mStr = f.identification?.month ? f.identification.month.toLowerCase().trim() : '';
        const mIdx = MONTH_INDEXES[mStr] !== undefined ? MONTH_INDEXES[mStr] : -1;
        return year && mIdx !== -1 && (year * 12 + mIdx === maxPeriodValue);
      });

      previousPeriodForms = forms.filter(f => {
        // Apply only non-temporal global filters to match the current selection context
        const matchLocation = globalLocation === 'all' || f.identification.location === globalLocation;
        const matchSpecies = globalSpecies === 'all' || f.production.some(p => p.species === globalSpecies);
        if (!matchLocation || !matchSpecies) return false;

        const year = f.identification?.year;
        const mStr = f.identification?.month ? f.identification.month.toLowerCase().trim() : '';
        const mIdx = MONTH_INDEXES[mStr] !== undefined ? MONTH_INDEXES[mStr] : -1;
        return year && mIdx !== -1 && (year * 12 + mIdx === maxPeriodValue - 1);
      });
    }

    if (currentPeriodForms.length === 0) {
      currentPeriodForms = filteredForms;
    }

    // Tons comparison
    const currentTons = currentPeriodForms.reduce((acc, f) => acc + f.production.reduce((pAcc, p) => pAcc + p.weight, 0), 0) / 1000;
    const previousTons = previousPeriodForms.reduce((acc, f) => acc + f.production.reduce((pAcc, p) => pAcc + p.weight, 0), 0) / 1000;
    const tonsDiffPct = previousTons > 0 
      ? ((currentTons - previousTons) / previousTons) * 100 
      : (currentTons > 0 ? 100 : 0);

    // Value comparison
    const currentVal = currentPeriodForms.reduce((acc, f) => acc + f.production.reduce((pAcc, p) => pAcc + (p.weight * p.price), 0), 0);
    const previousVal = previousPeriodForms.reduce((acc, f) => acc + f.production.reduce((pAcc, p) => pAcc + (p.weight * p.price), 0), 0);
    const valueDiffPct = previousVal > 0 
      ? ((currentVal - previousVal) / previousVal) * 100 
      : (currentVal > 0 ? 100 : 0);

    // Desembarques count comparison
    const currentDesembarquesCount = currentPeriodForms.length;
    const previousDesembarquesCount = previousPeriodForms.length;
    const desembarquesDiffPct = previousDesembarquesCount > 0 
      ? ((currentDesembarquesCount - previousDesembarquesCount) / previousDesembarquesCount) * 100 
      : (currentDesembarquesCount > 0 ? 100 : 0);

    // Pescadores count comparison
    const currentPescadoresSet = new Set(currentPeriodForms.map(f => f.identification?.fishermanName?.trim()).filter(Boolean));
    const currentPescadoresCount = currentPescadoresSet.size;
    const previousPescadoresCount = new Set(previousPeriodForms.map(f => f.identification?.fishermanName?.trim()).filter(Boolean)).size;
    const pescadoresDiffPct = previousPescadoresCount > 0 
      ? ((currentPescadoresCount - previousPescadoresCount) / previousPescadoresCount) * 100 
      : (currentPescadoresCount > 0 ? 100 : 0);

    // Espécies count comparison
    const currentEspeciesSet = new Set(currentPeriodForms.flatMap(f => f.production.map(p => p.species?.trim())).filter(Boolean));
    const currentEspeciesCount = currentEspeciesSet.size;
    const previousEspeciesCount = new Set(previousPeriodForms.flatMap(f => f.production.map(p => p.species?.trim())).filter(Boolean)).size;
    const especiesDiffPct = previousEspeciesCount > 0 
      ? ((currentEspeciesCount - previousEspeciesCount) / previousEspeciesCount) * 100 
      : (currentEspeciesCount > 0 ? 100 : 0);

    // Localidades count comparison
    const currentLocalidadesSet = new Set(currentPeriodForms.map(f => f.identification?.location?.trim()).filter(Boolean));
    const currentLocalidadesCount = currentLocalidadesSet.size;
    const previousLocalidadesCount = new Set(previousPeriodForms.map(f => f.identification?.location?.trim()).filter(Boolean)).size;
    const localidadesDiffPct = previousLocalidadesCount > 0 
      ? ((currentLocalidadesCount - previousLocalidadesCount) / previousLocalidadesCount) * 100 
      : (currentLocalidadesCount > 0 ? 100 : 0);

    return { 
      totalTons, 
      totalValue, 
      topSpecies, 
      tonsDiffPct, 
      valueDiffPct,
      desembarquesCount: currentDesembarquesCount,
      desembarquesDiffPct,
      pescadoresCount: currentPescadoresCount,
      pescadoresDiffPct,
      especiesCount: currentEspeciesCount,
      especiesDiffPct,
      localidadesCount: currentLocalidadesCount,
      localidadesDiffPct
    };
  }, [filteredForms, forms, globalLocation, globalSpecies]);

  const speciesProductionList = useMemo(() => {
    const map: Record<string, { weight: number; scientificName?: string }> = {};
    
    const speciesLookup = new Map<string, string>();
    if (speciesList) {
      speciesList.forEach(s => {
        if (s.commonName && s.scientificName) {
          speciesLookup.set(s.commonName.toLowerCase().trim(), s.scientificName);
        }
      });
    }

    filteredForms.forEach(f => {
      f.production.forEach(p => {
        if (p.species) {
          const key = p.species.trim();
          const keyLower = key.toLowerCase();
          
          if (!map[key]) {
            let sci = p.scientificName || speciesLookup.get(keyLower) || '';
            map[key] = { weight: 0, scientificName: sci };
          }
          map[key].weight += p.weight;
          
          if (!map[key].scientificName) {
            const sci = p.scientificName || speciesLookup.get(keyLower) || '';
            if (sci) {
              map[key].scientificName = sci;
            }
          }
        }
      });
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        commonName: name,
        scientificName: data.scientificName || 'Não informado',
        totalWeight: data.weight / 1000,
      }))
      .sort((a, b) => b.totalWeight - a.totalWeight);
  }, [filteredForms, speciesList]);

  const filteredSpeciesProduction = useMemo(() => {
    if (!speciesSearch.trim()) return speciesProductionList;
    const query = speciesSearch.toLowerCase().trim();
    return speciesProductionList.filter(
      item =>
        item.commonName.toLowerCase().includes(query) ||
        item.scientificName.toLowerCase().includes(query)
    );
  }, [speciesProductionList, speciesSearch]);

  const collectorRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredForms.forEach(f => {
      // Excluir dados importados em lote, de anos passados ou legados (requer isManualEntry === true)
      if (f.identification?.isManualEntry !== true) {
        return;
      }
      const collector = (f.identification?.collectorName || 'Agente de Campo').trim();
      if (collector) {
        counts[collector] = (counts[collector] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredForms]);

  const userRanking = useMemo(() => {
    const counts: Record<string, { email: string; name: string; count: number }> = {};
    filteredForms.forEach(f => {
      // Excluir dados importados em lote, de anos passados ou legados (requer isManualEntry === true)
      if (f.identification?.isManualEntry !== true) {
        return;
      }
      const email = f.identification?.createdByEmail || 'Acesso Offline';
      const name = f.identification?.createdByUsername || (email !== 'Acesso Offline' ? email.split('@')[0] : 'Usuário Local');
      
      const key = email.toLowerCase();
      if (!counts[key]) {
        counts[key] = { email, name, count: 0 };
      }
      counts[key].count += 1;
    });
    
    return Object.values(counts)
      .sort((a, b) => b.count - a.count);
  }, [filteredForms]);

  const currentRanking = useMemo(() => {
    if (rankingType === 'users') {
      return userRanking.map(item => ({
        name: item.name,
        subtext: item.email !== 'Acesso Offline' ? item.email : undefined,
        count: item.count
      }));
    } else {
      return collectorRanking.map(item => ({
        name: item.name,
        subtext: undefined,
        count: item.count
      }));
    }
  }, [rankingType, userRanking, collectorRanking]);

  const topFishermen = useMemo(() => {
    const map: Record<string, number> = {};
    filteredForms.forEach(f => {
      const name = (f.identification?.fishermanName || 'Não identificado').trim();
      const tons = f.production ? f.production.reduce((acc, p) => acc + p.weight, 0) / 1000 : 0;
      map[name] = (map[name] || 0) + tons;
    });
    return Object.entries(map)
      .map(([name, totalTons]) => ({ name, totalTons }))
      .sort((a, b) => b.totalTons - a.totalTons)
      .slice(0, 7);
  }, [filteredForms]);

  const fishermanProductivity = useMemo(() => {
    const map: Record<string, {
      name: string;
      totalWeight: number;
      totalValue: number;
      tripsCount: number;
      totalFishingDays: number;
      species: Record<string, number>;
    }> = {};

    filteredForms.forEach(f => {
      const name = (f.identification?.fishermanName || 'Não Informado').trim();
      const weight = f.production ? f.production.reduce((acc, p) => acc + p.weight, 0) : 0;
      const value = f.production ? f.production.reduce((acc, p) => acc + (p.weight * (p.price || 0)), 0) : 0;
      const days = f.fishing?.fishingDays || 1;

      if (!map[name]) {
        map[name] = {
          name,
          totalWeight: 0,
          totalValue: 0,
          tripsCount: 0,
          totalFishingDays: 0,
          species: {}
        };
      }

      map[name].totalWeight += weight;
      map[name].totalValue += value;
      map[name].tripsCount += 1;
      map[name].totalFishingDays += days;

      f.production?.forEach(p => {
        map[name].species[p.species] = (map[name].species[p.species] || 0) + p.weight;
      });
    });

    return Object.values(map).map(f => {
      let mainSpecies = 'Nenhuma';
      let maxSpeciesWeight = 0;
      Object.entries(f.species).forEach(([spec, w]) => {
        if (w > maxSpeciesWeight) {
          maxSpeciesWeight = w;
          mainSpecies = spec;
        }
      });

      const cpue = f.totalFishingDays > 0 ? f.totalWeight / f.totalFishingDays : 0;

      return {
        ...f,
        mainSpecies,
        cpue
      };
    }).sort((a, b) => b.totalWeight - a.totalWeight);
  }, [filteredForms]);

  const filteredFishermanProductivity = useMemo(() => {
    return fishermanProductivity.filter(f => 
      f.name.toLowerCase().includes(reportsSearch.toLowerCase())
    );
  }, [fishermanProductivity, reportsSearch]);

  const reportsStats = useMemo(() => {
    const activeCount = fishermanProductivity.length;
    const totalWeight = fishermanProductivity.reduce((acc, f) => acc + f.totalWeight, 0);
    const totalDays = fishermanProductivity.reduce((acc, f) => acc + f.totalFishingDays, 0);
    const avgCpue = totalDays > 0 ? totalWeight / totalDays : 0;
    const bestProducer = fishermanProductivity.length > 0 ? fishermanProductivity[0] : null;

    return {
      activeCount,
      totalWeight,
      avgCpue,
      bestProducer
    };
  }, [fishermanProductivity]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-32 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest mb-2">
            <Layout size={14} /> Painel de Inteligência
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Análises
          </h1>
        </div>
        <button 
          onClick={onNewForm}
          className="flex items-center justify-center gap-3 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3.5 md:px-8 md:py-4 rounded-2xl font-black hover:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-xl uppercase text-xs tracking-widest w-full md:w-auto"
        >
          Novo Desembarque <ArrowRight size={18} />
        </button>
      </div>

      {/* SELETOR DE ABAS DO DASHBOARD */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 select-none">
        <button
          type="button"
          onClick={() => setDashboardSubTab('overview')}
          className={`pb-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            dashboardSubTab === 'overview'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          Visão Geral
        </button>
        <button
          type="button"
          onClick={() => setDashboardSubTab('reports')}
          className={`pb-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            dashboardSubTab === 'reports'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          📊 Relatórios de Produtividade
        </button>
      </div>

      {/* BARRA DE FILTROS GLOBAIS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center gap-4">
        <div className="flex items-center justify-between md:justify-start gap-2 text-slate-400 dark:text-slate-500 pb-3 md:pb-0 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 md:pr-4 w-full md:w-auto shrink-0">
           <div className="flex items-center gap-2">
              <Filter size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Filtros Globais</span>
           </div>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row md:flex-wrap gap-3 w-full md:w-auto">
           <select 
             className="w-full md:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2.5 md:p-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
             value={globalYear}
             onChange={e => setGlobalYear(e.target.value)}
           >
              <option value="all">Todos os Anos</option>
              {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
           </select>

           <select 
             className="w-full md:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2.5 md:p-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
             value={globalLocation}
             onChange={e => setGlobalLocation(e.target.value)}
           >
              <option value="all">Todas as Localidades</option>
              {filterOptions.locations.map(l => <option key={l} value={l}>{l}</option>)}
           </select>

           <select 
             className="w-full md:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2.5 md:p-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
             value={globalSpecies}
             onChange={e => setGlobalSpecies(e.target.value)}
           >
              <option value="all">Todas as Espécies</option>
              {filterOptions.species.map(s => <option key={s} value={s}>{s}</option>)}
           </select>

           {/* DATE RANGE INPUTS */}
           <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2 md:py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-350">
             <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase select-none">Início:</span>
             <input 
               type="date" 
               className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 dark:text-slate-200 w-28 cursor-pointer" 
               value={startDate}
               onChange={e => setStartDate(e.target.value)}
             />
           </div>

           <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-2 md:py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-350">
             <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase select-none">Fim:</span>
             <input 
               type="date" 
               className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 dark:text-slate-200 w-28 cursor-pointer" 
               value={endDate}
               onChange={e => setEndDate(e.target.value)}
             />
           </div>
        </div>

        <button 
          onClick={() => { 
            setGlobalYear('all'); 
            setGlobalLocation('all'); 
            setGlobalSpecies('all'); 
            setStartDate(''); 
            setEndDate(''); 
          }}
          className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest text-center md:text-left self-center md:self-auto pt-2 md:pt-0 cursor-pointer"
        >
          Resetar
        </button>
      </div>

      <div style={{ display: dashboardSubTab === 'overview' ? 'block' : 'none' }}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-4">
          {/* Lado Esquerdo: Cards de Stats & Progresso de Espécies Dominantes */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="grid grid-cols-1 gap-6">
              {/* PRODUÇÃO TOTAL */}
              <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-100 dark:shadow-none text-white flex flex-col justify-between relative overflow-hidden h-40">
                <div className="flex justify-between items-start w-full relative z-10">
                  <div>
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Produção Total</p>
                    <p className="text-4xl font-black">{stats.totalTons.toFixed(2)} <span className="text-xl opacity-60">t</span></p>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <TrendingUp size={20} />
                  </div>
                </div>

                {/* Badge do período anterior */}
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-white rounded-lg text-xs font-semibold">
                    <span className="font-bold">{stats.tonsDiffPct >= 0 ? '↑' : '↓'} {Math.abs(stats.tonsDiffPct).toFixed(1)}%</span>
                    <span className="text-blue-100 opacity-85 text-[10px] font-normal">vs mês anterior</span>
                  </div>
                </div>

                {/* Wave SVG background */}
                <svg className="absolute bottom-0 right-0 w-2/3 h-28 text-white/15 pointer-events-none" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0,85 C40,65 80,105 120,40 C160,-15 180,75 200,20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* VALOR ESTIMADO */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between h-40">
                <div className="flex justify-between items-start w-full">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Valor Estimado</p>
                    <p className="text-4xl font-black text-slate-800 dark:text-slate-100">
                      <span className="text-xl text-slate-300 dark:text-slate-600">R$</span> {stats.totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold text-lg">
                    $
                  </div>
                </div>

                {/* Badge do período anterior */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold">
                    <span className="font-bold">{stats.valueDiffPct >= 0 ? '↑' : '↓'} {Math.abs(stats.valueDiffPct).toFixed(1)}%</span>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-normal">vs mês anterior</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ESPÉCIES DOMINANTES */}
            <div className="bg-slate-900 dark:bg-slate-900 border border-transparent dark:border-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-white flex flex-col justify-between flex-1 mt-6">
              <div 
                className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest mb-4"
                style={{ marginBottom: '8px', paddingLeft: '0px', marginLeft: '0px', marginRight: '8px', marginTop: '-5px' }}
              >
                 <Award size={14} /> Espécies Dominantes
              </div>
              <div className="space-y-4 flex-1">
                 {stats.topSpecies.length > 0 ? stats.topSpecies.map((s, idx) => (
                   <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-slate-200 uppercase">{s.name}</span>
                        <span className="text-[10px] font-black text-blue-400">{s.weight.toFixed(2)} t</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(s.weight / stats.topSpecies[0].weight) * 100}%` }}></div>
                      </div>
                   </div>
                 )) : (
                   <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">Aguardando dados...</div>
                 )}
              </div>
            </div>
          </div>

          {/* Lado Direito: Novo ranking dinâmico do Top 7 Pescadores e Resumo do Período */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* TOP 7 PESCADORES */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider mb-6">
                  <Users size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>TOP 7 PESCADORES (PRODUÇÃO AGREGADA)</span>
                </div>
                <div className="space-y-1">
                  {topFishermen.length > 0 ? (
                    topFishermen.map((f, idx) => {
                      const maxTons = topFishermen[0]?.totalTons || 1;
                      const pct = maxTons > 0 ? (12 + (f.totalTons / maxTons) * 88) : 12;

                      return (
                        <div 
                          key={idx} 
                          className="group flex items-center gap-4 py-1 px-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/25 rounded-2xl transition-all duration-300 cursor-pointer border-b border-slate-100/50 dark:border-slate-800/30 last:border-0"
                        >
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex justify-between items-baseline gap-2">
                              <span className={`text-[12px] truncate uppercase transition-colors ${
                                idx === 0 
                                  ? 'font-bold text-slate-900 dark:text-slate-100' 
                                  : 'font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                              }`}>
                                {f.name}
                              </span>
                              <span className={`text-[12px] tracking-tight font-extrabold shrink-0 transition-colors ${
                                idx === 0 
                                  ? 'text-blue-600 dark:text-blue-400' 
                                  : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                              }`}>
                                {f.totalTons.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">t</span>
                              </span>
                            </div>

                            <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ease-out ${
                                  idx === 0 
                                    ? 'bg-blue-600 dark:bg-blue-500' 
                                    : 'bg-blue-500 dark:bg-blue-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 italic text-sm py-12">
                      Nenhum pescador com produção registrada...
                    </div>
                  )}
                </div>
              </div>
              
              {/* Card Footer */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 py-4 px-8 border-t border-slate-100 dark:border-slate-800/60 -mx-8 -mb-8 rounded-b-[2.5rem] flex items-center justify-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer mt-6">
                <span className="uppercase tracking-widest text-[10px]">Ver ranking completo</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* RESUMO DO MÊS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider mb-6">
                <Calendar className="text-blue-600 dark:text-blue-400" size={14} />
                <span>RESUMO DO MÊS</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y-0 divide-x-0 md:divide-x divide-slate-100 dark:divide-slate-800/80">
                {/* Desembarques */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-3">
                    <Anchor size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Desembarques</span>
                  <span className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.desembarquesCount}</span>
                  <div className="flex items-center gap-0.5 text-xs font-extrabold text-emerald-500 dark:text-emerald-400 mt-1.5">
                    <span>{stats.desembarquesDiffPct >= 0 ? '↑' : '↓'}</span>
                    <span>{Math.abs(stats.desembarquesDiffPct).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Pescadores */}
                <div className="flex flex-col items-center text-center pl-0 md:pl-2">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-3">
                    <User size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Pescadores</span>
                  <span className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.pescadoresCount}</span>
                  <div className="flex items-center gap-0.5 text-xs font-extrabold text-emerald-500 dark:text-emerald-400 mt-1.5">
                    <span>{stats.pescadoresDiffPct >= 0 ? '↑' : '↓'}</span>
                    <span>{Math.abs(stats.pescadoresDiffPct).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Espécies */}
                <div className="flex flex-col items-center text-center pl-0 md:pl-2">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-3">
                    <Fish size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Espécies</span>
                  <span className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.especiesCount}</span>
                  <div className="flex items-center gap-0.5 text-xs font-extrabold text-emerald-500 dark:text-emerald-400 mt-1.5">
                    <span>{stats.especiesDiffPct >= 0 ? '↑' : '↓'}</span>
                    <span>{Math.abs(stats.especiesDiffPct).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Localidades */}
                <div className="flex flex-col items-center text-center pl-0 md:pl-2">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-3">
                    <MapPin size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Localidades</span>
                  <span className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.localidadesCount}</span>
                  <div className="flex items-center gap-0.5 text-xs font-extrabold text-emerald-500 dark:text-emerald-400 mt-1.5">
                    <span>{stats.localidadesDiffPct >= 0 ? '↑' : '↓'}</span>
                    <span>{Math.abs(stats.localidadesDiffPct).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>


      <div className="grid grid-cols-1 gap-8 pb-4">
        <ProfessionalChartCard 
          title="Produção por Ano" 
          allForms={filteredForms}
          type="production_year"
          xAxisLabel="Série Anual"
          yAxisLabel="Toneladas (t)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="Produção por Localidade" 
          allForms={filteredForms}
          type="local"
          xAxisLabel="Distribuição Geográfica"
          yAxisLabel="Toneladas (t)"
          speciesList={speciesList}
          reverseLayout={true}
        />

        <ProfessionalChartCard 
          title="Produção Mensal" 
          allForms={filteredForms}
          type="month"
          xAxisLabel="Série Histórica"
          yAxisLabel="Toneladas (t)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="Produção por Arte de Pesca" 
          allForms={filteredForms}
          type="gear"
          xAxisLabel="Tipos de Arte de Pesca"
          yAxisLabel="Toneladas (t)"
          speciesList={speciesList}
          reverseLayout={true}
        />

        <ProfessionalChartCard 
          title="Produção x Grupo" 
          allForms={filteredForms}
          type="production_group"
          xAxisLabel="Grupo de Recurso"
          yAxisLabel="Toneladas (t)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="Produção por Estação" 
          allForms={filteredForms}
          type="production_season"
          xAxisLabel="Estação (Seco/Chuvoso)"
          yAxisLabel="Toneladas (t)"
          speciesList={speciesList}
          reverseLayout={true}
        />

         <ProfessionalChartCard 
          title="Receita por Ano" 
          allForms={filteredForms}
          type="revenue_year"
          xAxisLabel="Série Anual"
          yAxisLabel="Receita (R$)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="Receita por Espécie (Top 10)" 
          allForms={filteredForms}
          type="revenue_species"
          xAxisLabel="Principais Espécies"
          yAxisLabel="Receita (R$)"
          speciesList={speciesList}
          reverseLayout={true}
        />

        <ProfessionalChartCard 
          title="Receita por Arte de Pesca" 
          allForms={filteredForms}
          type="revenue_gear"
          xAxisLabel="Tipos de Arte de Pesca (Geral)"
          yAxisLabel="Receita (R$)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="Receita por Localidade" 
          allForms={filteredForms}
          type="revenue_local"
          xAxisLabel="Distribuição Geográfica"
          yAxisLabel="Receita (R$)"
          speciesList={speciesList}
          reverseLayout={true}
        />

        <ProfessionalChartCard 
          title="Receita por Grupo" 
          allForms={filteredForms}
          type="revenue_group"
          xAxisLabel="Grupo de Recurso"
          yAxisLabel="Receita (R$)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="CPUE Geral por Ano" 
          allForms={filteredForms}
          type="cpue_year"
          xAxisLabel="Série Anual"
          yAxisLabel="Rendimento (kg/dia)"
          speciesList={speciesList}
          reverseLayout={true}
        />

        <ProfessionalChartCard 
          title="CPUE Geral por Localidade" 
          allForms={filteredForms}
          type="cpue_local"
          xAxisLabel="Localidades"
          yAxisLabel="Rendimento (kg/dia)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="CPUE Geral por Mês" 
          allForms={filteredForms}
          type="cpue_month"
          xAxisLabel="Série Histórica"
          yAxisLabel="Rendimento (kg/dia)"
          speciesList={speciesList}
          reverseLayout={true}
        />

        <ProfessionalChartCard 
          title="CPUE Geral por Estação" 
          allForms={filteredForms}
          type="cpue_season"
          xAxisLabel="Estação (Seco/Chuvoso)"
          yAxisLabel="Rendimento (kg/dia)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="CPUE Geral por Fase da Lua" 
          allForms={filteredForms}
          type="cpue_moon"
          xAxisLabel="Fase da Lua"
          yAxisLabel="Rendimento (kg/dia)"
          speciesList={speciesList}
          reverseLayout={true}
        />

        <ProfessionalChartCard 
          title="CPUE por Arte de Pesca" 
          allForms={filteredForms}
          type="cpue_gear"
          xAxisLabel="Tipos de Arte de Pesca (Geral)"
          yAxisLabel="Rendimento (kg/dia)"
          speciesList={speciesList}
          reverseLayout={false}
        />

        <ProfessionalChartCard 
          title="CPUE por Espécie (Top 10)" 
          allForms={filteredForms}
          type="cpue_species"
          xAxisLabel="Principais Espécies"
          yAxisLabel="Rendimento (kg/dia)"
          speciesList={speciesList}
          reverseLayout={true}
        />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Tabela de Produção por Espécies */}
        <div className="flex flex-col w-full animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-2">
            <div>
              <h3 className="text-lg font-black text-slate-850 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <Fish className="text-blue-600 shrink-0" size={18} />
                Tabela de Espécies
              </h3>
            </div>
            
            {/* Campo de Busca Rápida */}
            <div className="relative w-full sm:w-48">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Buscar..."
                value={speciesSearch}
                onChange={e => setSpeciesSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-9 pr-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-250 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
              />
              {speciesSearch && (
                <button 
                  onClick={() => setSpeciesSearch('')} 
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 flex flex-col h-[520px] justify-between">
            {filteredSpeciesProduction.length > 0 ? (
               <div className="overflow-y-auto pr-1 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      <th className="pb-3 pr-4">Nome Popular</th>
                      <th className="pb-3 pl-4 text-right">Produção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(showAllSpecies ? filteredSpeciesProduction : filteredSpeciesProduction.slice(0, 6)).map((item, idx) => {
                      const maxVal = speciesProductionList[0]?.totalWeight || 1;
                      const pct = (item.totalWeight / maxVal) * 100;
                      return (
                        <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex flex-col animate-in fade-in duration-200">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[140px]">
                                {item.commonName}
                              </span>
                              <span className="text-[9px] italic text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[140px]">
                                {item.scientificName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-extrabold text-slate-850 dark:text-slate-100">
                                {item.totalWeight >= 0.01 ? `${item.totalWeight.toFixed(2)} t` : `${(item.totalWeight * 1000).toFixed(0)} kg`}
                              </span>
                              <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center space-y-2 flex-1 flex flex-col justify-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full inline-block text-slate-400 mx-auto">
                  <Fish size={20} />
                </div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Nenhuma espécie encontrada</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
              {filteredSpeciesProduction.length > 6 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllSpecies(!showAllSpecies)}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    {showAllSpecies ? (
                      <>
                        <span>Ver menos</span>
                        <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        <span>Todas ({filteredSpeciesProduction.length})</span>
                        <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span>Total de Espécies</span>
                <span className="text-blue-600 dark:text-blue-400 font-extrabold text-xs">{speciesProductionList.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela Agrupada de Rankings (Digitadores / Coletores) */}
        <div className="flex flex-col w-full animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-2">
            <div>
              <h3 className="text-lg font-black text-slate-850 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <Award className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />
                {rankingType === 'users' ? 'Ranking de Digitadores' : 'Ranking de Coletores'}
              </h3>
            </div>
            
            {/* Seletor Segmentado */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
              <button 
                onClick={() => setRankingType('users')}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'users' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
              >
                Digitadores
              </button>
              <button 
                onClick={() => setRankingType('collectors')}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'collectors' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
              >
                Coletores
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 flex flex-col h-[520px] justify-between">
            {currentRanking.length > 0 ? (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {currentRanking.map((item, idx) => {
                  const maxCount = currentRanking[0]?.count || 1;
                  const pct = (item.count / maxCount) * 100;

                  let rankBg = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
                  let rankEmoji = '';
                  if (idx === 0) {
                    rankBg = 'bg-amber-100/80 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
                    rankEmoji = '🥇';
                  } else if (idx === 1) {
                    rankBg = 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
                    rankEmoji = '🥈';
                  } else if (idx === 2) {
                    rankBg = 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
                    rankEmoji = '🥉';
                  }

                  return (
                    <div key={idx} className="group flex items-center gap-3 p-1.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-xl transition-all">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border ${rankBg} shrink-0`}>
                        {idx < 3 ? rankEmoji : idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors uppercase">
                              {item.name}
                            </span>
                            {item.subtext && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-550 truncate uppercase">
                                {item.subtext}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 shrink-0">
                            {item.count} {item.count === 1 ? 'ficha' : 'fichas'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-600' : 'bg-blue-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2 flex-1 flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {rankingType === 'users' ? 'Nenhum digitador ativo' : 'Nenhum coletor ativo'}
                </p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <span>{rankingType === 'users' ? 'Total de Digitadores' : 'Total de Coletores'}</span>
              <span className="text-blue-600 dark:text-blue-400 font-extrabold text-xs">
                {rankingType === 'users' ? userRanking.length : collectorRanking.length}
              </span>
            </div>
          </div>
        </div>

      </div>
      </div>

      <div className={dashboardSubTab === 'reports' ? 'space-y-8 animate-in fade-in duration-300' : 'fixed -left-[9999px] top-0 opacity-0 pointer-events-none w-full max-w-[1200px]'}>
          {/* CARDS RESUMO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">Pescadores Ativos</span>
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{reportsStats.activeCount}</span>
              </div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">Produção Acumulada</span>
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {reportsStats.totalWeight >= 1000 
                    ? `${(reportsStats.totalWeight / 1000).toFixed(2)} t` 
                    : `${reportsStats.totalWeight.toFixed(0)} kg`}
                </span>
              </div>
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                <Fish size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">CPUE Médio Geral</span>
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {reportsStats.avgCpue.toFixed(1)} <span className="text-xs font-bold text-slate-400">kg/dia</span>
                </span>
              </div>
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                <TrendingUp size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">Maior Produtor</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate block max-w-[150px] uppercase">
                  {reportsStats.bestProducer ? reportsStats.bestProducer.name : 'Nenhum'}
                </span>
                <span className="text-[11px] text-slate-500 font-bold block">
                  {reportsStats.bestProducer 
                    ? `${(reportsStats.bestProducer.totalWeight / 1000).toFixed(2)} t capturadas` 
                    : 'Sem registros'}
                </span>
              </div>
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                <Award size={22} />
              </div>
            </div>
          </div>

          {/* TABELA DE DESEMPENHO DETALHADO */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-750 dark:text-slate-200 uppercase tracking-wider mb-1">Rendimento de Todos os Pescadores</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold">Relatório tabular detalhado com os principais indicadores de produtividade</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar pescador..." 
                  value={reportsSearch}
                  onChange={e => setReportsSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-4">Pescador</th>
                    <th className="py-4 px-4 text-center">Desembarques</th>
                    <th className="py-4 px-4 text-right">Produção Total (kg)</th>
                    <th className="py-4 px-4 text-right">CPUE (kg/dia)</th>
                    <th className="py-4 px-4 text-right">Faturamento Estimado (R$)</th>
                    <th className="py-4 px-4 text-center">Principal Espécie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-semibold text-slate-600 dark:text-slate-300">
                  {filteredFishermanProductivity.length > 0 ? (
                    filteredFishermanProductivity.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200 uppercase">{f.name}</td>
                        <td className="py-4 px-4 text-center">{f.tripsCount}</td>
                        <td className="py-4 px-4 text-right font-mono">{f.totalWeight.toLocaleString('pt-BR')} kg</td>
                        <td className="py-4 px-4 text-right font-mono text-blue-600 dark:text-blue-400">{f.cpue.toFixed(1)}</td>
                        <td className="py-4 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {f.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full uppercase">
                            {f.mainSpecies}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center font-bold text-slate-400 dark:text-slate-500">
                        Nenhum pescador correspondente à pesquisa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
  );
};

export default memo(Dashboard);
