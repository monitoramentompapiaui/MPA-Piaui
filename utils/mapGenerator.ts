import { Species } from '../types';

const DB_NAME = 'WormsMapCacheDB';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('map_images')) {
        db.createObjectStore('map_images', { keyPath: 'scientificName' });
      }
      if (!db.objectStoreNames.contains('gbif_cache')) {
        db.createObjectStore('gbif_cache', { keyPath: 'scientificName' });
      }
      if (!db.objectStoreNames.contains('geo_json_cache')) {
        db.createObjectStore('geo_json_cache', { keyPath: 'url' });
      }
    };
  });
}

async function dbGet(storeName: string, key: string): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB read error in store ${storeName}:`, err);
    return null;
  }
}

async function dbPut(storeName: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB write error in store ${storeName}:`, err);
  }
}

// In-memory caching fallbacks
const memGbifCache: Record<string, { occurrences: any[]; taxonKey: number | null }> = {};
let memWorldGeoJson: any = null;
let memBrazilGeoJson: any = null;

/**
 * Clean scientific name to remove authorship, subgenus, year, and extra spacing,
 * leaving only the pure binomial or trinomial name (Genus species subspecies).
 */
export function cleanScientificName(name: string): string {
  if (!name || name === 'Não informado') return '';
  let clean = name.replace(/\([^)]+\)/g, ' ').trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    if (words[2] && /^[a-z]/.test(words[2])) {
      return `${words[0]} ${words[1]} ${words[2]}`;
    }
    return `${words[0]} ${words[1]}`;
  }
  return name;
}

export async function getMapImageFromCache(scientificName: string): Promise<string | null> {
  const clean = cleanScientificName(scientificName);
  if (!clean) return null;
  const record = await dbGet('map_images', clean);
  return record ? record.base64 : null;
}

export async function saveMapImageToCache(scientificName: string, base64: string): Promise<void> {
  const clean = cleanScientificName(scientificName);
  if (!clean) return;
  await dbPut('map_images', {
    scientificName: clean,
    base64,
    timestamp: Date.now()
  });
}

export async function getGbifOccurrencesWithCache(scientificName: string): Promise<{ occurrences: any[]; taxonKey: number | null }> {
  if (!scientificName) return { occurrences: [], taxonKey: null };
  const clean = cleanScientificName(scientificName);
  if (!clean) return { occurrences: [], taxonKey: null };

  // 1. In-Memory Cache
  if (memGbifCache[clean]) {
    return memGbifCache[clean];
  }

  // 2. IndexedDB Cache
  const record = await dbGet('gbif_cache', clean);
  if (record && record.occurrences) {
    memGbifCache[clean] = { occurrences: record.occurrences, taxonKey: record.taxonKey };
    return { occurrences: record.occurrences, taxonKey: record.taxonKey };
  }

  // 3. Network Fetch
  try {
    const fetchDirectFirst = fetch(`https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(clean)}&limit=2000&offset=0&hasCoordinate=true`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null);

    const fetchMatch = fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(clean)}`)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null);

    const [directData, matchData] = await Promise.all([fetchDirectFirst, fetchMatch]);

    let occurrences = directData?.results || [];
    let resolvedTaxonKey = matchData?.usageKey || null;

    if (occurrences.length === 0 && resolvedTaxonKey) {
      const occRes = await fetch(`https://api.gbif.org/v1/occurrence/search?taxonKey=${resolvedTaxonKey}&limit=2000&offset=0&hasCoordinate=true`);
      if (occRes.ok) {
        const occData = await occRes.json();
        occurrences = occData?.results || [];
      }
    }

    // Save to caches
    memGbifCache[clean] = { occurrences, taxonKey: resolvedTaxonKey };
    await dbPut('gbif_cache', {
      scientificName: clean,
      occurrences,
      taxonKey: resolvedTaxonKey,
      timestamp: Date.now()
    });

    return { occurrences, taxonKey: resolvedTaxonKey };
  } catch (err) {
    console.warn(`Error fetching GBIF occurrences for ${clean}:`, err);
    return { occurrences: [], taxonKey: null };
  }
}

