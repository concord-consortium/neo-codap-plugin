/**
 * Represents the available dataset types that can be selected
 */
export type DatasetType =
  | "rainfall"
  | "carbonMonoxide"
  | "nitrogenDioxide"
  | "vegetationIndex"
  | "landSurfaceTemperature"
  | "activeFires";

/**
 * Configuration for a selectable dataset
 */
export interface DatasetConfig {
  /** Unique identifier for the dataset */
  id: DatasetType;
  /** Display label shown to users */
  label: string;
  /** Whether this dataset is selected by default */
  defaultSelected?: boolean;
  /** Description of the dataset */
  description?: string;
}

/**
 * All available datasets with their configurations
 */
export const kDatasets: DatasetConfig[] = [
  {
    id: "rainfall",
    label: "Rainfall",
    defaultSelected: true,
    description: "Global precipitation data from NASA satellites"
  },
  {
    id: "carbonMonoxide",
    label: "Carbon Monoxide",
    description: "Atmospheric carbon monoxide concentrations"
  },
  {
    id: "nitrogenDioxide",
    label: "Nitrogen Dioxide",
    description: "Atmospheric nitrogen dioxide levels"
  },
  {
    id: "vegetationIndex",
    label: "Vegetation Index",
    description: "Normalized difference vegetation index (NDVI)"
  },
  {
    id: "landSurfaceTemperature",
    label: "Land Surface Temperature [day]",
    description: "Daytime land surface temperature measurements"
  },
  {
    id: "activeFires",
    label: "Active Fires",
    description: "Currently active fire detections"
  }
];
