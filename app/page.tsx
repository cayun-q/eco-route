import { DistanceChecker } from "@/components/distance-checker";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-8 sm:px-6">
          <p className="text-sm font-medium text-emerald-800">Eco Trip</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Connecting-flight distance
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Look up two airports. If OpenFlights publishes a route between them,
            we calculate the great-circle distance from their coordinates.
          </p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
        <DistanceChecker />
        <p className="mt-8 text-xs text-muted-foreground">
          Airport and route data from{" "}
          <a
            className="underline underline-offset-2"
            href="https://openflights.org/data.html"
          >
            OpenFlights
          </a>
          , used under the Open Database License.
        </p>
      </main>
    </div>
  );
}
