import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/localdb/mode";
import { getLocalSessionUser } from "@/lib/localdb/session";
import { getLocalDb } from "@/lib/localdb/db";
import { EditProposalForm } from "@/components/proposals/EditProposalForm";
import type { Category } from "@/types/domain";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ roomId: string; proposalId: string }>;
}) {
  const { roomId, proposalId } = await params;

  if (isLocalMode()) {
    const user = await getLocalSessionUser();
    if (!user) {
      redirect("/auth/login");
    }

    const db = getLocalDb();
    const proposal = db
      .prepare(
        "select id, room_id, proposer_id, category, title, description, full_details, status from proposals where id = ? and room_id = ?",
      )
      .get(proposalId, roomId) as
      | {
          id: string;
          room_id: string;
          proposer_id: string;
          category: Category;
          title: string;
          description: string;
          full_details: string;
          status: string;
        }
      | undefined;

    if (!proposal || proposal.proposer_id !== user.id || proposal.status === "active") {
      notFound();
    }

    return (
      <EditProposalForm
        roomId={roomId}
        proposalId={proposalId}
        initialCategory={proposal.category}
        initialTitle={proposal.title}
        initialDescription={proposal.description}
        initialFullDetails={proposal.full_details}
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id,room_id,proposer_id,category,title,description,full_details,status")
    .eq("id", proposalId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (!proposal || proposal.proposer_id !== user.id || proposal.status === "active") {
    notFound();
  }

  return (
    <EditProposalForm
      roomId={roomId}
      proposalId={proposalId}
      initialCategory={proposal.category as Category}
      initialTitle={proposal.title}
      initialDescription={proposal.description}
      initialFullDetails={proposal.full_details}
    />
  );
}
