"use client";

/**
 * useTurnAnimation — shared React hook for the preview+tween animation state machine.
 *
 * Used by both SpectateClient (replay step-forward) and PlayPollingClient (live turn resolve).
 * Owns all animation state: overlays, activeTween, animPhase.
 * Caller builds UnifiedStep[] via buildUnifiedSteps(), then calls startAnimation().
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { Overlays, TweenTarget } from "./BattleCanvas";
import type { UnifiedStep } from "./turnAnimation";

export type AnimPhase = "idle" | "animating";

export type TurnAnimationControls = {
  animPhase: AnimPhase;
  overlays: Overlays | null;
  activeTween: TweenTarget | null;
  /** Begin playing a sequence of unified steps. onComplete fires when the last step finishes. */
  startAnimation: (steps: UnifiedStep[], onComplete: () => void) => void;
  /** Immediately cancel any in-progress animation and fire onComplete. */
  cancelAnimation: () => void;
};

export function useTurnAnimation(): TurnAnimationControls {
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [overlays, setOverlays] = useState<Overlays | null>(null);
  const [activeTween, setActiveTween] = useState<TweenTarget | null>(null);

  const animRef = useRef<{
    unifiedSteps: UnifiedStep[];
    stepIdx: number;
    runId: number;
    timeoutId: ReturnType<typeof setTimeout> | null;
    onComplete: (() => void) | null;
  }>({
    unifiedSteps: [],
    stepIdx: 0,
    runId: 0,
    timeoutId: null,
    onComplete: null,
  });

  // Forward ref so runStep can call itself recursively without stale closures
  const runStepRef = useRef<() => void>(() => {});

  const finish = useCallback(() => {
    const a = animRef.current;
    if (a.timeoutId !== null) {
      clearTimeout(a.timeoutId);
      a.timeoutId = null;
    }
    setOverlays(null);
    setActiveTween(null);
    setAnimPhase("idle");
    const cb = a.onComplete;
    a.onComplete = null;
    cb?.();
  }, []);

  // Stable ref so it's always current inside async callbacks
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const runStep = useCallback(() => {
    const a = animRef.current;

    if (a.stepIdx >= a.unifiedSteps.length) {
      finishRef.current();
      return;
    }

    const step = a.unifiedSteps[a.stepIdx];
    a.stepIdx += 1;

    // 1 — Accumulate preview arrows/ghosts
    if (
      step.previewOverlay &&
      (step.previewOverlay.arrows?.length || step.previewOverlay.ghosts?.length)
    ) {
      setOverlays((prev) => ({
        ghosts: [...(prev?.ghosts ?? []), ...(step.previewOverlay.ghosts ?? [])],
        arrows: [...(prev?.arrows ?? []), ...(step.previewOverlay.arrows ?? [])],
        labels: prev?.labels ?? [],
      }));
    }

    const tweenKey = `${a.runId}-${step.key}`;

    // 2 — After preview pause, fire tween
    const fireTween = () => {
      // Ghost circles only meaningful during preview pause — clear on tween start
      setOverlays((prev) => (prev ? { ...prev, ghosts: [] } : prev));

      setActiveTween({
        key: tweenKey,
        from: step.tweenFrom,
        to: step.tweenTo,
        duration: step.tweenMs,
        onComplete: () => {
          setActiveTween(null);
          if (step.recoilTo) {
            setActiveTween({
              key: `${tweenKey}-recoil`,
              from: step.tweenTo,
              to: step.recoilTo,
              duration: step.recoilMs ?? 80,
              onComplete: () => {
                setActiveTween(null);
                afterExecute();
              },
            });
          } else {
            afterExecute();
          }
        },
      });
    };

    const afterExecute = () => {
      if (step.impactOverlay) {
        setOverlays((prev) => ({
          ghosts: prev?.ghosts ?? [],
          arrows: prev?.arrows ?? [],
          labels: [...(prev?.labels ?? []), ...(step.impactOverlay?.labels ?? [])],
        }));
        a.timeoutId = setTimeout(() => {
          setOverlays((prev) => ({ ...prev, labels: [] }));
          runStepRef.current();
        }, step.impactMs);
      } else {
        runStepRef.current();
      }
    };

    if (step.previewMs > 0) {
      a.timeoutId = setTimeout(fireTween, step.previewMs);
    } else {
      fireTween();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  runStepRef.current = runStep;

  const startAnimation = useCallback(
    (steps: UnifiedStep[], onComplete: () => void) => {
      const a = animRef.current;
      // Cancel any in-progress animation
      if (a.timeoutId !== null) {
        clearTimeout(a.timeoutId);
        a.timeoutId = null;
      }
      a.unifiedSteps = steps;
      a.stepIdx = 0;
      a.runId += 1;
      a.onComplete = onComplete;
      setAnimPhase("animating");
      setOverlays(null);
      setActiveTween(null);
      runStepRef.current();
    },
    [],
  );

  const cancelAnimation = useCallback(() => {
    finishRef.current();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const a = animRef.current;
      if (a.timeoutId !== null) clearTimeout(a.timeoutId);
    };
  }, []);

  return { animPhase, overlays, activeTween, startAnimation, cancelAnimation };
}
