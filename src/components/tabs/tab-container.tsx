import React from "react";
import { Tabs } from "@chakra-ui/react";
import { AboutTab } from "./about-tab";
import { DatasetTab } from "./dataset-tab";

import "./tab-container.scss";

export const TabContainer: React.FC = () => {
  return (
    <Tabs.Root defaultValue="dataset" variant="outline" className="tabs-root">
      <Tabs.List className="tabs-list">
        <Tabs.Trigger value="dataset" className={"tabs-trigger dataset"}>
          Dataset
        </Tabs.Trigger>
        <Tabs.Trigger value="about" className={"tabs-trigger about"}>
          About
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="dataset">
        <DatasetTab />
      </Tabs.Content>
      <Tabs.Content value="about">
        <AboutTab />
      </Tabs.Content>
    </Tabs.Root>
  );
};
