import { addDataContextChangeListener, initializePlugin, sendMessage } from "@concord-consortium/codap-plugin-api";
import {
  kInitialDimensions, kMapName, kOneMonthInSeconds, kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName,
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
interface IGraphValues {
  xAttrName?: string;
  yAttrName?: string;
  legendAttrName?: string;
  showConnectingLines?: boolean;
}

export const createGraph = async (dataContext: string, name: string, graphValues: IGraphValues) => {
  const graph = await sendMessage("create", "component", {
    type: "graph",
    dataContext,
    name,
    xAttributeName: graphValues.xAttrName,
    yAttributeName: graphValues.yAttrName,
    legendAttributeName: graphValues.legendAttrName,
  });
  return graph;
};

export const addConnectingLinesToGraph = async (dataContext: string, name: string, graphValues: IGraphValues) => {
  const graph = await sendMessage("update", `component[${name}]`, {
    type: "graph",
    showConnectingLines: graphValues.showConnectingLines,
  });
  return graph;
};

export const deleteExistingGraphs = async () => {
  const existingComponents = await sendMessage("get", "componentList");
  const existingGraphs = existingComponents.values
                                .filter((comp: any) => comp.type === "graph");
  if (existingGraphs.length > 0) {
    existingGraphs.forEach(async (eGraph: any) => {
      await sendMessage("delete", `component[${eGraph.id}]`);
    });
  }
};

export const addRegionOfInterestToGraphs = async (dataContext: string, name: string, position: number | string) => {
  const roiXYGraph = await sendMessage("create", `component[${name} Plot].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  const roiCategoryChartGraph = await sendMessage("create", `component[${name} Chart].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  return {roiXYGraph, roiCategoryChartGraph};
};

export const updateGraphRegionOfInterest = async (dataContext: string, name: string, position: number | string) => {
  const roiXYGraph = await sendMessage("update", `component[${name} Plot].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  const roiCategoryChartGraph = await sendMessage("update", `component[${name} Chart].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  return {roiXYGraph, roiCategoryChartGraph};
};
