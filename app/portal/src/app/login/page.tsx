import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Tenant Portal" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg bg-indigo-600 text-lg font-semibold text-white">
            T
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Tenant Portal
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Use any seeded user, e.g. <code className="font-mono">alice</code>{" "}
            / <code className="font-mono">123456</code>
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
