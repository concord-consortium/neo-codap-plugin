import { initializePlugin } from "@concord-consortium/codap-plugin-api";
import { kInitialDimensions, kPluginName, kVersion } from "../data/constants";

export function initializeNeoPlugin() {
  initializePlugin({ pluginName: kPluginName, version: kVersion, dimensions: kInitialDimensions });
}
