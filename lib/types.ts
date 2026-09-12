export type Airport = {
  id: number;
  name: string;
  city: string;
  country: string;
  iata: string | null;
  icao: string | null;
  latitude: number;
  longitude: number;
};

export type AirportMatch = Airport & { label: string };

export type DistanceResult =
  | {
      status: "ok";
      from: AirportMatch;
      to: AirportMatch;
      connected: true;
      km: number;
      miles: number;
      airlineCount: number;
      stops: number;
    }
  | {
      status: "ok";
      from: AirportMatch;
      to: AirportMatch;
      connected: false;
      km: null;
      miles: null;
      airlineCount: 0;
      stops: null;
    }
  | {
      status: "unknown";
      query: string;
      which: "from" | "to";
    }
  | {
      status: "same-airport";
      airport: AirportMatch;
    };
