import React, { useEffect, useState } from "react";
import "./app.css";
import { Provider } from "./ui/provider";
import { TabContainer } from "./tabs/tab-container";
import { initializePlugin } from "@concord-consortium/codap-plugin-api";
import { isNonEmbedded } from "../utils/embed-check";
import { ProgressOverlay } from "./ui/progress-overlay";

const kPluginName = "Sample Plugin";
const kVersion = "0.0.1";
const kInitialDimensions = {
  width: 380,
  height: 680
};

export const App = () => {
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (isNonEmbedded()) {
      return; // Skip initialization if noEmbed parameter exists
    }

    initializePlugin({ pluginName: kPluginName, version: kVersion, dimensions: kInitialDimensions });
  }, []);

  return (
    <Provider>
      <TabContainer progressCallback={(current, total) => {
        setProgress({ current, total });
        setShowProgress(current > 0 && current < total);
      }} />
      <ProgressOverlay
        current={progress.current}
        total={progress.total}
        isVisible={showProgress}
      />
    </Provider>
  );
};
