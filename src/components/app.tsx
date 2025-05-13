import React, { useEffect } from "react";
import { initializeNeoPlugin } from "../models/plugin-state";
import { isNonEmbedded } from "../utils/embed-check";
import { TabContainer } from "./tabs/tab-container";
import { Provider } from "./ui/provider";

import "./app.css";

export const App = () => {
  useEffect(() => {
    if (isNonEmbedded()) {
      return; // Skip initialization if noEmbed parameter exists
    }

    initializeNeoPlugin();
  }, []);

  return (
    <Provider>
      <TabContainer />
    </Provider>
  );
};
