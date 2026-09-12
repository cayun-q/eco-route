"""
ECOTOURISM TRIP CARBON CALCULATOR — MVP
---------------------------------------
Keeps the original distance calculator and adds:
- Gasoline and diesel car CO2 per mile
- Hybrid car CO2 per mile
- Battery-EV CO2 per mile using EPA eGRID electricity
- Plane CO2 per passenger using 2026 UK Government factors
- Flight categories and cabin classes
- Total CO2, CO2/person, CO2/hour, and CO2/mile
- A comparison function for the same city pair

Important modeling notes:
- Driving distance is still an estimate: great-circle distance * ROAD_FACTOR.
- Car MPG presets are illustrative; replace them with actual vehicle MPG later.
- Plane factors are official 2026 UK Government average factors, not a
  route-specific aircraft fuel-burn model.
- The 2026 aviation factors exclude the 8% great-circle-distance uplift,
  so this code applies that uplift by default.
- ICAO has a more aircraft/route-specific calculator and API; integrating
  it can be a later upgrade if access is available.
"""

import math
from dataclasses import dataclass
from typing import Optional

EARTH_RADIUS_MILES = 3958.8
MILES_TO_KM = 1.609344
GRAMS_PER_POUND = 453.59237

# MVP estimate only; replace with a routing API later.
ROAD_FACTOR = 1.25

# EPA tailpipe factors.
FUEL_CO2_G_PER_GALLON = {
    "gasoline": 8887.0,
    "diesel": 10180.0,
}

# EPA eGRID 2023 U.S. total CO2 = 767.209 lb/MWh.
US_GRID_CO2_LB_PER_KWH = 767.209 / 1000.0

# EPA Model Year 2025 median EV energy consumption.
DEFAULT_EV_KWH_PER_100_MILES = 39.0

# 2026 UK Government GHG Conversion Factors, direct CO2,
# before the 8% great-circle-distance uplift.
PLANE_CO2_G_PER_PKM = {
    "domestic": {
        "economy": 124.0,
        "premium_economy": 124.0,
        "business": 124.0,
        "first": 124.0,
    },
    "short_haul": {
        "economy": 68.0,
        "premium_economy": 68.0,
        "business": 102.0,
        "first": 102.0,
    },
    "long_haul": {
        "economy": 63.2,
        "premium_economy": 101.1,
        "business": 183.3,
        "first": 252.8,
    },
}

PLANE_DISTANCE_UPLIFT = 1.08

DEFAULT_CAR_AVERAGE_SPEED_MPH = 55.0
DEFAULT_PLANE_SPEED_MPH = 500.0
DEFAULT_PLANE_EXTRA_TIME_HOURS = 0.5

CAR_PRESETS = {
    "gas_economy": {"label": "Gasoline — efficient car", "fuel": "gasoline", "mpg": 35.0},
    "gas_average": {"label": "Gasoline — average car", "fuel": "gasoline", "mpg": 30.0},
    "gas_suv": {"label": "Gasoline — SUV", "fuel": "gasoline", "mpg": 20.0},
    "diesel": {"label": "Diesel car", "fuel": "diesel", "mpg": 30.0},
    "hybrid": {"label": "Hybrid", "fuel": "gasoline", "mpg": 50.0},
    "ev": {"label": "Battery EV", "electric": True, "kwh_per_100_miles": DEFAULT_EV_KWH_PER_100_MILES},
}

@dataclass
class TripResult:
    mode: str
    vehicle: str
    distance_miles: float
    travel_time_hours: float
    total_co2_lb: float
    co2_per_passenger_lb: float
    co2_per_hour_lb: float
    co2_per_mile_lb: float
    passengers: int

    def as_dict(self) -> dict:
        return {
            "mode": self.mode,
            "vehicle": self.vehicle,
            "distance_miles": round(self.distance_miles, 2),
            "travel_time_hours": round(self.travel_time_hours, 2),
            "total_co2_lb": round(self.total_co2_lb, 2),
            "co2_per_passenger_lb": round(self.co2_per_passenger_lb, 2),
            "co2_per_hour_lb": round(self.co2_per_hour_lb, 2),
            "co2_per_mile_lb": round(self.co2_per_mile_lb, 4),
            "passengers": self.passengers,
        }

# Preset city coordinates so your demo works with zero geocoding setup.
# Add any cities your demo route needs — takes 10 seconds to look up a
# lat/long on Google and paste it in.
CITIES = {
    "new_york":      {"lat": 40.7128, "lon": -74.0060},
    "los_angeles":   {"lat": 34.0522, "lon": -118.2437},
    "chicago":       {"lat": 41.8781, "lon": -87.6298},
    "san_francisco": {"lat": 37.7749, "lon": -122.4194},
    "miami":         {"lat": 25.7617, "lon": -80.1918},
    "seattle":       {"lat": 47.6062, "lon": -122.3321},
    "denver":        {"lat": 39.7392, "lon": -104.9903},
    "boston":        {"lat": 42.3601, "lon": -71.0589},
    "austin":        {"lat": 30.2672, "lon": -97.7431},
    "pittsburgh":    {"lat": 40.4406, "lon": -79.9959},
}


