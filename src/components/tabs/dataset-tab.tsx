import React, { useEffect, useId, useState } from "react";
import {
  createDataContext,
  createItems,
  createNewCollection,
  createTable,
  getAllItems,
  getDataContext,
  initializePlugin,
  addDataContextChangeListener,
  ClientNotification,
} from "@concord-consortium/codap-plugin-api";
import { DatasetSelector } from "../dataset-selector/dataset-selector";
import { kDatasets } from "../../models/dataset-config";

const kPluginName = "Sample Plugin";
const kVersion = "0.0.1";
const kInitialDimensions = {
  width: 380,
  height: 680
};
const kDataContextName = "SamplePluginData";

export const DatasetTab: React.FC = () => {
  const [codapResponse, setCodapResponse] = useState<any>(undefined);
  const [listenerNotification, setListenerNotification] = useState<string>();
  const [dataContext, setDataContext] = useState<any>(null);
  const responseId = useId();
  const notificationId = useId();
  // Find the default selected dataset from our config
  const defaultDataset = kDatasets.find(d => d.defaultSelected)?.id || kDatasets[0].id;
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(defaultDataset);

  const selectedDataset = kDatasets.find(d => d.id === selectedDatasetId);

  useEffect(() => {
    // Check for noEmbed parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("noEmbed")) {
      return; // Skip initialization if noEmbed parameter exists
    }

    initializePlugin({ pluginName: kPluginName, version: kVersion, dimensions: kInitialDimensions });

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

  const handleOpenTable = async () => {
    const res = await createTable(kDataContextName);
    setCodapResponse(res);
  };

  const handleCreateData = async() => {
    const existingDataContext = await getDataContext(kDataContextName);
    let createDC, createNC, createI;
    if (!existingDataContext.success) {
      createDC = await createDataContext(kDataContextName);
      setDataContext(createDC.values);
    }
    if (existingDataContext?.success || createDC?.success) {
      createNC = await createNewCollection(kDataContextName, "Pets", [
        { name: "animal", type: "categorical" },
        { name: "count", type: "numeric" }
      ]);
      createI = await createItems(kDataContextName, [
        { animal: "dog", count: 5 },
        { animal: "cat", count: 4 },
        { animal: "fish", count: 20 },
        { animal: "horse", count: 1 },
        { animal: "bird", count: 2 },
        { animal: "snake", count: 1 }
      ]);
    }

    setCodapResponse(`
      Data context created: ${JSON.stringify(createDC)}
      New collection created: ${JSON.stringify(createNC)}
      New items created: ${JSON.stringify(createI)}
    `);
  };

  const handleGetResponse = async () => {
    const result = await getAllItems(kDataContextName);
    setCodapResponse(result);
  };

  return (
    <div className="App">
      <h1>NASA Earth Observatory</h1>
      <DatasetSelector selectedDataset={selectedDatasetId} onDatasetChange={handleDatasetChange} />
      {selectedDataset && (
        <div className="dataset-info">
          <h2>{selectedDataset.label}</h2>
          <img src={selectedDataset.legendImage} alt={selectedDataset.label} />
        </div>
      )}
      <div className="buttons">
        <button onClick={handleCreateData}>
          Create some data
        </button>
        <button onClick={handleOpenTable} disabled={!dataContext}>
          Open Table
        </button>
        <button onClick={handleGetResponse}>
          See getAllItems response
        </button>
        <div className="response-area">
          <label htmlFor={responseId}>Response:</label>
          <output id={responseId} className="response">
            { codapResponse && `${JSON.stringify(codapResponse, null, "  ")}` }
          </output>
        </div>
      </div>
      <div className="response-area">
        <label htmlFor={notificationId}>Listener Notification:</label>
        <output id={notificationId} className="response">
          { listenerNotification && listenerNotification }
        </output>
      </div>
    </div>
  );
};
