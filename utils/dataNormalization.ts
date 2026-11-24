// Normalização de dados antigos vindos do cache local, do Supabase ou de planilhas.
// Mantém a compatibilidade com registros gravados antes das correções de arte de pesca
// e com o sufixo "pax" que existia no campo de quantidade de pescadores.

import { Fisherman, GearDetails, LandingForm } from '../types';
import { canonicalizeGearName, normalizeGearDetails } from './gearUtils';

/** Converte valores como 2, "2", "2 pax" ou "2pax" em um número inteiro. */
export const normalizeFisherCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === 'string') {
    const match = value.replace(',', '.').match(/\d+(?:\.\d+)?/);
    if (match) return Math.max(0, Math.round(parseFloat(match[0])));
  }
  return 0;
};

/** Remove o sufixo "pax" preservando apenas o número para exibição. */
export const normalizeFisherCountText = (value: unknown): string => {
  const count = normalizeFisherCount(value);
  return count > 0 ? String(count) : '';
};

export const normalizeForm = (form: LandingForm): LandingForm => {
  const fishing: any = form.fishing || {};
  const gearType = canonicalizeGearName(fishing.gearType);
  const gearTypeGeneral = canonicalizeGearName(fishing.gearTypeGeneral);

  return {
    ...form,
    identification: {
      ...(form.identification || {}),
      collectorName: form.identification?.collectorName || ''
    } as LandingForm['identification'],
    fishing: {
      ...fishing,
      fisherCount: normalizeFisherCount(fishing.fisherCount),
      gearType,
      gearTypeGeneral
    } as LandingForm['fishing'],
    gear: normalizeGearDetails(form.gear) as GearDetails
  };
};

export const normalizeForms = (forms: LandingForm[]): LandingForm[] =>
  Array.isArray(forms) ? forms.map(normalizeForm) : [];

export const normalizeFisherman = (fisherman: Fisherman): Fisherman => ({
  ...fisherman,
  gearType: canonicalizeGearName(fisherman.gearType),
  gearTypeGeneral: canonicalizeGearName(fisherman.gearTypeGeneral),
  gearDetails: normalizeGearDetails(fisherman.gearDetails),
  fisherCount: fisherman.fisherCount ? normalizeFisherCountText(fisherman.fisherCount) : undefined
});

export const normalizeFishermen = (fishermen: Fisherman[]): Fisherman[] =>
  Array.isArray(fishermen) ? fishermen.map(normalizeFisherman) : [];
