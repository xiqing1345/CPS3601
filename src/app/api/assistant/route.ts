import { NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "You are the built-in AI assistant for Dorm Exchange.",
  "This is a dorm communication system where users discuss roommate coordination: chat, proposals, voting, notifications, and agreements.",
  "Answer goals: be clear, actionable, and concise.",
  "When users report feature issues, prioritize this troubleshooting flow: login -> room entry -> chat/proposal -> vote -> agreement.",
  "Do not invent UI paths or features that do not exist. If uncertain, say so and provide a practical alternative.",
  "Always respond in English.",
].join("\n");

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json({ reply: "Connection failed" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ reply: "Connection failed" });
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    const reply = typeof rawContent === "string"
      ? rawContent.trim()
      : Array.isArray(rawContent)
        ? rawContent.map((part) => String(part?.text ?? "")).join(" ").trim()
        : "";

    return NextResponse.json({
      reply: reply || "Connection failed",
    });
  } catch {
    return NextResponse.json({ reply: "Connection failed" });
  }

}
