import type { Trip } from "@carbonroute/shared";

export type RootStackParamList = {
  Home: undefined;
  LogTrip: undefined;
  Results: { trip: Trip };
  TripDetail: { trip: Trip };
  About: undefined;
  Credits: undefined;
};
