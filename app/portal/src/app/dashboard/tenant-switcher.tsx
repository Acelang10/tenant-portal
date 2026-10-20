"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Tenant } from "@/lib/api";

export function TenantSwitcher({
  tenants,
  activeSlug,
}: {
  tenants: Tenant[];
  activeSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Switch tenant</span>
      <select
        value={activeSlug}
        disabled={pending || tenants.length < 2}
        onChange={(event) => {
          const slug = event.target.value;
          startTransition(() => router.push(`/dashboard?tenant=${slug}`));
        }}
        className="rounded-md border border-zinc-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.slug}>
            {tenant.name} · {tenant.role === "ADMIN" ? "Admin" : "Member"}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-zinc-500">Switching…</span>}
    </label>
  );
}
