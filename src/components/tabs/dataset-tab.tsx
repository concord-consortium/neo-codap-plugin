import React, { useEffect, useState } from "react";
import {
  addDataContextChangeListener,
  ClientNotification
} from "@concord-consortium/codap-plugin-api";
import { DatasetSelector } from "../dataset-selector/dataset-selector";
import { kNeoDatasets } from "../../models/neo-datasets";
import { isNonEmbedded } from "../../utils/embed-check";
import { DataManager, kDataContextName, ProgressCallback } from "../../models/data-manager";

import "./dataset-tab.scss";
import { Box, Stack } from "@chakra-ui/react";
interface DatasetTabProps {
  current: number;
  total: number;
  isVisible: boolean;
  progressCallback: ProgressCallback;
}

export const DatasetTab: React.FC<DatasetTabProps> = ({ current, total, isVisible, progressCallback }) => {
  const [listenerNotification, setListenerNotification] = useState<string>();
  const defaultNeoDatasetId = kNeoDatasets[0].id;
  const [selectedNeoDatasetId, setSelectedNeoDatasetId] = useState<string>(defaultNeoDatasetId);
  const [isFetching, setIsFetching] = useState(false);
  const [dataManager] = useState(() => {
    const manager = new DataManager();
    manager.setProgressCallback(progressCallback);
    return manager;
  });

  const selectedNeoDataset = kNeoDatasets.find(d => d.id === selectedNeoDatasetId);

  useEffect(() => {
    if (isNonEmbedded()) {
      return; // Skip listener setup if noEmbed parameter exists
    }

    const casesUpdatedListener = (listenerRes: ClientNotification) => {
      if (listenerRes.values.operation === "updateCases") {
        setListenerNotification(JSON.stringify(listenerRes.values.result));
      }
    };
    addDataContextChangeListener(kDataContextName, casesUpdatedListener);
  }, []);

  const handleDatasetChange = (datasetId: string) => {
    setSelectedNeoDatasetId(datasetId);
  };

  const handleGetData = async () => {
    if (selectedNeoDataset) {
      setIsFetching(true);
      await dataManager.getData(selectedNeoDataset);
      setIsFetching(false);
    }
  };

  return (
    <div className="App">
      <h1>NASA Earth Data</h1>
      <DatasetSelector selectedDataset={selectedNeoDatasetId} onDatasetChange={handleDatasetChange} />
      <img src={selectedNeoDataset?.legendImage} alt={`${selectedNeoDataset?.label} legend`} />

      <div className="divider" />
      <div className="footer">
        {isVisible && <ProgressContainer current={current} total={total}/>}
        <div className="footer-buttons-container">
          <button className="get-data-button" disabled={isFetching} onClick={handleGetData}
            title="Fetch data from NASA and send to CODAP">
              Get Data
          </button>
        </div>
      </div>
    </div>
  );
};

interface IProgressContainerProps {
  current: number;
  total: number;
}

const ProgressContainer: React.FC<IProgressContainerProps> = ({current, total}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <Stack direction="column" gap={2} className="progress-container">
        <Box width="150px" fontSize="xs" color="gray.600" textAlign="center">
          Loading images: {current}/{total}
        </Box>
        <Box w="100%" h="2" bgColor="gray.100" borderRadius="full" overflow="hidden">
          <Box w={`${percentage}%`} h="100%" bgColor="blue.500" transition="width 0.2s"
            borderRadius="full"/>
        </Box>
    </Stack>);
};
