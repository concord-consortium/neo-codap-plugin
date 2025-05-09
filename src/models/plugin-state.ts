import { getAllItems, getCaseBySearch, IResult } from "@concord-consortium/codap-plugin-api";
import { makeAutoObservable, reaction } from "mobx";
import {
  kDataContextName,
  kMapPinsCollectionName,
  kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName, kPinLongAttributeName
} from "../data/constants";
import { createSelectionList, deleteSelectionList, updateSelectionList } from "../utils/codap-utils";
import { NeoDataset } from "./neo-types";

export interface IMapPin {
  color: string;
  id: string;
  lat: number;
  long: number;
}

export interface ILocationCase {
  label: string;
  pinColor: string;
}

export function pinLabel(pin: IMapPin) {
  return `${pin.lat.toFixed(2)}, ${pin.long.toFixed(2)}`;
}


class PluginState {
  neoDataset: NeoDataset | undefined;
  neoDatasetName = "";
  pins: IMapPin[] = [];
  selectedPins: IMapPin[] = [];
  selectedCases: any[] =[];

  constructor() {
    makeAutoObservable(this);
    // Reaction to changes in selectedPins from MapPinDataContext
    reaction(
      () => this.selectedPins,
      (selectedPins) => {
        this.handleSelectionChange(
          selectedPins,
          kDataContextName,
          kMapPinsCollectionName,
          (pin) => `label == ${pinLabel(pin)}`
        );
      }
    );
    // Reaction to changes in selectedCases NEOPluginDataContext
    reaction(
      () => this.selectedCases,
      (selectedCases) => {
        this.handleSelectionChange(
          selectedCases,
          kPinDataContextName,
          kMapPinsCollectionName,
          (sCase) => `pinColor == ${sCase.pinColor}`
        );
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

  setSelectedCases(selectedCases: any[]) {
    this.selectedCases = selectedCases;
  }

  async handleSelectionChange<T>(
    selectedItems: T[], dataContextName: string, collectionName: string, searchQueryFn: (item: T) => string
  ): Promise<void> {
    if (selectedItems.length === 0) {
      deleteSelectionList(dataContextName);
      return;
    }

    for (const item of selectedItems) {
      const searchQuery = searchQueryFn(item);
      const result = await getCaseBySearch(dataContextName, collectionName, searchQuery);

      if (result.success) {
        const selectedItemIds = result.values.map((val: any) => val.id);
        if (selectedItems.length === 1) {
          createSelectionList(dataContextName, selectedItemIds);
          return;
        } else {
          const updateSelection = await updateSelectionList(dataContextName, selectedItemIds);
          if (!updateSelection.success) {
            createSelectionList(dataContextName, selectedItemIds);
          }
        }
      }
    }
  }
}

export const pluginState = new PluginState();
