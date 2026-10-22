"use client";

import { useState, useTransition } from "react";
import type { TenantRole } from "@/lib/api";
import { updateMemberRole } from "./actions";

type Feedback = { ok: boolean; message: string } | null;

export function RoleSelect({
  tenantId,
  memberId,
  memberName,
  role,
  isSelf,
}: {
  tenantId: string;
  memberId: string;
  memberName: string;
  role: TenantRole;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(role);
  const [savedRole, setSavedRole] = useState(role);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Follow the server's value when it changes after a refresh
  if (role !== savedRole) {
    setSavedRole(role);
    setValue(role);
  }

  function onChange(next: TenantRole) {
    setValue(next);
    setFeedback(null);
    startTransition(async () => {
      const result = await updateMemberRole(tenantId, memberId, next);
      if (result.ok) {
        setFeedback({ ok: true, message: "Role updated" });
      } else {
        setValue(savedRole);
        setFeedback({ ok: false, message: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label={`Role for ${memberName}`}
        value={value}
        disabled={pending || isSelf}
        title={isSelf ? "You can't remove your own admin access" : undefined}
        onChange={(event) => onChange(event.target.value as TenantRole)}
        className="w-32 rounded-md border border-zinc-300 bg-white py-1.5 pl-3 pr-8 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="ADMIN">Admin</option>
        <option value="MEMBER">Member</option>
      </select>
      {pending && <span className="text-xs text-zinc-500">Saving…</span>}
      {!pending && isSelf && (
        <span className="text-xs text-zinc-500">That&apos;s you</span>
      )}
      {!pending && feedback && (
        <span
          role={feedback.ok ? "status" : "alert"}
          className={`text-xs ${feedback.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {feedback.message}
        </span>
      )}
    </div>
  );
}
