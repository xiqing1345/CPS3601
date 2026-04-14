import { NextResponse } from "next/server";

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

  return NextResponse.json({
    reply: buildFallbackReply(message),
  });
}
