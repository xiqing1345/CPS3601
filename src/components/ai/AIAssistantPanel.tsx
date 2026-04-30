"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

function collectVisibleTextSnapshot(maxChars = 7000) {
  const selectors = [
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "li",
    "a",
    "button",
    "label",
    "input",
    "textarea",
    "[role='button']",
  ].join(",");

  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selectors));
  const lines: string[] = [];
  const seen = new Set<string>();

  const pushLine = (line: string) => {
    if (!line) return;
    if (seen.has(line)) return;
    seen.add(line);
    lines.push(line);
  };

  const pageTitle = document.title?.trim() || "Untitled page";
  const path = `${window.location.pathname}${window.location.search}`;
  const selectedText = (window.getSelection()?.toString() || "").replace(/\s+/g, " ").trim();

  pushLine(`# Page title: ${pageTitle}`);
  pushLine(`# Path: ${path}`);
  if (selectedText) {
    pushLine(`# User selected text: ${selectedText}`);
  }

  for (const el of nodes) {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      continue;
    }

    const rect = el.getBoundingClientRect();
    const isVisible = rect.width > 0
      && rect.height > 0
      && rect.bottom >= 0
      && rect.right >= 0
      && rect.top <= window.innerHeight
      && rect.left <= window.innerWidth;
    if (!isVisible) {
      continue;
    }

    const tag = el.tagName.toLowerCase();
    let text = "";

    if (tag === "input" || tag === "textarea") {
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      const value = (input.value || "").trim();
      const placeholder = (input.placeholder || "").trim();
      text = value || placeholder;
    } else {
      text = (el.innerText || "").replace(/\s+/g, " ").trim();
    }

    if (!text || text.length < 2) {
      continue;
    }

    const line = `[${tag}] ${text}`;
    pushLine(line);

    if (lines.join("\n").length >= maxChars) {
      break;
    }
  }

  return lines.join("\n").slice(0, maxChars);
}

export function AIAssistantPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSnapshotSize, setLastSnapshotSize] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi, I am your demo assistant. Ask me about login, proposals, or chat flow.",
    },
  ]);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    const screenText = collectVisibleTextSnapshot();
    setLastSnapshotSize(screenText.length);

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, screenText }),
      });

      const data = await res.json();
      const reply = res.ok ? String(data.reply ?? "") : String(data.error ?? "Assistant is unavailable");
      setMessages((prev) => [...prev, { role: "assistant", text: reply || "I cannot answer that right now." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))]">
      {open ? (
        <section className="campus-card rounded-xl border border-slate-300 bg-white/95 p-3 shadow-xl backdrop-blur">
          <header className="mb-2 flex items-center justify-between">
            <h2 className="campus-heading text-sm font-semibold">AI Assistant</h2>
            <button
              type="button"
              className="campus-btn-secondary rounded-md px-2 py-1 text-xs"
              onClick={() => setOpen(false)}
            >
              Collapse
            </button>
          </header>

          <div className="mb-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`rounded-md px-2 py-1 text-xs ${m.role === "assistant" ? "bg-slate-100 text-slate-800" : "bg-sky-100 text-sky-900"}`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSend();
                }
              }}
            />
            <button
              type="button"
              className="campus-btn-primary rounded-md px-3 py-1 text-sm disabled:opacity-60"
              onClick={() => void onSend()}
              disabled={loading}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {`Screen-read context ready (${lastSnapshotSize} chars captured on last send).`}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">Reads visible on-screen text as context.</p>
        </section>
      ) : (
        <button
          type="button"
          className="campus-btn-primary ml-auto block rounded-full px-4 py-2 text-sm shadow-lg"
          onClick={() => setOpen(true)}
        >
          AI Assistant
        </button>
      )}
    </div>
  );
}
