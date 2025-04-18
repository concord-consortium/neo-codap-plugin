import React, { useEffect, useState } from "react";
import {
  addDataContextChangeListener,
  ClientNotification
} from "@concord-consortium/codap-plugin-api";
import { DataManager, kDataContextName } from "../../models/data-manager";
import { kNeoDatasets } from "../../models/neo-datasets";
import { isNonEmbedded } from "../../utils/embed-check";
import { DatasetSelector } from "../dataset-selector/dataset-selector";
import { ProgressContainer } from "./progress-container";

import "./dataset-tab.scss";

export const DatasetTab: React.FC = () => {
  const [, setListenerNotification] = useState<string>();
  const defaultNeoDatasetId = kNeoDatasets[0].id;
  const [selectedNeoDatasetId, setSelectedNeoDatasetId] = useState<string>(defaultNeoDatasetId);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [dataManager] = useState(() => {
    const manager = new DataManager();
    manager.setProgressCallback((current, total) => {
      setProgress({ current, total });
      setShowProgress(current > 0 && current < total);
    });
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
      setShowProgress(true);
      await dataManager.getData(selectedNeoDataset);
    }
  };

  return (
    <div className="App">
      <h1>NASA Earth Data</h1>
      <DatasetSelector selectedDataset={selectedNeoDatasetId} onDatasetChange={handleDatasetChange} />
      <div className="legend-container">
        <img src={selectedNeoDataset?.legendImage} alt={`${selectedNeoDataset?.label} legend`} />
      </div>
      <div className="divider" />
      <div className="footer">
        {showProgress && <ProgressContainer current={progress.current} total={progress.total}/>}
        <div className="footer-buttons-container">
          <button className="get-data-button" disabled={showProgress} onClick={handleGetData}
            title="Fetch data from NASA and send to CODAP">
              Get Data
          </button>
        </div>
      </div>
    </div>
  );
};
