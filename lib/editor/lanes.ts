export const LANE_LIMITS = { audio: 7, texts: 7, overlays: 7 } as const;
type Timed = { id: string; start: number; end: number; lane?: number };
export function assignLanes(items: Timed[], limit: number) {
  const lanes: Timed[][] = Array.from({ length: limit }, () => []);
  const result = new Map<string, number>();
  const overlaps = (a: Timed, b: Timed) =>
    a.start < b.end - 0.00001 && a.end > b.start + 0.00001;
  const sorted = [...items].sort(
    (a, b) =>
      Number(b.lane != null) - Number(a.lane != null) || a.start - b.start,
  );
  for (const item of sorted) {
    const lane =
      item.lane ??
      lanes.findIndex((row) => !row.some((other) => overlaps(item, other)));
    if (
      !Number.isInteger(lane) ||
      lane < 0 ||
      lane >= limit ||
      lanes[lane].some((other) => overlaps(item, other))
    )
      throw Error(
        `This edit exceeds the ${limit}-track limit or overlaps clips on the same track.`,
      );
    lanes[lane].push(item);
    result.set(item.id, lane);
  }
  return result;
}
