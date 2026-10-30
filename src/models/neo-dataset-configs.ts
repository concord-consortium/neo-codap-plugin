// Legend images were originally hosted at https://neo.gsfc.nasa.gov/palettes/
// which is no longer available, so copies from the Wayback Machine are bundled.
// `new URL(..., import.meta.url)` is used instead of importing the PNGs so the
// scripts in `scripts/`, which load this module with tsx, don't need an image loader.
import { NeoDatasetConfig } from "./neo-types";

const trmmRainfallMLegend = new URL("../assets/legends/trmm_rainfall_m.png", import.meta.url).href;
const mopittCoLegend = new URL("../assets/legends/mopitt_co.png", import.meta.url).href;
const omiNo2Legend = new URL("../assets/legends/omi_no2.png", import.meta.url).href;
const modisNdviLegend = new URL("../assets/legends/modis_ndvi.png", import.meta.url).href;
const modisLstLegend = new URL("../assets/legends/modis_lst.png", import.meta.url).href;
const modisFireL3Legend = new URL("../assets/legends/modis_fire_l3.png", import.meta.url).href;

/**
 * The NEO dataset configs that we support
 */
export const kNeoDatasetConfigs: NeoDatasetConfig[] = [
  {
    id: "GPM_3IMERGM",
    label: "Rainfall",
    legendImage: trmmRainfallMLegend,
    paletteToValue: (index: number) => {
      // Convert palette index to mm/hr
      // The values are outside of the range
      if (index < 0 || index > 255) {
        return null;
      }
      if (index === 0) {
        // Palette index 0 doesn't fit on the curve it seems to be hardcode to
        // a value of 1
        return 1;
      }
      if (index === 255) {
        // These pixels match up with a value 99999 in the CSV version of the
        // data. I think this means there is no data. For now we return null
        // which shows up as an empty cell in the CODAP table.
        return null;
      }
      return 0.970333137394295 * Math.E ** (0.030162080993408915*index);
    }
  },
  {
    id: "MOP_CO_M",
    label: "Carbon Monoxide",
    legendImage: mopittCoLegend,
    paletteToValue: (index: number) => {
      // Convert palette index to ppbv
      // The values are outside of the range, or they are 255 which seems
      // to indicate no data
      if (index < 0 || index >= 255) {
        return null;
      }
      return index/254 * 300;
    }
  },
  {
    id: "AURA_NO2_M",
    label: "Nitrogen Dioxide",
    legendImage: omiNo2Legend,
    paletteToValue: (index: number) => {
      // Convert palette index to billon molecules/mm^2
      // The values are outside of the range, or they are 255 which seems
      // to indicate no data
      if (index < 0 || index >= 255) {
        return null;
      }
      return index/254 * 1500.2;
    }
  },
  {
    id: "MOD_NDVI_M",
    label: "Vegetation Index",
    legendImage: modisNdviLegend,
    paletteToValue: (index: number) => {
      // Convert palette index to some unit-less value of vegetation index
      // The values are outside of the range, or they are 255 which seems
      // to indicate no data
      if (index < 0 || index >= 255) {
        return null;
      }
      return index/254 - 0.1;
    }
  },
  {
    id: "MOD_LSTD_M",
    label: "Land Surface Temperature (day)",
    legendImage: modisLstLegend,
    paletteToValue: (index: number) => {
      // Convert palette index to degC
      // The values are outside of the range, or they are 255 which seems
      // to indicate no data
      if (index < 0 || index >= 255) {
        return null;
      }
      return index/254 * 70 - 25;
    }
  },
  {
    id: "MOD14A1_M_FIRE",
    label: "Active Fires",
    legendImage: modisFireL3Legend,
    paletteToValue: (index: number) => {
      // Convert palette index to fire pixels / 1000 km^2 / day

      // Outside of the range just return null
      if (index < 0 || index > 255) {
        return null;
      }

      if (index === 0 || index === 255) {
        // Palette index 0 actually fits the curve and has a value of 0.1.
        // However its color is black (0, 0, 0), which is the same color used for palette index 255.
        // Since we don't have access to the actual palette index at runtime, we have to lookup
        // the palette index from the color. So if we find black we don't know if it is palette index
        // 0 or 255. Currently there are more pixels with index 255 than 0. So for now we'll
        // just treat palette index 0 and 255 the same and return null.
        return null;
      }

      return 0.09998920216570711 * Math.E ** (0.022456632453790572 * index);
    }
  }
];
