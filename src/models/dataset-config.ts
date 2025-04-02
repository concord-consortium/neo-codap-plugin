/**
 * Configuration for a selectable dataset
 */
export interface DatasetConfig {
  /** Unique identifier for the dataset */
  id: string;
  /** Display label shown to users */
  label: string;
  /** Whether this dataset is selected by default */
  defaultSelected?: boolean;
  /** Path to the legend image for the dataset */
  legendImage: string;
}

/**
 * All available datasets with their configurations
 */
export const kDatasets: DatasetConfig[] = [
  {
    id: "GPM_3IMERGM",
    label: "Rainfall",
    defaultSelected: true,
    legendImage: "https://neo.gsfc.nasa.gov/palettes/trmm_rainfall_m.png"
  },
  {
    id: "MOP_CO_M",
    label: "Carbon Monoxide",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/mopitt_co.png"
  },
  {
    id: "AURA_NO2_M",
    label: "Nitrogen Dioxide",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/omi_no2.png"
  },
  {
    id: "MOD_NDVI_M",
    label: "Vegetation Index",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/modis_ndvi.png"
  },
  {
    id: "MOD_LSTD_CLIM_M",
    label: "Land Surface Temperature [day]",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/modis_lst.png"
  },
  {
    id: "MOD14A1_M_FIRE",
    label: "Active Fires",
    legendImage: "https://neo.gsfc.nasa.gov/palettes/modis_fire_l3.png"
  }
];
