"use client";

import { useCallback, useRef, useState } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────

function getPageText(): string {
  const selectors = [
    "h1", "h2", "h3", "h4", "h5",
    "p", "li", "td", "th",
    "label", "button", "a",
    "article", "section",
  ].join(",");

  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selectors));
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const el of nodes) {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;

    const rect = el.getBoundingClientRect();
    const visible =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom >= 0 &&
      rect.top <= window.innerHeight * 1.5;
    if (!visible) continue;

    const text = (el.innerText ?? "").replace(/\s+/g, " ").trim();
    if (!text || text.length < 2 || seen.has(text)) continue;
    seen.add(text);
    lines.push(text);
  }

  return lines.join(". ").slice(0, 12000);
}

// ── component ─────────────────────────────────────────────────────────────────

type ReadMode = "page" | "selection" | "custom";

export function ScreenReaderPanel() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ReadMode>("page");
  const [customText, setCustomText] = useState("");
  const [rate, setRate] = useState(1.0);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentWord, setCurrentWord] = useState("");

  // Keep the full text so we can reference charIndex in onboundary
  const fullTextRef = useRef("");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── TTS controls ─────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setCurrentWord("");
    utterRef.current = null;
  }, []);

  const startSpeaking = useCallback(
    (text: string, speechRate: number) => {
      window.speechSynthesis.cancel();

      if (!text.trim()) return;

      fullTextRef.current = text;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = speechRate;
      utter.lang = "en-US";

      utter.onstart = () => {
        setSpeaking(true);
        setPaused(false);
      };

      utter.onend = () => {
        setSpeaking(false);
        setPaused(false);
        setCurrentWord("");
        utterRef.current = null;
      };

      utter.onerror = () => {
        setSpeaking(false);
        setPaused(false);
        setCurrentWord("");
        utterRef.current = null;
      };

      utter.onboundary = (ev: SpeechSynthesisEvent) => {
        if (ev.name === "word") {
          const src = fullTextRef.current;
          const end = ev.charIndex + (ev.charLength ?? 20);
          const word = src.slice(ev.charIndex, end).replace(/[^\w''-]/g, "").trim();
          if (word) setCurrentWord(word);
        }
      };

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    },
    [],
  );

  function handleRead() {
    let text = "";
    if (mode === "page") {
      text = getPageText();
    } else if (mode === "selection") {
      text = window.getSelection()?.toString().trim() ?? "";
      if (!text) {
        alert("Please highlight some text on the page first, then click Read.");
        return;
      }
    } else {
      text = customText.trim();
      if (!text) return;
    }
    startSpeaking(text, rate);
  }

  function handlePauseResume() {
    if (!speaking) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }

  function handleRateChange(newRate: number) {
    setRate(newRate);
    // If already speaking, restart from beginning with new rate
    if (speaking) {
      const text = fullTextRef.current;
      stop();
      // Small timeout gives cancel() a chance to flush
      setTimeout(() => startSpeaking(text, newRate), 80);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (!open) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          type="button"
          className="campus-btn-secondary flex items-center gap-2 rounded-full px-4 py-2 text-sm shadow-lg"
          onClick={() => setOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Screen Reader
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(320px,calc(100vw-2rem))]">
      <section className="campus-card rounded-xl border border-slate-300 bg-white/95 p-3 shadow-xl backdrop-blur">
        {/* Header */}
        <header className="mb-3 flex items-center justify-between">
          <h2 className="campus-heading text-sm font-semibold">Screen Reader</h2>
          <button
            type="button"
            className="campus-btn-secondary rounded-md px-2 py-1 text-xs"
            onClick={() => { stop(); setOpen(false); }}
          >
            Collapse
          </button>
        </header>

        {/* Mode tabs */}
        <div className="mb-3 grid grid-cols-3 gap-1">
          {(["page", "selection", "custom"] as ReadMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { stop(); setMode(m); }}
              className={`rounded-md border px-1.5 py-1 text-xs transition-colors ${
                mode === m
                  ? "border-sky-700 bg-sky-50 font-semibold text-sky-800"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m === "page" ? "Whole Page" : m === "selection" ? "Selected" : "Custom"}
            </button>
          ))}
        </div>

        {/* Mode hints / inputs */}
        {mode === "selection" && (
          <p className="mb-3 rounded-md bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
            Highlight any text on the page, then click <strong>Read</strong>.
          </p>
        )}

        {mode === "custom" && (
          <textarea
            className="mb-3 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
            rows={4}
            placeholder="Paste or type text to be read aloud..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
          />
        )}

        {/* Speed slider */}
        <label className="mb-3 block text-xs text-slate-600">
          <div className="mb-1 flex justify-between">
            <span>Reading Speed</span>
            <span className="font-semibold text-slate-800">{rate.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={rate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            className="w-full accent-sky-700"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
            <span>0.5× (Slow)</span>
            <span>1.0× (Normal)</span>
            <span>2.5× (Fast)</span>
          </div>
        </label>

        {/* Current word indicator */}
        <div
          className={`mb-3 rounded-md border px-3 py-2 text-center text-xs transition-all ${
            speaking && currentWord
              ? "border-sky-200 bg-sky-50 text-sky-800"
              : "border-slate-200 bg-slate-50 text-slate-400"
          }`}
        >
          {speaking && currentWord ? (
            <>
              Reading: <span className="font-semibold">&ldquo;{currentWord}&rdquo;</span>
            </>
          ) : speaking ? (
            "Starting..."
          ) : (
            "Not reading"
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            className="campus-btn-primary flex-1 rounded-md px-2 py-1.5 text-xs disabled:opacity-60"
            onClick={handleRead}
            disabled={speaking && !paused}
          >
            {speaking && !paused ? "Reading..." : paused ? "Restart" : "Read"}
          </button>

          {speaking && (
            <button
              type="button"
              className="campus-btn-secondary rounded-md px-2 py-1.5 text-xs"
              onClick={handlePauseResume}
            >
              {paused ? "Resume" : "Pause"}
            </button>
          )}

          {(speaking || paused) && (
            <button
              type="button"
              className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1.5 text-xs text-rose-700 hover:bg-rose-100"
              onClick={stop}
            >
              Stop
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
