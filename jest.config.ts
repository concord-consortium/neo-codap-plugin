import type {Config} from "jest";
import { createDefaultEsmPreset } from "ts-jest";

const tsJestPreset = createDefaultEsmPreset();

const config: Config = {
  ...tsJestPreset,
  setupFilesAfterEnv: [
    "<rootDir>/src/test/setupTests.ts"
  ],
  testEnvironment: "jsdom",
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  testPathIgnorePatterns: [
    "/node_modules/",
    "/playwright/"
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "src/utilities/test-utils.ts"
  ],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|sass|scss)$": "identity-obj-proxy"
  },
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ]
};

export default config;
