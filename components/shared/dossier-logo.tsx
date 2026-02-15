export function DossierLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M24 12 L24 84 L52 84 C72 84 84 70 84 48 C84 26 72 12 52 12 Z"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <line x1="24" y1="36" x2="40" y2="36" stroke="currentColor" strokeWidth="1.5" />
      <line x1="40" y1="36" x2="40" y2="28" stroke="currentColor" strokeWidth="1.5" />
      <line x1="40" y1="28" x2="56" y2="28" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="56" cy="28" r="2" fill="currentColor" />
      <line x1="24" y1="48" x2="52" y2="48" stroke="currentColor" strokeWidth="1.5" />
      <line x1="52" y1="48" x2="52" y2="40" stroke="currentColor" strokeWidth="1.5" />
      <line x1="52" y1="40" x2="64" y2="40" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="64" cy="40" r="2" fill="currentColor" />
      <line x1="24" y1="60" x2="44" y2="60" stroke="currentColor" strokeWidth="1.5" />
      <line x1="44" y1="60" x2="44" y2="52" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="44" cy="52" r="2" fill="currentColor" />
      <line x1="24" y1="72" x2="36" y2="72" stroke="currentColor" strokeWidth="1.5" />
      <line x1="36" y1="72" x2="36" y2="66" stroke="currentColor" strokeWidth="1.5" />
      <line x1="36" y1="66" x2="58" y2="66" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="58" cy="66" r="2" fill="currentColor" />
      <circle cx="72" cy="56" r="2.5" fill="currentColor" />
      <line x1="58" y1="66" x2="72" y2="56" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