def great_circle_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Straight-line ('as the crow flies') distance in miles. Use directly for flight distance."""
    lat1_r, lon1_r, lat2_r, lon2_r = map(math.radians, (lat1, lon1, lat2, lon2))
    d_lat = lat2_r - lat1_r
    d_lon = lon2_r - lon1_r
    a = math.sin(d_lat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(d_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_MILES * c


def road_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Estimated driving distance: straight-line distance x road factor."""
    return great_circle_miles(lat1, lon1, lat2, lon2) * ROAD_FACTOR


def distance_between_cities(city_key_a: str, city_key_b: str, mode: str = "drive") -> float:
    a = CITIES.get(city_key_a)
    b = CITIES.get(city_key_b)
    if a is None or b is None:
        raise ValueError(f"Unknown city key: {city_key_a if a is None else city_key_b}")

    if mode == "fly":
        return great_circle_miles(a["lat"], a["lon"], b["lat"], b["lon"])
    return road_distance_miles(a["lat"], a["lon"], b["lat"], b["lon"])


# ---------- QUICK SANITY CHECK ----------

if __name__ == "__main__":
    print("--- Straight-line vs road-adjusted distance (should be believable) ---")
    pairs = [
        ("new_york", "los_angeles"),
        ("chicago", "miami"),
        ("san_francisco", "seattle"),
    ]
    for a, b in pairs:
        flying = distance_between_cities(a, b, "fly")
        driving = distance_between_cities(a, b, "drive")
        print(f"{a} -> {b}: fly {flying:.0f} mi, drive ~{driving:.0f} mi")


# ---------------------------------------------------------------------------
# CAR EMISSIONS
# ---------------------------------------------------------------------------

def car_co2_lb_per_mile(mpg: float, fuel: str = "gasoline") -> float:
    """Direct CO2 per mile from MPG and EPA grams-CO2-per-gallon factors."""
    if mpg <= 0:
        raise ValueError("MPG must be greater than zero")
    fuel = fuel.lower()
    if fuel not in FUEL_CO2_G_PER_GALLON:
        raise ValueError(f"Unsupported fuel: {fuel}")
    grams_per_mile = FUEL_CO2_G_PER_GALLON[fuel] / mpg
    return grams_per_mile / GRAMS_PER_POUND


def ev_co2_lb_per_mile(
    kwh_per_100_miles: float = DEFAULT_EV_KWH_PER_100_MILES,
    grid_co2_lb_per_kwh: float = US_GRID_CO2_LB_PER_KWH,
) -> float:
    """Grid CO2 per mile for an EV."""
    if kwh_per_100_miles <= 0:
        raise ValueError("EV energy consumption must be greater than zero")
    return (kwh_per_100_miles / 100.0) * grid_co2_lb_per_kwh


def car_trip_emissions(
    distance_miles: float,
    vehicle: str = "gas_average",
    passengers: int = 1,
    travel_time_hours: Optional[float] = None,
) -> TripResult:
    """Calculate total, per-passenger, per-mile and per-hour car emissions."""
    if passengers < 1:
        raise ValueError("Passengers must be at least 1")
    if vehicle not in CAR_PRESETS:
        raise ValueError(f"Unknown vehicle preset: {vehicle}")

    spec = CAR_PRESETS[vehicle]

    if spec.get("electric"):
        lb_per_mile = ev_co2_lb_per_mile(spec["kwh_per_100_miles"])
    else:
        lb_per_mile = car_co2_lb_per_mile(spec["mpg"], spec["fuel"])

    total_lb = distance_miles * lb_per_mile

    if travel_time_hours is None:
        travel_time_hours = distance_miles / DEFAULT_CAR_AVERAGE_SPEED_MPH
    if travel_time_hours <= 0:
        raise ValueError("Travel time must be greater than zero")

    return TripResult(
        mode="drive",
        vehicle=spec["label"],
        distance_miles=distance_miles,
        travel_time_hours=travel_time_hours,
        total_co2_lb=total_lb,
        co2_per_passenger_lb=total_lb / passengers,
        co2_per_hour_lb=total_lb / travel_time_hours,
        co2_per_mile_lb=lb_per_mile,
        passengers=passengers,
    )


# ---------------------------------------------------------------------------
# PLANE EMISSIONS
# ---------------------------------------------------------------------------

def classify_flight(distance_miles: float) -> str:
    """
    MVP distance classification for a U.S.-focused app:
      < 1,000 miles: domestic/regional proxy
      1,000–2,300 miles: short-haul proxy
      > 2,300 miles: long-haul proxy

    The 2026 UK methodology uses geography as well as distance for its
    preferred short-/long-haul classification, so these are application
    thresholds, not a claim that all countries use these definitions.
    """
    km = distance_miles * MILES_TO_KM
    if km < 1000:
        return "domestic"
    if km < 3700:
        return "short_haul"
    return "long_haul"


