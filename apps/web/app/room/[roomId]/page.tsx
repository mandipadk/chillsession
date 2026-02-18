import type { ReactElement } from "react";
import { RoomClient } from "../../../components/RoomClient";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ invite?: string }>;
}

export default function RoomPage({
  params,
  searchParams
}: RoomPageProps): Promise<ReactElement> {
  return Promise.all([params, searchParams]).then(([resolvedParams, resolvedSearch]) => (
    <RoomClient roomId={resolvedParams.roomId} inviteToken={resolvedSearch.invite} />
  ));
}
