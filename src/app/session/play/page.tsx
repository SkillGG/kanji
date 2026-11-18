import type { Metadata } from "next";
import Link from "next/link";
import { Game } from "~/app/_components/session/game";
import { searchParamsToScope } from "~/lib/sessionScope";
import { parseServerSearchParams } from "~/lib/utils";

export const generateMetadata = (): Metadata => {
  return { title: "Study session" };
};

export default async function SessionPlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await parseServerSearchParams({ searchParams });

  const scope = searchParamsToScope(params);

  if (!scope) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-800 text-white">
        <p className="text-slate-300">No session recipe found.</p>
        <Link
          href="/session/new"
          className="mt-4 rounded-xl border border-blue-500 px-3 py-1.5"
        >
          Create a session
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 text-white">
      <Game scope={scope} />
    </div>
  );
}
