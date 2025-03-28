import React from "react";
import { Tabs } from "@chakra-ui/react";
import { DatasetTab } from "./dataset-tab";

export const TabContainer: React.FC = () => {
  return (
    <Tabs.Root defaultValue="dataset">
      <Tabs.List>
        <Tabs.Trigger value="dataset">Dataset</Tabs.Trigger>
        <Tabs.Trigger value="about">About</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="dataset">
        <DatasetTab />
      </Tabs.Content>
      <Tabs.Content value="about">
        <div>NASA Earth Observatory</div>
      </Tabs.Content>
    </Tabs.Root>
  );
};
