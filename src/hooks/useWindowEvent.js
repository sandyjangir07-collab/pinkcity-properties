import { useEffect, useRef } from "react";

// Run a function whenever a named window event fires (always uses the latest function).
export function useWindowEvent(name, fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = () => ref.current && ref.current();
    window.addEventListener(name, h);
    return () => window.removeEventListener(name, h);
  }, [name]);
}
