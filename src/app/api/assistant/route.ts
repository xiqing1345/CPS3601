import { NextResponse } from "next/server";

const SYSTEM_PROMPT = [
  "你是 Dorm Exchange 内置 AI 助手。",
  "当前场景是一个宿舍沟通系统，用户会讨论宿舍日常协作：聊天、提案、投票、通知、室友协同。",
  "回答目标：清晰、可执行、礼貌，优先给简短步骤。",
  "如果用户提到功能问题，优先按这个系统的流程给排查建议：登录 -> 进入房间 -> 聊天/提案 -> 投票 -> 协议。",
  "不要编造系统里不存在的入口；如果不确定，明确说明并给替代方案。",
  "默认使用中文回答，除非用户明确要求英文。",
].join("\n");

function buildFallbackReply(input: string) {
  const text = input.toLowerCase();

  if (text.includes("login") || text.includes("登录")) {
    return "如果出现登录后跳回登录页，先刷新并重新登录一次。演示模式使用本地会话，建议用无痕窗口测试。";
  }

  if (text.includes("proposal") || text.includes("提案")) {
    return "演示数据里内置了 2 条提案：Weekly Chore Rotation（active）和 Quiet Hours 11PM-7AM（pending）。你可以在聊天页右侧 Recent Proposals 里查看。";
  }

  if (text.includes("chat") || text.includes("聊天")) {
    return "进入房间后在消息区可以看到预设聊天记录。若没看到，请先确认你已在 DORM42 房间，必要时退出后重新登录。";
  }

  return "我可以帮你快速定位演示流程：1) 登录演示账号 2) 进入房间聊天 3) 查看 proposal 4) 投票触发 agreement。告诉我你卡在哪一步。";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json({
      reply: buildFallbackReply(message),
    });
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
      const fallback = buildFallbackReply(message);
      return NextResponse.json({ reply: fallback });
    }

    const data = await response.json();
    const reply = String(data?.choices?.[0]?.message?.content ?? "").trim();

    return NextResponse.json({
      reply: reply || buildFallbackReply(message),
    });
  } catch {
    return NextResponse.json({
      reply: buildFallbackReply(message),
    });
  }

}
