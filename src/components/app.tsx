import React, { useEffect } from "react";
import { initializePlugin } from "@concord-consortium/codap-plugin-api";
import { isNonEmbedded } from "../utils/embed-check";
import { TabContainer } from "./tabs/tab-container";
import { Provider } from "./ui/provider";

import "./app.css";

const kPluginName = "NASA Earth Data Plugin";
const kVersion = "0.0.1";
const kInitialDimensions = {
  width: 315,
  height: 410
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
