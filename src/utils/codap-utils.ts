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
  xAttrName?: string;
  yAttrName?: string;
  legendAttrName?: string;
}

export const createGraph = async (dataContext: string, name: string, graphValues: IGraphValues) => {
  const existingComponents = await sendMessage("get", "componentList");
  const existingGraphs = existingComponents.values
                                .filter((comp: any) => comp.type === "graph");
  if (existingGraphs.length > 0) {
    existingGraphs.forEach(async (eGraph: any) => {
      await sendMessage("delete", `component[${eGraph.id}]`);
    });
  }
  const graph = await sendMessage("create", "component", {
    type: "graph",
    dataContext,
    name,
    xAttributeName: graphValues.xAttrName,
    yAttributeName: graphValues.yAttrName,
    legendAttributeName: graphValues.legendAttrName
  });
  return graph;
};
