export function Field({ label, hint, error, required, children }) {
  return (
    <div>
      <label className="field-label">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={`field-input ${error ? 'border-rose-500/70' : ''} ${props.className || ''}`}
    />
  );
}

export function Textarea({ error, ...props }) {
  return (
    <textarea
      {...props}
      className={`field-input resize-y ${error ? 'border-rose-500/70' : ''} ${props.className || ''}`}
    />
  );
}

export function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`field-input ${error ? 'border-rose-500/70' : ''} ${props.className || ''}`}
    >
      {children}
    </select>
  );
}
