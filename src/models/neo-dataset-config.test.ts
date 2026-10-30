import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { kNeoDatasetConfigs } from "./neo-dataset-configs";

describe("paletteToValue", () => {
  const valuesThatReturnNull = [-1, 255, 256];
  const valuesThatReturnANumber = [10, 200];

  // Test each dataset's paletteToValue function
  kNeoDatasetConfigs.forEach((config) => {
    const { id, paletteToValue } = config;
    describe(`Dataset ID: ${id}`, () => {
      const extraNullValues = [];
      const extraNumberValues = [];

      if (config.id === "MOD14A1_M_FIRE") {
        extraNullValues.push(0);
      } else {
        extraNumberValues.push(0);
      }

      [...extraNullValues, ...valuesThatReturnNull].forEach((input) => {
        test(`invalid or missing paletteToValue(${input})`, () => {
          const result = paletteToValue(input);

          expect(result).toBeNull();
        });
      });
      [...extraNumberValues, ...valuesThatReturnANumber].forEach((input) => {
        test(`valid paletteToValue(${input})`, () => {
          const result = paletteToValue(input);
          expect(result).toBeDefined();
          expect(typeof result).toBe("number");
        });
      });
    });
  });
});

describe("legendImage", () => {
  kNeoDatasetConfigs.forEach(({ id, legendImage }) => {
    test(`Dataset ID: ${id} legend is a bundled PNG`, () => {
      const url = new URL(legendImage);
      expect(url.protocol).toBe("file:");
      const path = fileURLToPath(url);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path).subarray(1, 4).toString()).toBe("PNG");
    });
  });
});
