import Link from "next/link";
import { Button, Card, CardText, CardTitle } from "@kalachakra/ui";

export default function Practitioner() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl">Practitioner mode</h1>
      <Card>
        <CardTitle>Coming in milestone 7</CardTitle>
        <CardText>
          The practitioner&apos;s desk (client list, working view, labs, rule profile switch and
          report editor) is the next milestone. Customer mode is ready to try now.
        </CardText>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/">Back to customer mode</Link>
        </Button>
      </Card>
    </div>
  );
}
