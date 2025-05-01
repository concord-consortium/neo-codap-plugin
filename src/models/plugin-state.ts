import { getAllItems, getCaseBySearch, IResult, sendMessage } from "@concord-consortium/codap-plugin-api";
import { makeAutoObservable, reaction } from "mobx";
import {
  kDataContextName,
  kMapPinsCollectionName,
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


class PluginState {
  neoDataset: NeoDataset | undefined;
  neoDatasetName = "";
  pins: IMapPin[] = [];
  selectedPins: IMapPin[] = [];

  constructor() {
    makeAutoObservable(this);
    //  // Reaction to changes in selectedPins
    reaction(
      () => this.selectedPins, // Observe changes to selectedPins
      (selectedPins) => {
        this.handleSelectedPinsChange(selectedPins);
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

  setSelectedPins(selectedPins: IMapPin[]) {
    this.selectedPins = selectedPins;
  }

  async handleSelectedPinsChange(selectedPins: any[]): Promise<void> {
    for (const pin of selectedPins) {
      const searchQuery = `label == ${pin.values.pinLat.toFixed(2)}, ${pin.values.pinLong.toFixed(2)}`;
      const result = await getCaseBySearch(kDataContextName, kMapPinsCollectionName, searchQuery);

      if (result.success) {
        const selectedPinIds = result.values.map((item: any) => item.id);
        await sendMessage("create", `dataContext[${kDataContextName}].selectionList`, selectedPinIds);
      }
    }
  }
}

export const pluginState = new PluginState();
