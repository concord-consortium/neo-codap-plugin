import React, { useEffect, useId, useState } from "react";
import {
  addDataContextChangeListener,
  ClientNotification
} from "@concord-consortium/codap-plugin-api";
import { DatasetSelector } from "../dataset-selector/dataset-selector";
import { kDatasets } from "../../models/dataset-config";
import { isNonEmbedded } from "../../utils/embed-check";
import { DataManager, ProgressCallback } from "../../models/data-manager";

const kDataContextName = "NEOPluginData";

interface DatasetTabProps {
  progressCallback: ProgressCallback;
}

export const DatasetTab: React.FC<DatasetTabProps> = ({ progressCallback }) => {
  const [listenerNotification, setListenerNotification] = useState<string>();
  const notificationId = useId();
  // Find the default selected dataset from our config
  const defaultDataset = kDatasets.find(d => d.defaultSelected)?.id || kDatasets[0].id;
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(defaultDataset);
  const [dataManager] = useState(() => {
    const manager = new DataManager();
    manager.setProgressCallback(progressCallback);
    return manager;
  });

  const selectedDataset = kDatasets.find(d => d.id === selectedDatasetId);

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
    setSelectedDatasetId(datasetId);
  };

  const handleGetData = async () => {
    if (selectedDataset) {
      await dataManager.getData(selectedDataset);
    }
  };

  return (
    <div className="App">
      <h1>NASA Earth Observatory</h1>
      <DatasetSelector selectedDataset={selectedDatasetId} onDatasetChange={handleDatasetChange} />
      {selectedDataset && (
        <div className="dataset-info">
          <h2>{selectedDataset.label}</h2>
          <img src={selectedDataset.legendImage} alt={selectedDataset.label} />
          <button onClick={handleGetData} className="get-data-button">
            Get Data
          </button>
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
