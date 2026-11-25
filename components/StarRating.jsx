export default function StarRating({ value, max = 5 }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} width="15" height="15" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`star-${i}-${value}`}>
                <stop offset={`${fill * 100}%`} stopColor="#C43868" />
                <stop offset={`${fill * 100}%`} stopColor="#E4D9CE" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#star-${i}-${value})`}
              d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01Z"
            />
          </svg>
        );
      })}
    </div>
  );
}
