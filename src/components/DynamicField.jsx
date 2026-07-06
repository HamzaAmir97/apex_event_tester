// Renders one field from the event's registration_form_schema.
// Field shape (034): { id, type, label_en, label_ar?, system, required, options?, placeholder? }
// `lang` picks which label to show; falls back to label_en, then legacy label, then id.

export function fieldLabel(field, lang = 'en') {
  const ar = field.label_ar
  const en = field.label_en || field.label
  return (lang === 'ar' ? ar : en) || en || field.label || field.id
}

export default function DynamicField({ field, value, error, onChange, lang = 'en' }) {
  const id = field.id
  const label = fieldLabel(field, lang)
  const type = field.type || 'text'
  const required = !!field.required
  const options = Array.isArray(field.options) ? field.options : null

  const labelEl = (
    <label htmlFor={`f_${id}`}>
      {label} {required && <span className="req" title="required">*</span>}
    </label>
  )

  if (type === 'checkbox') {
    return (
      <div className="field">
        <label className="checkbox">
          <input
            id={`f_${id}`}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{label} {required && <span className="req">*</span>}</span>
        </label>
        {error && <span className="field-err">{error}</span>}
      </div>
    )
  }

  if (options && (type === 'select' || type === 'radio' || type === 'dropdown')) {
    return (
      <div className="field">
        {labelEl}
        <select
          id={`f_${id}`}
          className={`select${error ? ' err' : ''}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>Select…</option>
          {options.map((opt) => {
            const val = typeof opt === 'object' ? (opt.value ?? opt.id ?? opt.label) : opt
            const text = typeof opt === 'object' ? (opt.label ?? opt.value ?? opt.id) : opt
            return <option key={String(val)} value={val}>{text}</option>
          })}
        </select>
        {error && <span className="field-err">{error}</span>}
      </div>
    )
  }

  const inputType = type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'

  return (
    <div className="field">
      {labelEl}
      {type === 'textarea' ? (
        <textarea
          id={`f_${id}`}
          className={`input${error ? ' err' : ''}`}
          rows={3}
          value={value ?? ''}
          placeholder={field.placeholder || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={`f_${id}`}
          className={`input${error ? ' err' : ''}`}
          type={inputType}
          value={value ?? ''}
          placeholder={field.placeholder || ''}
          onChange={(e) => onChange(inputType === 'number' ? e.target.value : e.target.value)}
        />
      )}
      {error && <span className="field-err">{error}</span>}
    </div>
  )
}
