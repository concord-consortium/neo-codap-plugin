import React from "react";
import { App } from "./app";
import { render, screen } from "@testing-library/react";

describe("test load app", () => {
  it("renders without crashing", () => {
    render(<App/>);
    // Look for the heading specifically since we have multiple instances of the text
    expect(screen.getByRole("heading", { name: "NASA Earth Observatory" })).toBeDefined();
  });
});

