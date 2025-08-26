import { IntentStatus } from "@/lib/contracts";

export default function StatusBadge({ status }: { status: IntentStatus }) {
  const color =
    status === "Settled"
      ? "bg-green-500/15 text-green-700 dark:text-green-200 border-green-500/30"
      : status === "Ready"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30"
      : "bg-gray-500/15 text-gray-700 dark:text-gray-200 border-gray-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${color}`}>
      {status}
    </span>
  );
}
