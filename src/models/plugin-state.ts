import { getAllItems, getCaseBySearch, IResult, sendMessage } from "@concord-consortium/codap-plugin-api";
import { makeAutoObservable, reaction } from "mobx";
import {
  kDataContextName,
  kMapPinsCollectionName,
  kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName, kPinLongAttributeName
} from "../data/constants";
import { NeoDataset } from "./neo-types";

export interface IMapPin {
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
  selectedCases: any[] =[];

  constructor() {
    makeAutoObservable(this);
    //  // Reaction to changes in selectedPins
    reaction(
      () => this.selectedPins, // Observe changes to selectedPins
      (selectedPins) => {
        this.handleSelectedPinsChange(selectedPins);
      }
    );
    reaction(
      () => this.selectedCases, // Observe changes to selectedCases
      (selectedCases) => {
        this.handleSelectedCasesChange(selectedCases);
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

  async handleSelectedPinsChange(selectedPins: IMapPin[]): Promise<void> {
    console.log("Selected pins changed:", selectedPins);
    if (selectedPins.length === 0) {
      console.log("No selected pins");
      await sendMessage("create", `dataContext[${kDataContextName}].selectionList`, []);
      return;
    }
    for (const pin of selectedPins) {
      console.log("Selected pin:", pin);
      const searchQuery = `label == ${pinLabel(pin)}`;
      console.log("Search query:", searchQuery);
      const result = await getCaseBySearch(kDataContextName, kMapPinsCollectionName, searchQuery);

      if (result.success) {
        const selectedPinIds = result.values.map((item: any) => item.id);
        const updatePinSelection =
                await sendMessage("update", `dataContext[${kDataContextName}].selectionList`, selectedPinIds);
        if (!updatePinSelection.success) {
          console.log("No selection list found. Need to create one.");
          const createSelectionList =
                  await sendMessage("create", `dataContext[${kDataContextName}].selectionList`, selectedPinIds);
          console.log("Selection list created:", createSelectionList);
        }
      }
    }
  }

  async handleSelectedCasesChange(selectedCases: any[]): Promise<void> {
    console.log("Selected cases changed:", selectedCases);
    if (selectedCases.length === 0) {
      console.log("No selected cases");
      await sendMessage("create", `dataContext[${kPinDataContextName}].selectionList`, []);
      return;
    }
    for (const sCase of selectedCases) {
      console.log("Selected case:", sCase);
      const searchQuery = `pinColor == ${sCase.pinColor}`;
      console.log("Search query:", searchQuery);
      const result = await getCaseBySearch(kPinDataContextName, kMapPinsCollectionName, searchQuery);

      if (result.success) {
        const selectedCaseIds = result.values.map((item: any) => item.id);
        const updatePinSelection =
                await sendMessage("update", `dataContext[${kPinDataContextName}].selectionList`, selectedCaseIds);
        if (!updatePinSelection.success) {
          console.log("No selection list found. Need to create one.");
          const createSelectionList =
                  await sendMessage("create", `dataContext[${kPinDataContextName}].selectionList`, selectedCaseIds);
          console.log("Selection list created:", createSelectionList);
        }
      }
    }
  }
}

export const pluginState = new PluginState();
