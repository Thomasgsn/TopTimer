/**
 * The stopwatch is computed from timestamps instead of counting ticks: it stays
 * exact while the window is hidden, when WebKit slows its timers down.
 */
export interface Stopwatch {
  // Time accumulated before the current run.
  elapsedMs: number;
  // `Date.now()` when the current run started, or null while paused.
  startedAt: number | null;
}

export interface DurationParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export function pausedStopwatch(elapsedMs = 0): Stopwatch {
  return { elapsedMs, startedAt: null };
}

export function isRunning(stopwatch: Stopwatch): boolean {
  return stopwatch.startedAt !== null;
}

export function elapsedAt(stopwatch: Stopwatch, now: number): number {
  if (stopwatch.startedAt === null) return stopwatch.elapsedMs;
  // A clock set backwards must never make the stopwatch go back in time.
  return stopwatch.elapsedMs + Math.max(0, now - stopwatch.startedAt);
}

export function start(stopwatch: Stopwatch, now: number): Stopwatch {
  return isRunning(stopwatch) ? stopwatch : { elapsedMs: stopwatch.elapsedMs, startedAt: now };
}

export function pause(stopwatch: Stopwatch, now: number): Stopwatch {
  return pausedStopwatch(elapsedAt(stopwatch, now));
}

export function splitDuration(elapsedMs: number): DurationParts {
  const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}
