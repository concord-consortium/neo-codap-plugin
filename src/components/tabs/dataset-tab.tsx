import React, { useEffect, useState } from "react";
import {
  addDataContextChangeListener,
  ClientNotification
} from "@concord-consortium/codap-plugin-api";
import { reaction } from "mobx";
import { observer } from "mobx-react-lite";
import { kDataContextName } from "../../data/constants";
import { kNeoDatasets } from "../../models/neo-datasets";
import { DataManager } from "../../models/data-manager";
import { pluginState } from "../../models/plugin-state";
import { isNonEmbedded } from "../../utils/embed-check";
import { DatasetSelector } from "../dataset-selector/dataset-selector";
import { ProgressContainer } from "./progress-container";

import "./dataset-tab.scss";

export const DatasetTab = observer(function DatasetTab() {
  const [, setListenerNotification] = useState<string>();
  const defaultNeoDatasetId = kNeoDatasets[0].id;
  const [selectedNeoDatasetId, setSelectedNeoDatasetId] = useState<string>(defaultNeoDatasetId);
  const [progress, setProgress] = useState({ current: -1, total: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [dataManager] = useState(() => {
    const manager = new DataManager();
    manager.setProgressCallback((current, total) => {
      setProgress({ current, total });
      setShowProgress(current >= 0 && current < total);
    });
    return manager;
  });

  const selectedNeoDataset = kNeoDatasets.find(d => d.id === selectedNeoDatasetId);

  // Update the neo data when the state changes
  useEffect(() => reaction(
    () => {
      const { neoDatasetName, pins } = pluginState;
      return { neoDatasetName, pins };
    },
    () => dataManager.getData()
  ));

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
    if (selectedNeoDataset) pluginState.setNeoDataset(selectedNeoDataset);
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
        {showProgress
          ? <ProgressContainer current={progress.current} total={progress.total}/>
          : <div data-testid="number-of-locations">Locations: {pluginState.pins.length}</div>
        }
        <div className="footer-buttons-container">
          <button className="get-data-button" disabled={showProgress} onClick={handleGetData}
            title="Fetch data from NASA and send to CODAP">
              Get Data
          </button>
        </div>
      </div>
    </div>
  );
});
