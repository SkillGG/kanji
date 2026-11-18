import type { Metadata } from "next";
import { api } from "~/trpc/server";
import { ScopeBuilder } from "../../_components/session/scopeBuilder";

export const metadata: Metadata = {
  title: "Creating new study session",
};

export default async function NewSessionPage() {
  void api.session.getTags.prefetch();
  void api.session.getPoolCounts.prefetch({ tagIds: [] });
  void api.session.getKanjiTags.prefetch();
  void api.session.getWordTags.prefetch();

  return <ScopeBuilder />;
}
