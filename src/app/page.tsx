import { api } from "~/trpc/server";
import Link from "next/link";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-800 text-white">
      <div className="flex gap-10">
        <Link
          href={"/db"}
          className="cursor-pointer rounded-xl border border-blue-500 px-2 py-1"
        >
          Manage DB
        </Link>
        <Link
          href={"/session/new"}
          className="cursor-pointer rounded-xl border border-blue-500 px-2 py-1"
        >
          Create a session
        </Link>
      </div>
    </main>
  );
}
