import { DraftRoom } from "@/components/draft-room/draft-room";

interface DraftPageProps {
  params: Promise<{ draftId: string }>;
}

export default async function DraftPage({ params }: DraftPageProps) {
  const { draftId } = await params;
  return <DraftRoom draftId={draftId} />;
}
