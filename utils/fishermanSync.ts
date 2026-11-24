// Replicação das informações cadastrais do pescador para fichas já digitadas.
// A associação é feita pelo nome do pescador gravado na ficha (normalizado),
// usando os dados anteriores do cadastro quando o nome/localidade foi alterado.

import { Fisherman, LandingForm } from '../types';
import { canonicalizeGearName, getGeneralGearType, publicGearDetails } from './gearUtils';
import { standardizeText } from './textUtils';

const textKey = (value?: string | null): string =>
  (value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLowerCase();

/** Verifica se a ficha pertence ao pescador informado. */
export const fishermanMatchesForm = (form: LandingForm, fisherman: Fisherman): boolean => {
  const name = textKey(fisherman.name);
  const formName = textKey(form.identification?.fishermanName);
  if (!name || name !== formName) return false;

  const location = textKey(fisherman.location);
  const formLocation = textKey(form.identification?.location);
  return !location || !formLocation || location === formLocation;
};

const toBoolean = (value?: string): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim().toLowerCase();
  if (['nao', 'não', 'no', 'n', '0', 'false'].includes(text)) return false;
  if (['sim', 'yes', 's', '1', 'true'].includes(text)) return true;
  return undefined;
};

/**
 * Aplica ao formulário todos os campos que existem no cadastro do pescador.
 * Campos de viagem (datas, produção, quantidade de pescadores, dias etc.) não são alterados.
 */
export const applyFishermanToForm = (form: LandingForm, fisherman: Fisherman): LandingForm => {
  const gearType = canonicalizeGearName(fisherman.gearType) || form.fishing.gearType;
  const gearTypeGeneral = fisherman.gearTypeGeneral
    ? canonicalizeGearName(fisherman.gearTypeGeneral)
    : getGeneralGearType(gearType);
  const details = publicGearDetails(fisherman.gearDetails);
  const pescaSubmarina = toBoolean(fisherman.pescaSubmarina);

  return {
    ...form,
    identification: {
      ...form.identification,
      fishermanName: standardizeText(fisherman.name),
      ...(fisherman.location ? { location: standardizeText(fisherman.location) } : {}),
      ...(fisherman.vesselName !== undefined
        ? { vesselName: fisherman.vesselName ? standardizeText(fisherman.vesselName) : undefined }
        : {}),
      ...(fisherman.portoOrigem !== undefined
        ? { portoOrigem: fisherman.portoOrigem ? standardizeText(fisherman.portoOrigem) : undefined }
        : {})
    },
    fishing: {
      ...form.fishing,
      gearType,
      gearTypeGeneral,
      ...(pescaSubmarina !== undefined ? { pescaSubmarina } : {})
    },
    gear: Object.keys(details).length > 0 ? details : form.gear
  };
};
