import type { NewListen } from "@shared/api.js";

type Candidate = { listen: NewListen; needed: number; heard: number; done: boolean };

let candidate: Candidate | null = null;

export function startCandidate(listen: NewListen): void {
    const duration = listen.duration ?? 0;
    candidate = duration < 30_000 ? null : { listen, needed: Math.min(duration / 2, 4 * 60 * 1000), heard: 0, done: false };
}

export function addHeard(ms: number): void {
    if (!candidate || candidate.done) return;
    candidate.heard += ms;
    if (candidate.heard < candidate.needed) return;
    candidate.done = true;
    window.player.listens.record(candidate.listen).catch((err) => console.error("Failed to record listen:", err));
}
