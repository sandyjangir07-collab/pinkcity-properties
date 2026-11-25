export default function JaliMedallion({ className, color = "#C43868" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={color} strokeWidth="1.3">
      <path d="M32 4 L52 18 L52 46 L32 60 L12 46 L12 18 Z" />
      <path d="M32 4 L12 18 M32 4 L52 18 M32 60 L12 46 M32 60 L52 46" />
      <circle cx="32" cy="32" r="10" />
      <path d="M32 22v20M22 32h20" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
