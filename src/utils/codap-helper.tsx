import { sendMessage } from "@concord-consortium/codap-plugin-api";

export const createGraph = async (dataContext: string, name: string, xAttrName: string, yAttrName: string) => {
  const graph = await sendMessage("create", "component", {
    type: "graph",
    name,
    dataContext,
    xAttributeName: xAttrName,
    yAttributeName: yAttrName
  });
  return graph;
};
