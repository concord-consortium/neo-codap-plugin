import React from "react";
import { Tabs } from "@chakra-ui/react";
import { DatasetTab } from "./dataset-tab";

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

export const TabContainer: React.FC = () => {
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
        <DatasetTab />
      </Tabs.Content>
      <Tabs.Content value="about">
        <div>NASA Earth Observatory</div>
      </Tabs.Content>
    </Tabs.Root>
  );
};