export async function getWorldGeoJsonWithCache(): Promise<any> {
  // 1. In-Memory Cache
  if (memWorldGeoJson) {
    return memWorldGeoJson;
  }

  const localUrl = "/world-land.json";
  const fallbackUrl = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";

  // 2. IndexedDB Cache
  const record = await dbGet('geo_json_cache', localUrl);
  if (record && record.data) {
    memWorldGeoJson = record.data;
    return record.data;
  }

  // 3. Network Fetch
  try {
    let data: any = null;
    try {
      const res = await fetch(localUrl);
      if (res.ok) {
        data = await res.json();
      } else {
        console.warn(`Local fetch returned status ${res.status}, trying fallback`);
      }
    } catch (localErr) {
      console.warn("Failed to fetch local world-land.json, trying GitHub raw fallback...", localErr);
    }

    if (!data) {
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) throw new Error("Failed to load world map from all sources");
      data = await fallbackRes.json();
    }

    if (data) {
      memWorldGeoJson = data;
      await dbPut('geo_json_cache', {
        url: localUrl,
        data,
        timestamp: Date.now()
      });
      return data;
    }
    return null;
  } catch (err) {
    console.error("Error fetching world map GeoJSON:", err);
    return null;
  }
}

export async function getBrazilGeoJsonWithCache(): Promise<any> {
  // 1. In-Memory Cache
  if (memBrazilGeoJson) {
    return memBrazilGeoJson;
  }

  const localUrl = "/brazil-states.json";
  const fallbackUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

  // 2. IndexedDB Cache
  const record = await dbGet('geo_json_cache', localUrl);
  if (record && record.data) {
    memBrazilGeoJson = record.data;
    return record.data;
  }

  // 3. Network Fetch
  try {
    let data: any = null;
    try {
      const res = await fetch(localUrl);
      if (res.ok) {
        data = await res.json();
      } else {
        console.warn(`Local fetch returned status ${res.status}, trying fallback`);
      }
    } catch (localErr) {
      console.warn("Failed to fetch local brazil-states.json, trying GitHub raw fallback...", localErr);
    }

    if (!data) {
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) throw new Error("Failed to load Brazil map from all sources");
      data = await fallbackRes.json();
    }

    if (data) {
      memBrazilGeoJson = data;
      await dbPut('geo_json_cache', {
        url: localUrl,
        data,
        timestamp: Date.now()
      });
      return data;
    }
    return null;
  } catch (err) {
    console.error("Error fetching Brazil GeoJSON:", err);
    return null;
  }
}

export function calculateWorldViewBox(points: Array<{lat: number; lng: number}>): { viewBox: string; markerScale: number } {
  if (points.length === 0) {
    return { viewBox: "-180 -90 360 180", markerScale: 7.2 };
  }

  const validPoints = points.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
  if (validPoints.length === 0) {
    return { viewBox: "-180 -90 360 180", markerScale: 7.2 };
  }

  let minLng = Math.min(...validPoints.map(p => p.lng));
  let maxLng = Math.max(...validPoints.map(p => p.lng));
  let minLat = Math.min(...validPoints.map(p => p.lat));
  let maxLat = Math.max(...validPoints.map(p => p.lat));

  let lngSpan = maxLng - minLng;
  let latSpan = maxLat - minLat;

  let viewBoxStr = "-180 -90 360 180";
  if (lngSpan > 250 || latSpan > 130) {
    viewBoxStr = "-180 -90 360 180";
  } else {
    const paddingLng = Math.max(lngSpan * 0.18, 12);
    const paddingLat = Math.max(latSpan * 0.18, 12);

    let startLng = Math.max(-180, minLng - paddingLng);
    let endLng = Math.min(180, maxLng + paddingLng);
    let startLat = Math.max(-90, minLat - paddingLat);
    let endLat = Math.min(90, maxLat + paddingLat);

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
    viewBoxStr = `${startLng} ${-endLat} ${endLng - startLng} ${endLat - startLat}`;
  }

  let markerScale = 7.2;
  try {
    const parts = viewBoxStr.split(' ').map(Number);
    if (parts.length === 4 && !isNaN(parts[2])) {
      markerScale = parts[2] / 50;
    }
  } catch {}

  return { viewBox: viewBoxStr, markerScale };
}

