import React from "react";
import { Box, Stack } from "@chakra-ui/react";

import "./dataset-tab.scss";

interface IProgressContainerProps {
  current: number;
  total: number;
}

export const ProgressContainer: React.FC<IProgressContainerProps> = ({current, total}) => {
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
