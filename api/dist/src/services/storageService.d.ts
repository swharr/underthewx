import type { WeatherLatestEntity, WeatherReadingEntity, PlantingConfigEntity } from "../models/tableEntities";
export declare function ensureTables(): Promise<void>;
export declare function upsertLatest(entity: Omit<WeatherLatestEntity, "partitionKey" | "rowKey">): Promise<void>;
export declare function getLatest(): Promise<WeatherLatestEntity | null>;
export declare function insertReading(entity: WeatherReadingEntity): Promise<void>;
export type ReadingResolution = "10min" | "hourly" | "daily";
export declare function queryReadings(resolution: ReadingResolution, hours: number): Promise<WeatherReadingEntity[]>;
export declare function getPlantingConfig(rowKey: string): Promise<PlantingConfigEntity | null>;
export declare function upsertPlantingConfig(rowKey: string, value: unknown): Promise<void>;
//# sourceMappingURL=storageService.d.ts.map