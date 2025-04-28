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
