import { Box, Stack, RadioGroup } from "@chakra-ui/react";
import React from "react";
import { kNeoDatasets  } from "../../models/neo-datasets";

interface DatasetSelectorProps {
  /** The currently selected dataset */
  selectedDataset: string;
  /** Callback when dataset selection changes */
  onDatasetChange?: (dataset: string) => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({ selectedDataset, onDatasetChange }) => {
  // Handler for dataset selection changes
  const handleDatasetChange = (details: { value: string }) => {
    const value = details.value;
    onDatasetChange?.(value);
  };

  return (
    <Box>
      <RadioGroup.Root
        value={selectedDataset}
        onValueChange={handleDatasetChange}
        aria-label="Dataset Selection"
        size="sm"
      >
        <Stack direction="column" gap={3}>
          {kNeoDatasets.map((dataset) => (
            <RadioGroup.Item key={dataset.id} value={dataset.id}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText fontWeight="medium">{dataset.label}</RadioGroup.ItemText>
            </RadioGroup.Item>
          ))}
        </Stack>
      </RadioGroup.Root>
    </Box>
  );
};
