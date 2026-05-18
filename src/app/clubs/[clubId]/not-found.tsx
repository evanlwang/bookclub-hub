import Link from "next/link";
import { Button, Card } from "@/components/ui";

// Triggered when a server component in this segment calls notFound() — e.g.
// the layout fetches a club by invalid id and throws NOT_FOUND.
export default function ClubNotFound() {
  return (
    <div className="w-full max-w-[640px] mx-auto py-12">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-semibold text-ink mb-2">
          Club not found
        </h1>
        <p className="text-sm text-ink-2 mb-6">
          We couldn&rsquo;t find that club. It may have been removed, or you
          might not have access.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/">
            <Button variant="primary">Back to dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
