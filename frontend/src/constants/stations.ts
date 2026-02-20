export const STATIONS = {
  tempest: {
    id: "189439",
    label: "Tempest (Backyard)",
    elevationFt: 4600,
    lat: 40.33307,
    lon: -111.72761,
    heightFt: 18,
    description: "18 ft on pergola",
    color: "#0ea5e9",
  },
  wunderground: {
    id: "KUTLINDO32",
    label: "WU (Garden)",
    elevationFt: 4600,
    lat: 40.33307,
    lon: -111.72761,
    heightFt: 6,
    description: "6 ft in garden",
    color: "#22c55e",
  },
  usu16: {
    id: "16",
    label: "USU Station 16",
    elevationFt: 4745,
    lat: 40.33422,
    lon: -111.70984,
    heightFt: 0,
    description: "FGNET research station",
    color: "#f59e0b",
  },
  usu1302734: {
    id: "1302734",
    label: "USU Station 1302734",
    elevationFt: 5475,
    lat: 40.30134,
    lon: -111.64443,
    heightFt: 0,
    description: "FGNET research station (higher elevation)",
    color: "#a855f7",
  },
} as const;

export type StationKey = keyof typeof STATIONS;

export const HOME = {
  lat: 40.33307,
  lon: -111.72761,
  elevationFt: 4623,
  label: "Home (Lindon, UT)",
  zone: "6b-7a",
};
