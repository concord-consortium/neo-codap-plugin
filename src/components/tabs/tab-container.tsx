import React from "react";
import { Tabs } from "@chakra-ui/react";
import { AboutTab } from "./about-tab";
import { DatasetTab } from "./dataset-tab";
import { ProgressCallback } from "../../models/data-manager";

import "./tab-container.scss";

interface TabContainerProps {
  current: number;
  total: number;
  isVisible: boolean;
  progressCallback: ProgressCallback;
}

export const TabContainer: React.FC<TabContainerProps> = ({ current, total, isVisible, progressCallback }) => {
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
        <DatasetTab current={current} total={total} isVisible={isVisible} progressCallback={progressCallback} />
      </Tabs.Content>
      <Tabs.Content value="about">
        <AboutTab />
      </Tabs.Content>
    </Tabs.Root>
  );
};
