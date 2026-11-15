import type { ExperimentConfig, Target } from "@/lib/schemas";

export type Preset = { key: string; name: string; url: string };

export const PRESETS: Preset[] = [
  { key: "jsonplaceholder", name: "JSONPlaceholder", url: "https://jsonplaceholder.typicode.com/posts/1" },
  { key: "dummyjson", name: "DummyJSON", url: "https://dummyjson.com/posts/1" },
  { key: "pokeapi", name: "PokeAPI", url: "https://pokeapi.co/api/v2/pokemon/ditto" },
  { key: "restcountries", name: "REST Countries", url: "https://restcountries.com/v3.1/name/colombia" },
  {
    key: "open-meteo",
    name: "Open-Meteo (Bogotá)",
    url: "https://api.open-meteo.com/v1/forecast?latitude=4.71&longitude=-74.07&current=temperature_2m",
  },
];

export const CUSTOM_PRESET_KEY = "custom";

export function presetKeyForUrl(url: string): string {
  return PRESETS.find((p) => p.url === url)?.key ?? CUSTOM_PRESET_KEY;
}

export const DEFAULT_TARGETS: [Target, Target] = [
  { id: "A", name: PRESETS[0].name, url: PRESETS[0].url },
  { id: "B", name: PRESETS[1].name, url: PRESETS[1].url },
];

export const DEFAULT_CONFIG: ExperimentConfig = {
  phase: "piloto",
  targets: DEFAULT_TARGETS,
  samplesPerTarget: 30,
  warmup: 3,
  delayMs: 100,
  timeoutMs: 5000,
  slaMs: 300,
  order: "intercalado",
  network: "",
};
