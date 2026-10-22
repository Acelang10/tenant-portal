"use client";

import Link from "next/link";

// Unexpected failures, e.g. the API is down while loading the signed-in user
export default function MembersError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div
        role="alert"
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="font-semibold">Couldn&apos;t load members</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Something went wrong. Check that the API is running and try again.
        </p>
        <div className="mt-4 flex gap-3 text-sm">
          <button
            onClick={() => retry()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Try again
          </button>
          <Link href="/dashboard" className="px-3 py-1.5 text-indigo-600 hover:underline dark:text-indigo-400">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
