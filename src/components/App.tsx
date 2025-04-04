import React, { useEffect } from "react";
import "./App.css";
import { Provider } from "./ui/provider";
import { TabContainer } from "./tabs/tab-container";
import { initializePlugin } from "@concord-consortium/codap-plugin-api";
import { isNonEmbedded } from "../utils/embed-check";

const kPluginName = "Sample Plugin";
const kVersion = "0.0.1";
const kInitialDimensions = {
  width: 380,
  height: 680
};

export const App = () => {
  useEffect(() => {
    if (isNonEmbedded()) {
      return; // Skip initialization if noEmbed parameter exists
    }

    initializePlugin({ pluginName: kPluginName, version: kVersion, dimensions: kInitialDimensions });
  }, []);

  return (
    <Provider>
      <TabContainer />
    </Provider>
  );
};
