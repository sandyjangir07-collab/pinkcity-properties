// A repeating jali (jharokha lattice screen) motif — the eight-pointed star
// and octagon tessellation found on haveli windows across the old walled
// city. Used sparingly: hero backdrop and the one scroll-reveal moment.
export default function JaliPattern({ id = "jali", className, color = "currentColor", opacity = 1 }) {
  const size = 64;
  return (
    <svg className={className} width="100%" height="100%" aria-hidden="true">
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <g fill="none" stroke={color} strokeWidth="1.1" opacity={opacity}>
            <path d="M32 2 L48 16 L48 48 L32 62 L16 48 L16 16 Z" />
            <path d="M32 2 L16 16 M32 2 L48 16 M32 62 L16 48 M32 62 L48 48" />
            <circle cx="32" cy="32" r="9" />
            <path d="M0 0 L16 16 M64 0 L48 16 M0 64 L16 48 M64 64 L48 48" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
