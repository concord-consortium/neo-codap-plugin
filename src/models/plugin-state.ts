import { getAllItems, IResult } from "@concord-consortium/codap-plugin-api";
import { makeAutoObservable } from "mobx";
import {
  kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName, kPinLongAttributeName
} from "../data/constants";
import { NeoDataset } from "./neo-types";
import { getMapComponentInfo } from "../utils/codap-utils";
import { geoLocSearch, MapComponentInfo } from "../utils/location-utils";

interface IMapPin {
  color: string;
  id: string;
  lat: number;
  long: number;
  label: string;
}

export function pinLabel(pin: IMapPin) {
  return `${pin.lat.toFixed(2)}, ${pin.long.toFixed(2)}`;
}

class PluginState {
  neoDataset: NeoDataset | undefined;
  neoDatasetName = "";
  pins: IMapPin[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  setNeoDataset(neoDataset: NeoDataset | undefined) {
    this.neoDataset = neoDataset;
    this.neoDatasetName = neoDataset?.label ?? "";
  }

  *updatePins(): Generator<Promise<IResult>, void, IResult> {
    const pinResult = yield(getAllItems(kPinDataContextName));
    const map = yield getMapComponentInfo();
    const mapInfo = map.values as MapComponentInfo;
    const bounds = mapInfo?.bounds ?? {north: 90, south: -90, east: 180,west: -180};
    if (pinResult.success) {
      const pinData = pinResult.values as any;
      const labels: string[] = [];
      for (const pin of pinData) {
        const lat = pin.values[kPinLatAttributeName];
        const long = pin.values[kPinLongAttributeName];
        const locationResult = yield geoLocSearch(lat, long, bounds);
        const label = locationResult.values.location;
        labels.push(label);
      }

      this.pins = pinData.map((pin: any, index: number) => {
        const values = pin.values;
        return {
          color: values[kPinColorAttributeName],
          id: pin.id,
          lat: values[kPinLatAttributeName],
          long: values[kPinLongAttributeName],
          label: labels[index]
        };
      });
    }
  }
}

export const pluginState = new PluginState();
