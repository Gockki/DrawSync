// src/components/FakeProgressOverlay.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";

/**
 * Hidas aikataulutettu fake-progress:
 * 0→40% (15s) → 63% (15s) → 85% (30s) → 93% (5s), sitten odottaa.
 * Kun complete===true JA 93% on saavutettu, viimeistellään 100%:iin.
 */
export default function FakeProgressOverlay({
  open,
  complete,
  onFinish,
  gif,
  message = "Analysoidaan piirustusta…",
  finishDuration = 600,
  schedule: scheduleProp,
}) {
  const defaultSchedule = useMemo(
    () => [
      { to: 0.40, ms: 15000 },
      { to: 0.63, ms: 15000 },
      { to: 0.85, ms: 30000 },
      { to: 0.93, ms:  5000 },
    ],
    []
  );
  // pidä aikataulu stabiilina
  const planRef = useRef(defaultSchedule);
  useEffect(() => {
    planRef.current =
      Array.isArray(scheduleProp) && scheduleProp.length
        ? scheduleProp
        : defaultSchedule;
  }, [scheduleProp, defaultSchedule]);

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const rafRef = useRef(0);
  const startRef = useRef(0);
  const finishingRef = useRef(false);
  const finishStartRef = useRef(0);

  const baseFromElapsed = (elapsedMs) => {
    const schedule = planRef.current;
    let acc = 0;
    let prevTo = 0;
    for (const stage of schedule) {
      const start = acc;
      const end = acc + stage.ms;
      if (elapsedMs >= end) {
        prevTo = stage.to;
        acc = end;
        continue;
      }
      const t = (elapsedMs - start) / stage.ms;
      return (prevTo + (stage.to - prevTo) * t) * 100;
    }
    return (schedule.at(-1)?.to ?? 0.93) * 100;
  };

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    if (!open) {
      setVisible(false);
      setProgress(0);
      return;
    }

    setVisible(true);
    setProgress(0);
    startRef.current = performance.now();
    finishingRef.current = false;

    const maxHold = (planRef.current.at(-1)?.to ?? 0.93) * 100;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startRef.current;

      if (!finishingRef.current) {
        const base = Math.min(baseFromElapsed(elapsed), maxHold);
        setProgress((p) => (base > p ? base : p));

        if (complete && base >= maxHold - 0.01) {
          finishingRef.current = true;
          finishStartRef.current = now;
        }
      } else {
        const t = Math.min(1, (now - finishStartRef.current) / finishDuration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        setProgress(maxHold + (100 - maxHold) * eased);

        if (t >= 1) {
          setTimeout(() => {
            onFinish?.();
            setVisible(false);
            setProgress(0);
          }, 80);
          return; // lopeta looppi
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, complete, finishDuration]); // HUOM: schedule ei ole riippuvuus

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-w-[92vw] p-6">
        <div className="flex items-start gap-4">
          {gif ? (
            <img
              src={gif}
              alt="loading"
              className="w-20 h-20 object-contain select-none"
              draggable={false}
            />
          ) : (
            <div className="w-20 h-20" />
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {progress < 93 ? "Rakennetaan tulokset…" : "Odotetaan palvelinta…"}
            </p>

            <div className="mt-4 h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-[width] duration-200 ease-out"
                style={{ width: `${Math.round(progress)}%` }}
              />
            </div>
            <div className="mt-1 text-right text-xs text-gray-500">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
