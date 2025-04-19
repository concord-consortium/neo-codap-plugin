import { addDataContextChangeListener, initializePlugin, sendMessage } from "@concord-consortium/codap-plugin-api";
import {
  kInitialDimensions, kMapName, kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName,
  kPinLongAttributeName, kPluginName, kSliderComponentName, kVersion
} from "../data/constants";
import { pluginState } from "../models/plugin-state";

export async function initializeNeoPlugin() {
  initializePlugin({ pluginName: kPluginName, version: kVersion, dimensions: kInitialDimensions });

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

}

export async function createOrUpdateMap(title: string): Promise<void> {
  const existingMap = await sendMessage("get", `component[${kMapName}]`);
  if (!existingMap.success) {
    await sendMessage("create", "component", {
      type: "map",
      name: kMapName,
      title
    });
  } else {
    await sendMessage("update", `component[${kMapName}]`, {
      title
      // When there is geo raster support in CODAP we also need to do something like this:
      // geoRasterUrl: item.url,
      //
    });
  }

  // Note in the current geotiff branch it is necessary to call update after create
  // because the create call ignores the geotiffUrl. Hopefully we can fix this in the updated
  // CODAP implementation.
}

export async function createOrUpdateDateSlider(value: number, lowerBound:number, upperBound:number): Promise<void> {
  const existingGlobal = await sendMessage("get", `global[Date]`);
  if (!existingGlobal.success) {
    await sendMessage("create", "global", {
      name: "Date",
      value,
    });
  } else {
    await sendMessage("update", `global[Date]`, {
      value
    });
  }

  const existingSlider = await sendMessage("get", `component[${kSliderComponentName}]`);
  if (!existingSlider.success) {
    await sendMessage("create", "component", {
      type: "slider",
      title: kSliderComponentName,
      globalValueName: "Date",
      lowerBound,
      upperBound,
      scaleType: "date",
      dateMultipleOfUnit: "month",
      multipleOf: 1,
    });
  } else {
    await sendMessage("update", `component[${kSliderComponentName}]`, {
      lowerBound,
      upperBound,
      // We could reset all slider configuration properties on each update,
      // but that might be frustrating for a user that wants to customize it.
      // scaleType: "date",
      // dateMultipleOfUnit: "month",
      // multipleOf: 1,
    });
  }

}
