import { addDataContextChangeListener, codapInterface, getCaseByID, initializePlugin, sendMessage }
  from "@concord-consortium/codap-plugin-api";
// import {
//   kPinDataContextName, kPinLatAttributeName, kPinLongAttributeName, kPinColorAttributeName,
//   kPluginName, kInitialDimensions, kVersion,
//   kDataContextName, kMapPinsCollectionName, kOneMonthInSeconds,
//   kMapName, kSliderComponentName, kChartGraphName, kXYGraphName,
// } from "../data/constants";
import { kPluginName, kInitialDimensions, kVersion, kOneMonthInSeconds, kMapName,
  kMapPinsCollectionName, kPinColorAttributeName, kPinDataContextName, kPinLatAttributeName, kPinLongAttributeName,
  kDataContextName, kSliderComponentName, kChartGraphName, kXYGraphName } from "../data/constants";
import { IMapPin, pluginState } from "../models/plugin-state";


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
  // Set up a listener for pin selection
  addDataContextChangeListener(kPinDataContextName, async notification => {
    const { operation, result } = notification.values;
    if (operation === "selectCases" && result.success) {
      // const selectedPins = result.cases;
      console.log("result.cases", result.cases);
      const selectedPins = await getSelectionList(kPinDataContextName);
      console.log("selectedPins", selectedPins);
      const selectedPinValues: IMapPin[] = await Promise.all(
        selectedPins.map(async (pin: any) => {
          const pinItem = await getCaseByID(kPinDataContextName, pin.caseID);
          if (pinItem.success) {
            const pinValues = pinItem.values;
            const pinCase = (pinValues as any).case;
            return {
              id: pinCase.id,
              lat: pinCase.values.pinLat,
              long: pinCase.values.pinLong,
              color: pinCase.values.pinColor,
            };
          }
          return null;
        })
      );
      // const selectedPinValues: IMapPin[] = [];
      // selectedPins.forEach(async (pin: any) => {
      //   console.log("pin", pin);
      //   const pinItem = await getCaseByID(kPinDataContextName, pin.caseID);
      //   console.log("pinItem", pinItem);
      //   if (pinItem.success) {
      //     const pinValues = pinItem.values;
      //     console.log("pinValues", pinValues);
      //     selectedPinValues.push({
      //       id: pinValues.id,
      //       lat: pinValues[kPinLatAttributeName],
      //       long: pinValues[kPinLongAttributeName],
      //       color: pinValues[kPinColorAttributeName]
      //     }
      //     );
      //   }
      // });
      console.log("selectedPinValues", selectedPinValues);
      pluginState.setSelectedPins(selectedPinValues);
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
  name: string;
  title?: string;
  xAttrName?: string;
  yAttrName?: string;
  legendAttrName?: string;
  showConnectingLines?: boolean;
}

export const createOrUpdateGraphs = async (dataContext: string, graphValues: IGraphValues[]) => {
  const existingComponents = await sendMessage("get", "componentList");
  const existingGraphs = existingComponents.values.filter((comp: any) => comp.type === "graph");

  if (existingGraphs.length > 0) {
    existingGraphs.forEach(async (eGraph: any, idx: number) => {
    // Update the existing graph
      const updatedGraph =
              await sendMessage("update", `component[${eGraph.id}]`, {
                type: "graph",
                dataContext,
                title: graphValues[idx].title,
                rescaleAxes: true,
              });
      return updatedGraph;
    });
  } else {
    // Create a new graph
    graphValues.forEach(async (graphValue: IGraphValues) => {
      const graph = await sendMessage("create", "component", {
        name: (graphValue.title)?.includes("Plot") ? kXYGraphName : kChartGraphName,
        type: "graph",
        dataContext,
        title: graphValue.title,
        xAttributeName: graphValue.xAttrName,
        yAttributeName: graphValue.yAttrName,
        legendAttributeName: graphValue.legendAttrName,
      });
      return graph;
    });
  }
};

export const addConnectingLinesToGraph = async () => {
  const graph = await sendMessage("update", `component[${kXYGraphName}]`, {
    type: "graph",
    showConnectingLines: true,
  });
  return graph;
};

export const rescaleGraph = async (component: string) => {
  const request = await codapInterface.sendRequest({
    "action": "notify",
    "resource": `component[${component}]`,
    "values": {
      "request": "autoScale",
    }
  });
  return request;
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

export const addRegionOfInterestToGraphs = async (position: number | string) => {
  const roiXYGraph = await sendMessage("create", `component[${kXYGraphName}].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  const roiCategoryChartGraph = await sendMessage("create", `component[${kChartGraphName}].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  return {roiXYGraph, roiCategoryChartGraph};
};

export const updateGraphRegionOfInterest = async (dataContext: string,position: number | string) => {
  const roiXYGraph = await sendMessage("update", `component[${kXYGraphName}].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  const roiCategoryChartGraph = await sendMessage("update", `component[${kChartGraphName}].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  return {roiXYGraph, roiCategoryChartGraph};
};

export const updateLocationColorMap = async (colorMap: Record<string,string>) => {
  const updateColorMap =
          await sendMessage(
                  "update",
                  `dataContext[${kDataContextName}].collection[${kMapPinsCollectionName}].attribute[${"label"}]`,
                  { colormap: colorMap });
  return updateColorMap;
};

export const getSelectionList = async (dataContext: string) => {
  const selectionList = await sendMessage("get", `dataContext[${dataContext}].selectionList`);
  if (selectionList.success) {
    return selectionList.values;
  } else {
    console.error("Error getting selection list");
    return [];
  }
};
