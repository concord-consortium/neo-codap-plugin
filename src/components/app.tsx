import React, { useEffect, useState } from "react";
import { Provider } from "./ui/provider";
import { TabContainer } from "./tabs/tab-container";
import { initializePlugin } from "@concord-consortium/codap-plugin-api";
import { isNonEmbedded } from "../utils/embed-check";
// import { ProgressOverlay } from "./ui/progress-overlay";

import "./app.css";

const kPluginName = "NASA Earth Data Plugin";
const kVersion = "0.0.1";
const kInitialDimensions = {
  width: 315,
  height: 400
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
      <TabContainer current={progress.current} total={progress.total} isVisible={showProgress}
          progressCallback={(current, total) => {
          setProgress({ current, total });
          setShowProgress(current > 0 && current < total);
        }}
      />
      {/* <ProgressOverlay
        current={progress.current}
        total={progress.total}
        isVisible={showProgress}
      /> */}
    </Provider>
  );
};
