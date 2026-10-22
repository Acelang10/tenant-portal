import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/api";
import { getMembers, type AccountStatus } from "@/lib/members";
import { RoleSelect } from "./role-select";

export const metadata: Metadata = { title: "Members · Tenant Portal" };

const card =
  "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export default function MembersPage({
  searchParams,
}: PageProps<"/dashboard/members">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Suspense fallback={<MembersSkeleton />}>
          <Members searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Members({
  searchParams,
}: Pick<PageProps<"/dashboard/members">, "searchParams">) {
  const [user, { tenant: slug }] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  // The slug only picks which tenant to ask for; the API checks access to it
  const tenant = user.tenants.find((t) => t.slug === slug) ?? user.tenants[0];

  if (!tenant) {
    return (
      <div className={card}>
        <h1 className="text-lg font-semibold">No tenants yet</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ask an admin to add you to a tenant.
        </p>
      </div>
    );
  }

  const result = await getMembers(tenant.id);
  const href = `/dashboard/members?tenant=${tenant.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard?tenant=${tenant.slug}`}
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {tenant.name}
        </p>
      </div>

      {!result.ok ? (
        <div role="alert" className={card}>
          <h2 className="font-semibold">
            {result.status === 403
              ? "You can't manage members of this tenant"
              : "Couldn't load members"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{result.message}</p>
          {result.status !== 403 && (
            <Link
              href={href}
              className="mt-4 inline-block rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Try again
            </Link>
          )}
        </div>
      ) : result.members.length === 0 ? (
        <div className={card}>
          <h2 className="font-semibold">No members yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {tenant.name} doesn&apos;t have any members.
          </p>
        </div>
      ) : (
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {result.members.map((member) => (
                <tr key={member.id}>
                  <td className="px-5 py-3 font-medium">{member.name}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {member.email}
                  </td>
                  <td className="px-5 py-3">
                    <AccountStatusBadge status={member.status} />
                  </td>
                  <td className="px-5 py-3">
                    <RoleSelect
                      tenantId={tenant.id}
                      memberId={member.id}
                      memberName={member.name}
                      role={member.role}
                      isSelf={member.id === user.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const { label, style } = {
    ACTIVE: {
      label: "Active",
      style: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    SUSPENDED: {
      label: "Suspended",
      style: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    },
  }[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

function MembersSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading members">
      <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    </div>
  );
}
