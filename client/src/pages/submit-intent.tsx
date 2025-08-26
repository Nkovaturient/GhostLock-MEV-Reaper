import IntentForm from "@/components/IntentForm";

export const metadata = {
  title: "Submit Intent — GhostLock",
};

export default function SubmitIntentPage() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Submit Intent</h1>
      <p className="text-sm opacity-80 mb-6">
        Encrypt and submit a trade intent. It will be decryptable after your target block.
      </p>
      <IntentForm />
    </div>
  );
}
