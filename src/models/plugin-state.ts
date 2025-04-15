import { getAllItems } from "@concord-consortium/codap-plugin-api";
import { makeAutoObservable } from "mobx";
import {
  kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName, kPinLongAttributeName
} from "../data/constants";
import { NeoDataset } from "./neo-types";

interface IMapPin {
  color: string;
  id: string;
  lat: number;
  long: number;
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

  async updatePins() {
    const pinResult = await getAllItems(kPinDataContextName);
    if (pinResult.success) {
      const pinData = pinResult.values as any;
      this.pins = pinData.map((pin: any) => {
        const values = pin.values;
        return {
          color: values[kPinColorAttributeName],
          id: pin.id,
          lat: values[kPinLatAttributeName],
          long: values[kPinLongAttributeName]
        };
      });
    }
  }
}

export const pluginState = new PluginState();
