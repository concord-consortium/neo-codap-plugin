import { getAllItems, IResult } from "@concord-consortium/codap-plugin-api";
import { makeAutoObservable, reaction } from "mobx";
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

export function pinLabel(pin: IMapPin) {
  return `${pin.lat.toFixed(2)}, ${pin.long.toFixed(2)}`;
}

import { DataManager } from "./data-manager"; // Adjust the path as needed

class PluginState {
  neoDataset: NeoDataset | undefined;
  neoDatasetName = "";
  pins: IMapPin[] = [];
  selectedPins: IMapPin[] = [];

  constructor() {
    makeAutoObservable(this);
     // Reaction to changes in selectedPins
    reaction(
      () => this.selectedPins, // Observe changes to selectedPins
      (selectedPins) => {
        const dataManager = new DataManager();
        dataManager.handleSelectedPinsChange(selectedPins);
      }
    );
  }

  setNeoDataset(neoDataset: NeoDataset | undefined) {
    this.neoDataset = neoDataset;
    this.neoDatasetName = neoDataset?.label ?? "";
  }

  *updatePins(): Generator<Promise<IResult>, void, IResult> {
    const pinResult = yield(getAllItems(kPinDataContextName));
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
