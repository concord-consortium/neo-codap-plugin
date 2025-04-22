import { addDataContextChangeListener, initializePlugin, sendMessage } from "@concord-consortium/codap-plugin-api";
import {
  kInitialDimensions, kMapName, kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName,
  kPinLongAttributeName, kPluginName, kVersion
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
  const existingMap = await sendMessage("get", `component[${kMapName}]`);
  if (!existingMap.success) {
    await sendMessage("create", "component", {
      type: "map",
      name: kMapName,
      title: "Map"
    });
  }

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

interface IGraphValues {
  xAttrName: string;
  yAttrName: string;
  legendAttrName: string;
}

export const createGraph = async (dataContext: string, name: string, graphValues: IGraphValues) => {
  console.log("Creating graph", dataContext, name, graphValues);
  const graph = await sendMessage("create", "component", {
    type: "graph",
    dataContext,
    name,
    xAttributeName: graphValues.xAttrName,
    xAttributeType: "date",
    yAttributeName: graphValues.yAttrName,
    yAttributeType: "numeric",
    legendAttributeName: graphValues.legendAttrName
  });
  return graph;
};
