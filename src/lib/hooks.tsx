"use client";

import type { SearchParams } from "next/dist/server/request/search-params";
import { useEffect, useState } from "react";

/**
 *
 * @param v The value to debounce
 * @param options Debouncer function options
 * predicate: Custom "equality check" function. Return `true` if both parameters are to be considered the same.
 * delay: What delay after to change the value to
 * @returns The debounced value
 */
export const useDebounce = <T,>(
  v: T,
  options?: { delay?: number; predicate?: (p: T, n: T) => boolean },
) => {
  const { predicate, delay = 5000 } = options ?? {};
  const test = (p: T, n: T) => (predicate ? predicate(p, n) : p === n);

  const [val, setVal] = useState<T>(v);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!test(v, val)) {
      setHolding(true);
      const st = setTimeout(() => {
        setVal(v);
        setHolding(false);
      }, delay);
      return () => {
        clearTimeout(st);
        setHolding(false);
      };
    }
  }, [v]);

  return { value: val, holding };
};

/**
 *
 * @param v The value to debounce
 * @param options Debouncer function options
 * predicate: Custom "equality check" function. Return `true` if both parameters are to be considered the same.
 * delay: What delay after to change the value to
 * @returns The debounced value
 */
export const useDebounceT = <T, Q>(
  v: T,
  options: {
    delay?: number;
    predicate?: (p: T, n: T) => boolean;
    transform: (v: T) => Q;
  },
) => {
  const { predicate, delay = 5000 } = options ?? {};
  const test = (p: T, n: T) => (predicate ? predicate(p, n) : p === n);

  const [val, setVal] = useState<T>(v);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!test(v, val)) {
      setHolding(true);
      const st = setTimeout(() => {
        setVal(v);
        setHolding(false);
      }, delay);
      return () => {
        clearTimeout(st);
        setHolding(false);
      };
    }
  }, [v]);

  return { value: options.transform(val), holding };
};
