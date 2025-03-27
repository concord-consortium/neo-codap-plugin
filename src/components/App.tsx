import React from "react";
import "./App.css";
import { Provider } from "./ui/provider";
import { TabContainer } from "./tabs/tab-container";

export const App = () => {
  return (
    <Provider>
      <TabContainer />
    </Provider>
  );
};
