import { codapInterface, sendMessage } from "@concord-consortium/codap-plugin-api";
import {
  kOneMonthInSeconds, kMapName, kMapPinsCollectionName, kDataContextName, kSliderComponentName,
  kXYGraphName, kChartGraphName
} from "../data/constants";

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
  return {roiXYGraph};
};

export const updateGraphRegionOfInterest = async (dataContext: string,position: number | string) => {
  const roiXYGraph = await sendMessage("update", `component[${kXYGraphName}].adornment`, {
    type: "Region of Interest",
    primary: {position, "extent": kOneMonthInSeconds}
  });
  return {roiXYGraph};
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

export const deleteSelectionList = async (dataContext: string) => {
  await sendMessage("create", `dataContext[${dataContext}].selectionList`, []);
};

export const createSelectionList = async (dataContext: string, selectedCaseIds: string[]) => {
  await sendMessage("create", `dataContext[${dataContext}].selectionList`, selectedCaseIds);
};

export const updateSelectionList = async (dataContext: string, selectedCaseIds: string[]) => {
  const result = await sendMessage("update", `dataContext[${dataContext}].selectionList`, selectedCaseIds);
  return result;
};