def plane_co2_lb_per_passenger(
    distance_miles: float,
    flight_type: Optional[str] = None,
    cabin_class: str = "economy",
    apply_distance_uplift: bool = True,
) -> float:
    """Direct CO2 per passenger from the 2026 government gCO2/pkm factors."""
    if distance_miles < 0:
        raise ValueError("Distance cannot be negative")

    if flight_type is None:
        flight_type = classify_flight(distance_miles)

    cabin_class = cabin_class.lower()

    if flight_type not in PLANE_CO2_G_PER_PKM:
        raise ValueError(f"Unknown flight type: {flight_type}")
    if cabin_class not in PLANE_CO2_G_PER_PKM[flight_type]:
        raise ValueError(f"Unknown cabin class: {cabin_class}")

    factor = PLANE_CO2_G_PER_PKM[flight_type][cabin_class]
    if apply_distance_uplift:
        factor *= PLANE_DISTANCE_UPLIFT

    km = distance_miles * MILES_TO_KM
    grams = km * factor
    return grams / GRAMS_PER_POUND


def plane_trip_emissions(
    distance_miles: float,
    passengers: int = 1,
    flight_type: Optional[str] = None,
    cabin_class: str = "economy",
    travel_time_hours: Optional[float] = None,
) -> TripResult:
    """Calculate total, per-passenger, per-mile and per-hour plane CO2."""
    if passengers < 1:
        raise ValueError("Passengers must be at least 1")

    if flight_type is None:
        flight_type = classify_flight(distance_miles)

    lb_per_passenger = plane_co2_lb_per_passenger(
        distance_miles, flight_type, cabin_class
    )
    total_lb = lb_per_passenger * passengers

    if travel_time_hours is None:
        travel_time_hours = (
            distance_miles / DEFAULT_PLANE_SPEED_MPH
            + DEFAULT_PLANE_EXTRA_TIME_HOURS
        )
    if travel_time_hours <= 0:
        raise ValueError("Travel time must be greater than zero")

    return TripResult(
        mode="fly",
        vehicle=f"Plane — {flight_type.replace('_', ' ').title()} — {cabin_class.title()}",
        distance_miles=distance_miles,
        travel_time_hours=travel_time_hours,
        total_co2_lb=total_lb,
        co2_per_passenger_lb=lb_per_passenger,
        co2_per_hour_lb=total_lb / travel_time_hours,
        co2_per_mile_lb=lb_per_passenger / distance_miles if distance_miles else 0,
        passengers=passengers,
    )


# ---------------------------------------------------------------------------
# TRIP COMPARISON
# ---------------------------------------------------------------------------

def compare_trip(
    city_key_a: str,
    city_key_b: str,
    passengers: int = 1,
    car_vehicles: Optional[list[str]] = None,
    cabin_class: str = "economy",
) -> list[TripResult]:
    """Compare car presets and a plane, sorted by CO2 per passenger."""
    if car_vehicles is None:
        car_vehicles = [
            "gas_economy",
            "gas_average",
            "gas_suv",
            "diesel",
            "hybrid",
            "ev",
        ]

    drive_distance = distance_between_cities(city_key_a, city_key_b, "drive")
    flight_distance = distance_between_cities(city_key_a, city_key_b, "fly")

    results = [
        car_trip_emissions(drive_distance, vehicle, passengers)
        for vehicle in car_vehicles
    ]

    results.append(
        plane_trip_emissions(
            flight_distance,
            passengers=passengers,
            cabin_class=cabin_class,
        )
    )

    return sorted(results, key=lambda r: r.co2_per_passenger_lb)


# ---------------------------------------------------------------------------
# QUICK DEMO
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    origin = "pittsburgh"
    destination = "new_york"
    passengers = 2

    drive_miles = distance_between_cities(origin, destination, "drive")
    flight_miles = distance_between_cities(origin, destination, "fly")

    print("=" * 72)
    print("ECOTOURISM CARBON COMPARISON")
    print("=" * 72)
    print(f"Trip: {origin} -> {destination}")
    print(f"Passengers: {passengers}")
    print(f"Estimated driving distance: {drive_miles:.1f} miles")
    print(f"Great-circle flight distance: {flight_miles:.1f} miles")
    print()

    for result in compare_trip(origin, destination, passengers=passengers):
        print(
            f"{result.vehicle:52} "
            f"{result.co2_per_passenger_lb:7.1f} lb/person | "
            f"{result.co2_per_hour_lb:7.1f} lb/hour"
        )

    print()
    print("Core equations:")
    print("Car:   lb/mile = (fuel g CO2/gallon / MPG) / 453.59237")
    print("EV:    lb/mile = (kWh/100 miles / 100) * grid lb CO2/kWh")
    print("Plane: lb/person = (miles * 1.609344 * gCO2/pkm * 1.08) / 453.59237")
    print("Any:   lb/hour = total trip lb CO2 / travel time hours")
