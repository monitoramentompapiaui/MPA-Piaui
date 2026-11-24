import React from 'react';
import { GearDetails } from '../types';
import { getGearDetailFields } from '../utils/gearUtils';

interface Props {
  general: string;
  specific?: string;
  details: GearDetails;
  onChange: (details: GearDetails) => void;
  /** Usado para diferentes densidades visuais: cadastro de pescador / formulários de ficha. */
  compact?: boolean;
  className?: string;
  idPrefix?: string;
}

/**
 * Campos de dimensões da arte de pesca compartilhados entre a digitação de fichas,
 * a edição de fichas e o cadastro de pescadores. Assim as três telas mostram
 * exatamente as mesmas especificações para cada arte.
 */
const GearDetailsFields: React.FC<Props> = ({
  general,
  specific = '',
  details,
  onChange,
  compact = false,
  className = '',
  idPrefix = 'gear'
}) => {
  const fields = getGearDetailFields(general, specific);

  if (fields.length === 0) {
    return (
      <div className="col-span-full py-6 text-center text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        Sem especificações de dimensões adicionais necessárias para a categoria:{' '}
        <strong className="text-slate-600 dark:text-slate-400 font-bold">{general || 'Outros'}</strong>
      </div>
    );
  }

  const labelClass = compact
    ? 'text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 block text-left leading-[16px]'
    : 'text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300';
  const inputClass = compact
    ? 'w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 text-xs md:text-sm'
    : 'w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm shadow-sm';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 ${className}`}>
      {fields.map(field => (
        <div className="space-y-1.5 sm:space-y-2" key={field.key}>
          <label className={labelClass} htmlFor={`${idPrefix}-${field.key}`}>
            {field.label}
          </label>
          <input
            id={`${idPrefix}-${field.key}`}
            type="text"
            className={inputClass}
            value={details[field.key] ?? ''}
            onChange={e => onChange({ ...details, [field.key]: e.target.value })}
            placeholder="--"
          />
        </div>
      ))}
    </div>
  );
};

export default GearDetailsFields;
