import { kNeoDatasetConfigs } from "./neo-dataset-configs";

describe("paletteToValue", () => {
  const valuesThatReturnNull = [-1, 255, 256];
  const valuesThatReturnANumber = [0, 10, 200];

  // Test each dataset's paletteToValue function
  kNeoDatasetConfigs.forEach((config) => {
    const { id, paletteToValue } = config;
    describe(`Dataset ID: ${id}`, () => {

      valuesThatReturnNull.forEach((input) => {
        test(`invalid or missing paletteToValue(${input})`, () => {
          const result = paletteToValue(input);

          expect(result).toBeNull();
        });
      });
      valuesThatReturnANumber.forEach((input) => {
        test(`valid paletteToValue(${input})`, () => {
          const result = paletteToValue(input);
          expect(result).toBeDefined();
          expect(typeof result).toBe("number");
        });
      });
    });
  });
});
