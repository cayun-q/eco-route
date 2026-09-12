"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AirportField } from "@/components/airport-field";
import { checkDistanceAction } from "@/app/actions";
import { cn } from "@/lib/utils";

function formatDistance(km: number, miles: number) {
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km · ${miles.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi`;
}

export function DistanceChecker() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, formAction, pending] = useActionState(checkDistanceAction, null);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Flight distance</CardTitle>
        <CardDescription>
          Enter two airports. If OpenFlights lists a connecting flight, you get
          the great-circle distance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" action={formAction}>
          <div className="grid gap-4 sm:grid-cols-2">
            <AirportField
              label="From"
              name="from"
              value={from}
              onChange={setFrom}
              placeholder="SFO or San Francisco"
            />
            <AirportField
              label="To"
              name="to"
              value={to}
              onChange={setTo}
              placeholder="JFK or New York"
            />
          </div>
          <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants(), "sm:w-auto")}
            >
              {pending ? "Checking flights…" : "Check distance"}
            </button>
            <p className="text-xs text-muted-foreground">
              Uses IATA/ICAO codes or airport names.
            </p>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {!result && !pending ? (
            <p className="text-sm text-muted-foreground">
              No search yet. Try SFO to JFK, or two airports you fly between.
            </p>
          ) : null}

          {result?.status === "error" ? (
            <Alert variant="destructive">
              <AlertTitle>Could not check that pair</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          ) : null}

          {result?.status === "unknown" ? (
            <Alert variant="destructive">
              <AlertTitle>Airport not found</AlertTitle>
              <AlertDescription>
                No OpenFlights match for “{result.query}” as the{" "}
                {result.which === "from" ? "departure" : "arrival"} airport.
                Try an IATA code like LAX.
              </AlertDescription>
            </Alert>
          ) : null}

          {result?.status === "same-airport" ? (
            <Alert>
              <AlertTitle>Same airport</AlertTitle>
              <AlertDescription>
                {result.airport.label} cannot have a connecting flight to
                itself.
              </AlertDescription>
            </Alert>
          ) : null}

          {result?.status === "ok" && result.connected ? (
            <Alert>
              <AlertTitle>Connecting flight found</AlertTitle>
              <AlertDescription>
                <p className="text-foreground">
                  {result.from.label}
                  <span className="mx-1 text-muted-foreground">→</span>
                  {result.to.label}
                </p>
                <p className="mt-2 text-lg font-medium text-foreground">
                  {formatDistance(result.km, result.miles)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {result.airlineCount} listed route
                    {result.airlineCount === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">
                    {result.stops === 0
                      ? "Direct (0 stops)"
                      : `${result.stops} stop${result.stops === 1 ? "" : "s"}`}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {result?.status === "ok" && !result.connected ? (
            <Alert>
              <AlertTitle>No connecting flight</AlertTitle>
              <AlertDescription>
                OpenFlights has both airports, but no published route from{" "}
                {result.from.iata ?? result.from.icao} to{" "}
                {result.to.iata ?? result.to.icao}. Distance is shown only when
                a connecting flight exists.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
