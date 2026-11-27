import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

export default function SearchableSelect({ value, onChange, options = [], placeholder = 'Select option', isMulti = false, isDisabled = false, compact = true, isCreatable = false, hasError = false, sortOptions = true }) {
  const normalized = (Array.isArray(options) ? options : []).map((item) =>
    typeof item === 'string' 
      ? { value: item, label: item } 
      : { value: item.value ?? item.name ?? item.id, label: item.label ?? item.name ?? item.value ?? item.id }
  );
  // Master-data selectors should be easy to scan. Keep intentionally ranked
  // lists (for example, cheapest-rate or suggested-vehicle choices) in the
  // order supplied by the caller by passing sortOptions={false}.
  const orderedOptions = sortOptions
    ? [...normalized].sort((left, right) => String(left.label || '').localeCompare(String(right.label || ''), undefined, { sensitivity: 'base', numeric: true }))
    : normalized;
  
  const optionForValue = (optionValue) => normalized.find((item) => item.value === optionValue) || (optionValue !== undefined && optionValue !== null && optionValue !== '' ? { value: optionValue, label: String(optionValue) } : null);
  const selected = isMulti
    ? (value || []).map(optionForValue).filter(Boolean)
    : optionForValue(value);

  const Component = isCreatable ? CreatableSelect : Select;

  return (
    <Component
      isSearchable 
      isClearable 
      isMulti={isMulti} 
      isDisabled={isDisabled} 
      options={orderedOptions}
      value={selected} 
      placeholder={placeholder} 
      onChange={(next) => onChange(isMulti ? (next || []).map((item) => item.value) : next?.value || '')} 
      onCreateOption={isCreatable ? (inputValue) => onChange(isMulti ? [...(value || []), inputValue] : inputValue) : undefined}
      formatCreateLabel={isCreatable ? (inputValue) => `Use "${inputValue}" as a new option` : undefined}
      classNamePrefix="crm-select" 
      className={compact ? 'text-[13px]' : 'text-sm'} 
      styles={{ 
        control: (base) => ({ 
          ...base, 
          minHeight: compact ? 28 : 42, 
          borderRadius: '0.45rem', 
          borderColor: hasError ? '#f87171' : '#cbd5e1', 
          boxShadow: hasError ? '0 0 0 1px #f87171' : 'none', 
          '&:hover': { borderColor: hasError ? '#ef4444' : '#94a3b8' } 
        }), 
        menuPortal: (base) => ({ ...base, zIndex: 100 }), 
        menu: (base) => ({ 
          ...base, 
          borderRadius: '0.45rem', 
          overflow: 'hidden' 
        }),
        option: (base) => ({ 
          ...base, 
          padding: compact ? '4px 10px' : '8px 12px', 
          fontSize: compact ? '12px' : '14px', 
          cursor: 'pointer' 
        }),
        valueContainer: (base) => ({ 
          ...base, 
          padding: compact ? '2px 6px' : '2px 8px',
          flexWrap: 'wrap',
          gap: '2px'
        }), 
        multiValue: (base) => ({
          ...base,
          margin: 0,
          backgroundColor: '#e2e8f0',
          borderRadius: '4px',
          flexShrink: 0,
        }),
        multiValueLabel: (base) => ({
          ...base,
          padding: compact ? '0 4px' : '2px 6px',
          paddingLeft: compact ? '4px' : '6px',
          fontSize: compact ? '11px' : '12px',
          color: '#334155',
          fontWeight: 500,
        }),
        multiValueRemove: (base) => ({
          ...base,
          padding: compact ? '0 2px' : '0 4px',
          color: '#64748b',
          ':hover': {
            backgroundColor: '#cbd5e1',
            color: '#0f172a',
            borderRadius: '0 4px 4px 0',
          },
        }),
        placeholder: (base) => ({
          ...base,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }),
        singleValue: (base) => ({
          ...base,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }),
        dropdownIndicator: (base) => ({ 
          ...base, 
          padding: compact ? '2px' : '8px' 
        }), 
        clearIndicator: (base) => ({ 
          ...base, 
          padding: compact ? '2px' : '8px' 
        }) 
      }} 
      menuPortalTarget={document.body} 
    />
  );
}
