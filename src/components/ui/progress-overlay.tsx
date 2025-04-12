import React from "react";
import { Box, Stack } from "@chakra-ui/react";

interface ProgressOverlayProps {
  current: number;
  total: number;
  isVisible: boolean;
}

export const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ current, total, isVisible }) => {
  if (!isVisible) return null;

  const percentage = Math.round((current / total) * 100);

  return (
    <Box
      position="fixed"
      bottom="4"
      left="50%"
      transform="translateX(-50%)"
      bgColor="white"
      boxShadow="md"
      borderRadius="md"
      p={3}
      minW="200px"
      zIndex={1000}
    >
      <Stack direction="column" gap={2}>
        <Box fontSize="sm" color="gray.600" textAlign="center">
          Loading images: {current}/{total}
        </Box>
        <Box w="100%" h="2" bgColor="gray.100" borderRadius="full" overflow="hidden">
          <Box
            w={`${percentage}%`}
            h="100%"
            bgColor="blue.500"
            transition="width 0.2s"
            borderRadius="full"
          />
        </Box>
      </Stack>
    </Box>
  );
};
