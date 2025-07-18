import { addDataContextChangeListener, getAllItems, getCaseByID, getCaseBySearch, getSelectionList, initializePlugin,
  IResult, sendMessage  } from "@concord-consortium/codap-plugin-api";
import { makeAutoObservable, reaction } from "mobx";
import {
  kDataContextName,
  kInitialDimensions,
  kMapPinsCollectionName,
  kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName, kPinLongAttributeName,
  kPluginName,
  kVersion
} from "../data/constants";
import { createOrUpdateMap, createSelectionList, deleteSelectionList, updateSelectionList } from "../utils/codap-utils";
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

/**
 * Return NaN for invalid values, otherwise return the numeric value.
 *
 * @param value
 * @returns
 */
export function numericValue(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return parseFloat(value);
  }
  return NaN;
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
      this.pins = pinData
        .map((pin: any) => {
          const values = pin.values;
          return {
            color: values[kPinColorAttributeName],
            id: pin.id,
            // Handle missing or invalid
            lat: numericValue(values[kPinLatAttributeName]),
            long: numericValue(values[kPinLongAttributeName])
          };
        })
        .filter((pin: IMapPin) => !isNaN(pin.lat) && !isNaN(pin.long));
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

export async function initializeNeoPlugin() {
  await initializePlugin({ pluginName: kPluginName, version: kVersion, dimensions: kInitialDimensions });

  // Create the pin dataset
  await sendMessage("create", `dataContext`, {
    name: kPinDataContextName,
    collections: [
      {
        name: "Map Pins",
        attrs: [
          { name: kPinLatAttributeName, type: "numeric" },
          { name: kPinLongAttributeName, type: "numeric" },
          { name: kPinColorAttributeName, type: "color" }
        ]
      }
    ]
  });

  // Create map if it doesn't exist
  await createOrUpdateMap("Map");

  // See if there are any existing pins
  pluginState.updatePins();

  // Set up a listener for changes to the pin dataset
  addDataContextChangeListener(kPinDataContextName, notification => {
    const { operation } = notification.values;

    if (["createCases", "deleteCases", "updateCases"].includes(operation)) {
      pluginState.updatePins();
    }
  });
  // Set up a listener for pin selection
  addDataContextChangeListener(kPinDataContextName, async notification => {
    const { operation, result } = notification.values;
    if (operation === "selectCases" && result.success) {
      const selectedPins = await getSelectionList(kPinDataContextName);
      const selectedPinValues: IMapPin[] = await Promise.all(
        selectedPins.values.map(async (pin: any) => {
          const pinItem = await getCaseByID(kPinDataContextName, pin.caseID);
          if (pinItem.success) {
            const pinValues = pinItem.values;
            const pinCase = (pinValues as any).case;
            return {
              id: pinCase.id,
              lat: numericValue(pinCase.values.pinLat),
              long: numericValue(pinCase.values.pinLong),
              color: pinCase.values.pinColor,
            };
          }
          return null;
        })
      );
      pluginState.setSelectedPins(selectedPinValues);
    }
  });

  // Set up a listener for case selection
  addDataContextChangeListener(kDataContextName, async notification => {
    const { operation, result } = notification.values;
    if (operation === "selectCases" && result.success) {
      const selectedCases = await getSelectionList(kDataContextName);
      const selectedPinCases = selectedCases.values
                                .filter((sCase: any) => sCase.collectionName === kMapPinsCollectionName);
      const selectedCaseValues: any[] = await Promise.all(
        selectedPinCases.map(async (sCase: any) => {
          const caseItem = await getCaseByID(kDataContextName, sCase.caseID);
          if (caseItem.success) {
            const caseValues = caseItem.values;
            return {
              id: caseValues.id,
              label: caseValues.case.values.label,
              pinColor: caseValues.case.values.pinColor,
            };
          }
          return null;
        })
      );
      pluginState.setSelectedCases(selectedCaseValues);
    }
  });
}

export const pluginState = new PluginState();
