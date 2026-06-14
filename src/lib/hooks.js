import { useState, useEffect, useRef } from "react";

/**
 * useInView — adds the `in-view` class once an element scrolls into view.
 * Returns a ref to attach and a boolean. Respects reduced-motion (reveals immediately).
 */
export function useInView({ threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}

/**
 * useCountUp — animates a number from 0 → target once `active` is true.
 * Non-numeric targets (e.g. "∞") are returned as-is.
 */
export function useCountUp(target, active, { duration = 1400 } = {}) {
  const numeric = typeof target === "number" ? target : Number(target);
  const isNumber = Number.isFinite(numeric);
  const [value, setValue] = useState(isNumber ? 0 : target);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active || !isNumber) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(numeric);
      return;
    }

    let start = null;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(easeOutCubic(progress) * numeric));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, numeric, isNumber, duration]);

  return isNumber ? value : target;
}
