import React, { useEffect, useId, useState } from "react";
import {
  addDataContextChangeListener,
  ClientNotification
} from "@concord-consortium/codap-plugin-api";
import { DatasetSelector } from "../dataset-selector/dataset-selector";
import { kNeoDatasets } from "../../models/neo-datasets";
import { isNonEmbedded } from "../../utils/embed-check";
import { DataManager, kDataContextName, ProgressCallback } from "../../models/data-manager";
import { HStack, Slider, Stack, Text } from "@chakra-ui/react";

interface DatasetTabProps {
  progressCallback: ProgressCallback;
}

export const DatasetTab: React.FC<DatasetTabProps> = ({ progressCallback }) => {
  const [listenerNotification, setListenerNotification] = useState<string>();
  const notificationId = useId();
  const defaultNeoDatasetId = kNeoDatasets[0].id;
  const [selectedNeoDatasetId, setSelectedNeoDatasetId] = useState<string>(defaultNeoDatasetId);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);
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
      await dataManager.getData(selectedNeoDataset);
      setHasLoadedData(true);
      setCurrentImageIndex(0);
    }
  };

  const handleSliderChange = async (value: number) => {
    setCurrentImageIndex(value);
    await dataManager.updateMapWithItemIndex(value);
  };

  return (
    <div className="App">
      <h1>NASA Earth Observatory</h1>
      <DatasetSelector selectedDataset={selectedNeoDatasetId} onDatasetChange={handleDatasetChange} />
      {selectedNeoDataset && (
        <div className="dataset-info">
          <h2>{selectedNeoDataset.label}</h2>
          <img src={selectedNeoDataset.legendImage} alt={`${selectedNeoDataset.label} legend`} />
          <button onClick={handleGetData} className="get-data-button">
            Get Data
          </button>
          {hasLoadedData && (
            <Stack gap="4" marginTop="4">
              <Text>Select Date:</Text>
              <Slider.Root
                value={[currentImageIndex]}
                onValueChange={(e) => handleSliderChange(e.value[0])}
                min={0}
                max={dataManager.items.length - 1}
                step={1}
              >
                <HStack justify="space-between">
                  <Slider.Label>Image</Slider.Label>
                  <Slider.ValueText />
                </HStack>
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumbs />
                </Slider.Control>
              </Slider.Root>
            </Stack>
          )}
        </div>
      )}
      <div className="response-area">
        <label htmlFor={notificationId}>Listener Notification:</label>
        <output id={notificationId} className="response">
          { listenerNotification && listenerNotification }
        </output>
      </div>
    </div>
  );
};
