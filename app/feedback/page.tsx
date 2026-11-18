import { Suspense } from "react";
import { FeedbackClient } from "./FeedbackClient";

export default function FeedbackPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-screen max-w-md px-5 py-8">Loading feedback...</main>}>
      <FeedbackClient />
    </Suspense>
  );
}
