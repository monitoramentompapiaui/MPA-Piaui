import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Map, Globe, RefreshCw, AlertCircle, Info, ChevronRight, Check, ListFilter, Database, ExternalLink, Calendar, MapPin, Search, Download, Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { getGbifOccurrencesWithCache, getWorldGeoJsonWithCache, getBrazilGeoJsonWithCache } from '../utils/mapGenerator';

interface WormsDistributionMapProps {
  distributions: any[];
  scientificName: string;
}

export const WormsDistributionMap: React.FC<WormsDistributionMapProps> = ({
  distributions: originalDistributions,
  scientificName
}) => {
  const [mapType, setMapType] = useState<'BR' | 'GLOBAL'>('GLOBAL');
  const [worldGeoJson, setWorldGeoJson] = useState<any>(null);
  const [brazilGeoJson, setBrazilGeoJson] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [brMapFailed, setBrMapFailed] = useState(false);

  const isLoadingMap = useMemo(() => {
    if (mapType === 'GLOBAL') return !worldGeoJson;
    return !brazilGeoJson;
  }, [mapType, worldGeoJson, brazilGeoJson]);
  
  // GBIF State
  const [gbifOccurrences, setGbifOccurrences] = useState<any[]>([]);
  const [isLoadingGbif, setIsLoadingGbif] = useState(false);
  const [gbifError, setGbifError] = useState<string | null>(null);
  const [taxonKey, setTaxonKey] = useState<number | null>(null);
  const GBIF_DISPLAY_LIMIT = 2000;

  const [isFullscreen, setIsFullscreen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async (format: 'svg' | 'png') => {
    const mapSvgEl = document.querySelector('.map-container svg');
    if (!mapSvgEl) {
      alert('Mapa não encontrado para exportação.');
      return;
    }

    try {
      const clonedSvg = mapSvgEl.cloneNode(true) as SVGElement;
      
      // Inline all presentation styles to make the exported SVG/image self-contained
      const allElements = clonedSvg.querySelectorAll('*');
      allElements.forEach((el: any) => {
        const className = el.getAttribute('class') || '';
        
        if (el.tagName === 'path') {
          el.setAttribute('fill', '#cbd5e1');
          el.setAttribute('stroke', '#94a3b8');
          el.setAttribute('stroke-width', '0.2');
        } else if (el.tagName === 'circle') {
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
          if (className.includes('fill-slate-100') || className.includes('fill-slate-300')) el.setAttribute('fill', '#cbd5e1');
          if (className.includes('text-slate-200') || className.includes('text-slate-250') || className.includes('text-slate-300') || className.includes('text-slate-400')) {
            el.setAttribute('stroke', '#94a3b8');
          }
        }
      });

      // Clear interactive classes
      clonedSvg.removeAttribute('class');
      clonedSvg.setAttribute('style', 'background-color: #f8fafc; padding: 16px; border-radius: 12px;');

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

      if (format === 'svg') {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mapa-ocorrencias-${scientificName.toLowerCase().replace(/\s+/g, '-')}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);
        
        const image = new Image();
        image.src = blobUrl;
        image.crossOrigin = 'anonymous';
        
        image.onload = () => {
          const canvas = document.createElement('canvas');
          // High-DPI Crisp scaling (2x scale)
          canvas.width = width * 2;
          canvas.height = height * 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(2, 2);
            ctx.drawImage(image, 0, 0, width, height);
            
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `mapa-ocorrencias-${scientificName.toLowerCase().replace(/\s+/g, '-')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(blobUrl);
        };
        image.onerror = (err) => {
          console.error('Erro ao converter SVG para PNG:', err);
          URL.revokeObjectURL(blobUrl);
        };
      }
    } catch (err) {
      console.error('Falha ao baixar imagem do mapa:', err);
      alert('Não foi possível exportar a imagem do mapa.');
    }
  };

  // Fetch Natural Earth World Map GeoJSON & Brazil GeoJSON if not cached
  useEffect(() => {
    let active = true;
    
    getWorldGeoJsonWithCache()
      .then(data => {
        if (active && data) {
          setWorldGeoJson(data);
        }
      })
      .catch(err => {
        console.error("Erro ao carregar mapa-múndi:", err);
      });

    getBrazilGeoJsonWithCache()
      .then(data => {
        if (active && data) {
          setBrazilGeoJson(data);
        }
      })
      .catch(err => {
        console.error("Erro ao carregar mapa do Brasil:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  // 1. Fetch real coordinates from GBIF API (Optimized with Centralized Cache)
  useEffect(() => {
    if (!scientificName) return;
    
    let active = true;
    setIsLoadingGbif(true);
    setGbifError(null);
    setGbifOccurrences([]);
    setTaxonKey(null);
    setBrMapFailed(false);
    setMapError(null);

    getGbifOccurrencesWithCache(scientificName)
      .then(({ occurrences, taxonKey }) => {
        if (!active) return;
        setGbifOccurrences(occurrences.slice(0, GBIF_DISPLAY_LIMIT));
        setTaxonKey(taxonKey);
        setIsLoadingGbif(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar dados no GBIF:', err);
        if (active) {
          setGbifError('Não foi possível obter ocorrências geográficas do GBIF.');
          setIsLoadingGbif(false);
        }
      });

    return () => {
      active = false;
    };
  }, [scientificName]);

  // 2. Parse and format the occurrence points
  const points = useMemo(() => {
    return gbifOccurrences.map((occ, idx) => {
      return {
        id: occ.key || idx,
        location: occ.locality || occ.stateProvince || occ.country || 'Localidade registrada',
        locality: occ.stateProvince || null,
        country: occ.country || occ.countryCode || 'Não informado',
        countryCode: occ.countryCode || null,
        lat: occ.decimalLatitude,
        lng: occ.decimalLongitude,
        eventDate: occ.eventDate || null,
        basisOfRecord: occ.basisOfRecord || 'Observação',
        datasetName: occ.datasetName || occ.institutionCode || 'Base de Dados GBIF',
        publisher: occ.publisher || null,
        originalIndex: idx
      };
    }).filter(p => p.lat !== undefined && p.lat !== null && !isNaN(Number(p.lat)) && p.lng !== undefined && p.lng !== null && !isNaN(Number(p.lng)));
  }, [gbifOccurrences]);

  // Check if any occurrence coordinates fall inside Brazil bounds
  const hasBrazilPoints = useMemo(() => {
    const brBounds = { minLat: -34.0, maxLat: 6.0, minLng: -74.5, maxLng: -34.0 };
    return points.some(p => 
      p.lat! >= brBounds.minLat && p.lat! <= brBounds.maxLat && 
      p.lng! >= brBounds.minLng && p.lng! <= brBounds.maxLng
    );
  }, [points]);

  // 3. Auto-detect map scope based on Brazilian vs Global distribution
  useEffect(() => {
    if (points.length === 0) return;
    if (hasBrazilPoints && !brMapFailed) {
      setMapType('BR');
    } else {
      setMapType('GLOBAL');
    }
  }, [points, hasBrazilPoints, brMapFailed]);

  // Dynamic world map cropped viewBox based on where the points actually cluster
  const worldViewBox = useMemo(() => {
    if (mapType !== 'GLOBAL' || points.length === 0) {
      return "-180 -90 360 180";
    }

    const validPoints = points.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    if (validPoints.length === 0) {
      return "-180 -90 360 180";
    }

    let minLng = Math.min(...validPoints.map(p => p.lng));
    let maxLng = Math.max(...validPoints.map(p => p.lng));
    let minLat = Math.min(...validPoints.map(p => p.lat));
    let maxLat = Math.max(...validPoints.map(p => p.lat));

    // Calculate spans
    let lngSpan = maxLng - minLng;
    let latSpan = maxLat - minLat;

    // If spans are extremely large (e.g., global distribution across different hemispheres), fallback to full world
    if (lngSpan > 250 || latSpan > 130) {
      return "-180 -90 360 180";
    }

    // Add padding (percentage-based, but at least 12 degrees to keep perspective)
    const paddingLng = Math.max(lngSpan * 0.18, 12);
    const paddingLat = Math.max(latSpan * 0.18, 12);

    let startLng = Math.max(-180, minLng - paddingLng);
    let endLng = Math.min(180, maxLng + paddingLng);
    let startLat = Math.max(-90, minLat - paddingLat);
    let endLat = Math.min(90, maxLat + paddingLat);

    // Enforce a minimum size to avoid zooming into a tiny single point like a map pin on white space
    const minSize = 25;
    if (endLng - startLng < minSize) {
      const center = (startLng + endLng) / 2;
      startLng = Math.max(-180, center - minSize / 2);
      endLng = Math.min(180, center + minSize / 2);
    }
    if (endLat - startLat < minSize) {
      const center = (startLat + endLat) / 2;
      startLat = Math.max(-90, center - minSize / 2);
      endLat = Math.min(90, center + minSize / 2);
    }

    const viewBoxWidth = endLng - startLng;
    const viewBoxHeight = endLat - startLat;
    const viewBoxX = startLng;
    const viewBoxY = -endLat; // Y coordinates are negative in SVG for equirectangular latitude

    return `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;
  }, [points, mapType]);

  // Scale marker sizes according to the active viewBox
  const markerScale = useMemo(() => {
    if (mapType === 'GLOBAL') {
      try {
        const parts = worldViewBox.split(' ').map(Number);
        if (parts.length === 4 && !isNaN(parts[2])) {
          return parts[2] / 50; 
        }
      } catch {}
      return 7.2;
    }
    // Brasil (viewBox fixo: largura de 40.5. 40.5 / 50 = 0.81)
    return 0.81;
  }, [mapType, worldViewBox]);

  // Geographic filter checker
  const isWithinMapBounds = (lat: number, lng: number) => {
    if (mapType === 'BR') {
      return lat >= -34.0 && lat <= 6.0 && lng >= -74.5 && lng <= -34.0;
    }
    return true; // Global
  };

  // Stats: Counts inside current view
  const viewPointsCount = useMemo(() => {
    return points.filter(p => isWithinMapBounds(p.lat!, p.lng!)).length;
  }, [points, mapType]);

  // 5. Parse World Map GeoJSON geometries to SVG path d strings
  const worldPaths = useMemo(() => {
    if (!worldGeoJson) return [];
    const paths: string[] = [];
    
    try {
      const features = worldGeoJson.features || [];
      features.forEach((feature: any) => {
        const geom = feature.geometry;
        if (!geom) return;
        
        if (geom.type === 'Polygon') {
          geom.coordinates.forEach((ring: any[]) => {
            let pathStr = '';
            ring.forEach((coord, i) => {
              const x = coord[0];
              const y = -coord[1];
              if (i === 0) {
                pathStr += `M ${x} ${y}`;
              } else {
                pathStr += ` L ${x} ${y}`;
              }
            });
            pathStr += ' Z';
            paths.push(pathStr);
          });
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((polygon: any[][]) => {
            polygon.forEach((ring: any[]) => {
              let pathStr = '';
              ring.forEach((coord, i) => {
                const x = coord[0];
                const y = -coord[1];
                if (i === 0) {
                  pathStr += `M ${x} ${y}`;
                } else {
                  pathStr += ` L ${x} ${y}`;
                }
              });
              pathStr += ' Z';
              paths.push(pathStr);
            });
          });
        }
      });
    } catch (err) {
      console.error("Erro ao converter GeoJSON em caminhos SVG:", err);
    }
    
    return paths;
  }, [worldGeoJson]);

  // 6. Parse Brazil States GeoJSON geometries to SVG path d strings
  const brazilPaths = useMemo(() => {
    if (!brazilGeoJson) return [];
    const paths: string[] = [];
    
    try {
      const features = brazilGeoJson.features || [];
      features.forEach((feature: any) => {
        const geom = feature.geometry;
        if (!geom) return;
        
        if (geom.type === 'Polygon') {
          geom.coordinates.forEach((ring: any[]) => {
            let pathStr = '';
            ring.forEach((coord, i) => {
              const x = coord[0];
              const y = -coord[1];
              if (i === 0) {
                pathStr += `M ${x} ${y}`;
              } else {
                pathStr += ` L ${x} ${y}`;
              }
            });
            pathStr += ' Z';
            paths.push(pathStr);
          });
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((polygon: any[][]) => {
            polygon.forEach((ring: any[]) => {
              let pathStr = '';
              ring.forEach((coord, i) => {
                const x = coord[0];
                const y = -coord[1];
                if (i === 0) {
                  pathStr += `M ${x} ${y}`;
                } else {
                  pathStr += ` L ${x} ${y}`;
                }
              });
              pathStr += ' Z';
              paths.push(pathStr);
            });
          });
        }
      });
    } catch (err) {
      console.error("Erro ao converter GeoJSON do Brasil em caminhos SVG:", err);
    }
    
    return paths;
  }, [brazilGeoJson]);

  // Stats: Basis of record counts
  const basisOfRecordStats = useMemo(() => {
    const stats: Record<string, number> = {};
    points.forEach(p => {
      stats[p.basisOfRecord] = (stats[p.basisOfRecord] || 0) + 1;
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  }, [points]);
  const renderMapSection = () => {
    return (
      <>
        {/* Loading States */}
        {(isLoadingMap || isLoadingGbif || (mapType === 'GLOBAL' && !worldGeoJson)) && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 z-20 flex flex-col items-center justify-center gap-3 animate-in fade-in">
            <RefreshCw className="animate-spin text-[#2a5caa] dark:text-blue-500" size={32} />
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isLoadingGbif ? 'Sincronizando com base de dados GBIF...' : 'Carregando malha do mapa...'}
              </span>
              <p className="text-[10px] text-slate-400">Isso pode levar alguns segundos dependendo da conexão externa.</p>
            </div>
          </div>
        )}

        {/* Errors */}
        {gbifError && (
          <div className="p-6 text-center max-w-sm space-y-3 z-10 animate-in zoom-in-95">
            <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900/30">
              <AlertCircle size={22} />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Falha na consulta GBIF</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {gbifError}
            </p>
          </div>
        )}

        {/* Render Map (Brasil) */}
        {mapType === 'BR' && !gbifError && (
          <div className="relative w-full h-full p-4 flex items-center justify-center aspect-square select-none overflow-hidden">
            <svg
              viewBox="-74.5 -6.0 40.5 40.0"
              className="w-full h-full max-h-[440px] drop-shadow-md text-slate-300 dark:text-slate-700 select-none"
              style={{ 
                stroke: 'currentColor', 
                strokeWidth: 0.05 * markerScale,
                cursor: 'default'
              }}
            >
              <g>
                {/* 1. Brazil States outlines */}
                <g className="fill-slate-100 dark:fill-slate-800 text-slate-300 dark:text-slate-700 transition-all duration-300">
                  {brazilPaths.length > 0 ? (
                    brazilPaths.map((d, i) => (
                      <path 
                        key={i} 
                        d={d} 
                        strokeWidth={0.05 * markerScale} 
                        className="hover:fill-blue-50/50 dark:hover:fill-blue-900/20 transition-colors"
                      />
                    ))
                  ) : (
                    // Fallback to world paths with Brazil viewBox if Brazil specific GeoJSON is still loading
                    worldPaths.map((d, i) => (
                      <path key={i} d={d} strokeWidth={0.05 * markerScale} />
                    ))
                  )}
                </g>

                {/* 2. Markers */}
                {points.map((pt) => {
                  const isWithin = isWithinMapBounds(pt.lat!, pt.lng!);
                  if (!isWithin) return null;

                  return (
                    <g
                      key={pt.id}
                      className="pointer-events-none"
                    >
                      <circle
                        cx={pt.lng}
                        cy={-pt.lat}
                        r={markerScale * 0.45}
                        className="fill-rose-500/15 stroke-rose-500/25"
                        strokeWidth={markerScale * 0.03}
                      />

                      <circle
                        cx={pt.lng}
                        cy={-pt.lat}
                        r={markerScale * 0.22}
                        className="fill-rose-600 stroke-white"
                        strokeWidth={markerScale * 0.04}
                      />

                      <circle
                        cx={pt.lng}
                        cy={-pt.lat}
                        r={markerScale * 0.08}
                        className="fill-white"
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}

        {/* Render World Map (Natural Earth SVG) */}
        {mapType === 'GLOBAL' && worldGeoJson && !gbifError && (
          <div className="relative w-full h-full p-4 flex items-center justify-center aspect-[2/1] select-none overflow-hidden">
            <svg
              viewBox={worldViewBox}
              className="w-full h-full max-h-[440px] drop-shadow-md text-slate-300 dark:text-slate-700 select-none"
              style={{ 
                stroke: 'currentColor', 
                strokeWidth: 0.05 * markerScale,
                cursor: 'default'
              }}
            >
              <g>
                {/* 1. Natural Earth World land outlines */}
                <g className="fill-slate-300 dark:fill-slate-700 text-slate-400 dark:text-slate-600 transition-all duration-300">
                  {worldPaths.map((d, i) => (
                    <path key={i} d={d} strokeWidth={0.05 * markerScale} />
                  ))}
                </g>

                {/* 2. Markers */}
                {points.map((pt) => {
                  return (
                    <g
                      key={pt.id}
                      className="pointer-events-none"
                    >
                      <circle
                        cx={pt.lng}
                        cy={-pt.lat}
                        r={markerScale * 0.45}
                        className="fill-rose-500/15 stroke-rose-500/25"
                        strokeWidth={markerScale * 0.03}
                      />

                      <circle
                        cx={pt.lng}
                        cy={-pt.lat}
                        r={markerScale * 0.22}
                        className="fill-rose-600 stroke-white"
                        strokeWidth={markerScale * 0.04}
                      />

                      <circle
                        cx={pt.lng}
                        cy={-pt.lat}
                        r={markerScale * 0.08}
                        className="fill-white"
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}

        {/* Floating Map Action Controls */}
        {!gbifError && (
          <div className="absolute right-4 top-4 flex flex-col gap-1.5 z-10 bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
            {/* Download Image Button */}
            <button 
              type="button"
              onClick={() => handleDownloadImage('png')}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-emerald-650 dark:text-emerald-400 transition-colors cursor-pointer"
              title="Baixar Mapa como Imagem (PNG)"
            >
              <Download size={13} />
            </button>

            {/* Fullscreen Button */}
            <button 
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[#2a5caa] dark:text-blue-400 transition-colors cursor-pointer"
              title={isFullscreen ? "Sair da Tela Cheia" : "Ver em Tela Cheia"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        )}

        {/* Compass / Legend Fixo */}
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 shadow-md z-10 border-l-3 border-l-rose-500">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          <span>{viewPointsCount} de {Math.min(gbifOccurrences.length, GBIF_DISPLAY_LIMIT)} Ocorrências no Mapa</span>
        </div>
      </>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-6 font-sans">
      
      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 md:p-6">
          <div className="bg-white dark:bg-slate-950 w-full h-full max-w-7xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-[#2a5caa] dark:text-blue-400 rounded-lg">
                  <Globe size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Modo Tela Cheia: <em>{scientificName}</em>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Pressione Esc ou clique no botão para fechar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                  {hasBrazilPoints && !brMapFailed && (
                    <button
                      type="button"
                      onClick={() => setMapType('BR')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        mapType === 'BR'
                          ? 'bg-[#2a5caa] text-white shadow-sm'
                          : 'text-slate-650 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      Brasil
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMapType('GLOBAL')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      mapType === 'GLOBAL'
                        ? 'bg-[#2a5caa] text-white shadow-sm'
                        : 'text-slate-650 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Mundo
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-all cursor-pointer text-xs font-bold flex items-center gap-1"
                >
                  <Minimize2 size={13} />
                  <span>Sair</span>
                </button>
              </div>
            </div>

            {/* Content Body inside Fullscreen */}
            <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-950 flex justify-center items-center h-full">
              {/* Map Canvas */}
              <div 
                ref={mapContainerRef}
                className="w-full h-full relative flex justify-center items-center map-container"
              >
                {renderMapSection()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Normal/Header view */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-[#2a5caa] dark:text-blue-400 rounded-xl mt-0.5">
            <Globe className="animate-pulse" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              Mapa de Ocorrências GBIF / IBGE
            </h3>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Registros reais do Global Biodiversity Information Facility mapeados nas malhas oficiais do IBGE
            </p>
          </div>
        </div>

        {/* Controls Panel (Toggles) */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
            {hasBrazilPoints && !brMapFailed && (
              <button
                type="button"
                onClick={() => setMapType('BR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mapType === 'BR'
                    ? 'bg-[#2a5caa] text-white shadow-sm'
                    : 'text-slate-650 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Brasil
              </button>
            )}
            <button
              type="button"
              onClick={() => setMapType('GLOBAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mapType === 'GLOBAL'
                  ? 'bg-[#2a5caa] text-white shadow-sm'
                  : 'text-slate-650 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Mundo
            </button>
          </div>
        </div>
      </div>

      {mapError && (
        <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3.5 flex items-start gap-3 text-amber-800 dark:text-amber-200 animate-in slide-in-from-top-2 duration-250">
          <AlertCircle className="shrink-0 text-amber-500 mt-0.5" size={16} />
          <div className="text-xs leading-relaxed">
            <span className="font-extrabold block uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400 mb-0.5">Mapa do Brasil indisponível</span>
            {mapError}
          </div>
        </div>
      )}

      {/* Map Visualizer (Full Width) */}
      <div 
        ref={mapContainerRef}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl relative overflow-hidden flex flex-col justify-center items-center shadow-sm map-container"
        style={{ height: '500px' }}
      >
        {renderMapSection()}
      </div>

    </div>
  );
};