export function parseWorldGeoJsonToPaths(worldGeoJson: any): string[] {
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
            pathStr += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
          });
          pathStr += 'Z';
          paths.push(pathStr);
        });
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((polygon: any[][]) => {
          polygon.forEach((ring: any[]) => {
            let pathStr = '';
            ring.forEach((coord, i) => {
              const x = coord[0];
              const y = -coord[1];
              pathStr += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
            });
            pathStr += 'Z';
            paths.push(pathStr);
          });
        });
      }
    });
  } catch (err) {
    console.error("Error drawing world paths in generator:", err);
  }
  return paths;
}

export async function generateOffscreenWorldMapPNG(
  scientificName: string,
  occurrences: any[],
  worldGeoJson: any
): Promise<string> {
  if (!scientificName) return '';

  const points = occurrences.map((occ, idx) => ({
    id: occ.key || idx,
    lat: occ.decimalLatitude,
    lng: occ.decimalLongitude,
  })).filter(p => p.lat !== null && p.lng !== null);

  const { viewBox, markerScale } = calculateWorldViewBox(points);
  const paths = parseWorldGeoJsonToPaths(worldGeoJson);

  const svgNS = "http://www.w3.org/2000/svg";
  const width = 600;
  const height = 300;

  // Build high-performance SVG
  let svgString = `<svg xmlns="${svgNS}" viewBox="${viewBox}" width="${width}" height="${height}" style="background-color: #f8fafc;">`;
  
  // Landmasses
  svgString += `<g fill="#cbd5e1" stroke="#94a3b8" stroke-width="${0.05 * markerScale}">`;
  paths.forEach(d => {
    svgString += `<path d="${d}" />`;
  });
  svgString += `</g>`;

  // Occurrence point halos and markers
  svgString += `<g>`;
  points.forEach(pt => {
    svgString += `<circle cx="${pt.lng}" cy="${-pt.lat}" r="${markerScale * 0.45}" fill="rgba(244, 63, 94, 0.15)" stroke="rgba(244, 63, 94, 0.25)" stroke-width="${markerScale * 0.03}" />`;
    svgString += `<circle cx="${pt.lng}" cy="${-pt.lat}" r="${markerScale * 0.22}" fill="#e11d48" stroke="#ffffff" stroke-width="${markerScale * 0.04}" />`;
    svgString += `<circle cx="${pt.lng}" cy="${-pt.lat}" r="${markerScale * 0.08}" fill="#ffffff" />`;
  });
  svgString += `</g></svg>`;

  try {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    const imgBase64 = await new Promise<string>((resolve) => {
      const image = new Image();
      image.src = blobUrl;
      image.crossOrigin = 'anonymous';

      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill background for JPEGs
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, width, height);
          
          // Export as JPEG at 0.8 quality to keep files ultra-lightweight
          const result = canvas.toDataURL('image/jpeg', 0.8);
          resolve(result);
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

    return imgBase64;
  } catch (err) {
    console.error("Error generating world map:", err);
    return '';
  }
}

/**
 * High-level centralized helper to get or generate the map image.
 * Uses IndexedDB to cache result to completely avoid duplicate API calls and speed up generation.
 */
export async function getOrGenerateWorldMapImage(scientificName: string): Promise<string> {
  if (!scientificName || scientificName === 'Não informado') return '';
  const cleanName = scientificName.trim();
  
  // 1. Try to fetch from IndexedDB cache
  const cachedImage = await getMapImageFromCache(cleanName);
  if (cachedImage) {
    return cachedImage;
  }

  // 2. Load necessary data (GBIF and World Map GeoJSON)
  const [{ occurrences }, worldGeoJson] = await Promise.all([
    getGbifOccurrencesWithCache(cleanName),
    getWorldGeoJsonWithCache()
  ]);

  // 3. Generate image
  const base64 = await generateOffscreenWorldMapPNG(cleanName, occurrences, worldGeoJson);
  
  // 4. Save to IndexedDB cache
  if (base64) {
    await saveMapImageToCache(cleanName, base64);
  }

  return base64;
}
