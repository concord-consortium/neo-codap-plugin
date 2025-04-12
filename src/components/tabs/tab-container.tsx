import React from "react";
import { Tabs } from "@chakra-ui/react";
import { AboutTab } from "./about-tab";
import { DatasetTab } from "./dataset-tab";
import { ProgressCallback } from "../../models/data-manager";

const tabStyles = {
  borderTopLeftRadius: "13px",
  borderTopRightRadius: "13px",
  border: "1px solid #000",
  padding: "8px 18px",
  backgroundColor: "white",
  position: "relative",
  "&[data-selected]::before": {
    display: "none !important"
  },
  "&[data-selected]": {
    fontWeight: "bold",
    borderBottom: "none",
    backgroundColor: "white",
    zIndex: 1,
    // Hide the top border of the content
    "&::after": {
      content: "''",
      position: "absolute",
      bottom: "-1px",
      left: 0,
      right: 0,
      height: "2px",
      backgroundColor: "white"
    }
  },
  "&:not([data-selected])": {
    backgroundColor: "#e0e0e0",
    position: "relative",
    top: "5px",
    height: "calc(var(--tabs-height) - 5px)",
    borderBottom: "none",
    marginLeft: "2px",
    fontSize: "0.92em"
  }
};

interface TabContainerProps {
  progressCallback: ProgressCallback;
}

export const TabContainer: React.FC<TabContainerProps> = ({ progressCallback }) => {
  return (
    <Tabs.Root defaultValue="dataset">
      <Tabs.List css={{ position: "relative", borderBottom: "1px solid #000" }}>
        <Tabs.Trigger
          value="dataset"
          css={{
            ...tabStyles,
            marginLeft: "2px"
          }}
        >
          Dataset
        </Tabs.Trigger>
        <Tabs.Trigger
          value="about"
          css={tabStyles}
        >
          About
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="dataset">
        <DatasetTab progressCallback={progressCallback} />
      </Tabs.Content>
      <Tabs.Content value="about">
        <AboutTab />
      </Tabs.Content>
    </Tabs.Root>
  );
};
