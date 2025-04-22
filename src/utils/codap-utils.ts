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

export async function createOrUpdateMap(title: string, url?: string): Promise<void> {
  const mapProps: Record<string, any> = {
    title
  };
  if (url) {
    mapProps.geoRaster = {
      type: "png",
      url
    };
  }

  const existingMap = await sendMessage("get", `component[${kMapName}]`);
  if (!existingMap.success) {
    await sendMessage("create", "component", {
      type: "map",
      name: kMapName,
      ...mapProps
    });
  } else {
    await sendMessage("update", `component[${kMapName}]`, mapProps);
  }
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
      animationRate: 4, // 4 frames per second this is about as fast a the full world map can handle
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
