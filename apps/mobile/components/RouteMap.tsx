import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import type { EstimatedLeg, Place } from "@carbonroute/shared";
import { colors, modeColor } from "@/lib/theme";

type Point = { lat: number; lng: number };

function bounds(points: Point[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max(0.35, (maxLat - minLat) * 0.18);
  const lngPad = Math.max(0.35, (maxLng - minLng) * 0.18);
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function project(p: Point, box: ReturnType<typeof bounds>, w: number, h: number) {
  const x = ((p.lng - box.minLng) / (box.maxLng - box.minLng)) * w;
  const y = (1 - (p.lat - box.minLat) / (box.maxLat - box.minLat)) * h;
  return { x, y };
}

export function RouteMap({
  legs,
  height = 280,
}: {
  legs: Pick<EstimatedLeg, "mode" | "polyline" | "origin" | "destination" | "seq">[];
  height?: number;
}) {
  const complete = legs.filter((leg) => leg.origin && leg.destination && leg.polyline?.length > 1);
  if (complete.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyTitle}>Map’s warming up</Text>
        <Text style={styles.emptyCopy}>Drop in both ends and we’ll sketch the hop.</Text>
      </View>
    );
  }

  const points = complete.flatMap((leg) => leg.polyline);
  const box = bounds(points);
  const width = 640;
  const svgH = height;

  const stops: Place[] = [];
  for (const leg of complete) {
    if (!stops.find((s) => s.label === leg.origin.label)) stops.push(leg.origin);
    if (!stops.find((s) => s.label === leg.destination.label)) stops.push(leg.destination);
  }

  return (
    <View style={[styles.frame, { height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${svgH}`}>
        <Rect x={0} y={0} width={width} height={svgH} fill={colors.surfaceMuted} />
        {Array.from({ length: 8 }).map((_, i) => (
          <Line
            key={`h-${i}`}
            x1={0}
            x2={width}
            y1={(svgH / 8) * i}
            y2={(svgH / 8) * i}
            stroke={colors.line}
            strokeWidth={0.6}
          />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <Line
            key={`v-${i}`}
            y1={0}
            y2={svgH}
            x1={(width / 10) * i}
            x2={(width / 10) * i}
            stroke={colors.line}
            strokeWidth={0.6}
          />
        ))}
        {complete.map((leg) => {
          const pts = leg.polyline
            .map((p) => project(p, box, width, svgH))
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          return (
            <Polyline
              key={leg.seq}
              points={pts}
              fill="none"
              stroke={modeColor[leg.mode]}
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
        {complete.map((leg) => {
          const start = project(leg.origin, box, width, svgH);
          const end = project(leg.destination, box, width, svgH);
          return [
            <Circle
              key={`s-${leg.seq}`}
              cx={start.x}
              cy={start.y}
              r={6}
              fill={modeColor[leg.mode]}
              stroke={colors.ink}
              strokeWidth={1.4}
            />,
            <Circle
              key={`e-${leg.seq}`}
              cx={end.x}
              cy={end.y}
              r={6}
              fill={modeColor[leg.mode]}
              stroke={colors.ink}
              strokeWidth={1.4}
            />,
          ];
        })}
        {stops.map((stop) => {
          const p = project(stop, box, width, svgH);
          return (
            <SvgText
              key={stop.id}
              x={p.x + 8}
              y={p.y - 8}
              fill={colors.ink}
              fontSize="11"
              fontFamily="SpaceMono"
            >
              {stop.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  empty: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.surfaceMuted,
  },
  emptyTitle: {
    fontFamily: "SpaceMono",
    color: colors.ink,
    fontSize: 13,
    marginBottom: 6,
  },
  emptyCopy: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 14,
    maxWidth: 320,
  },
});
