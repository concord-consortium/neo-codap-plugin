import { latLongToPixel } from "./geo-image";

describe("latLongToPixel", () => {
  it("should convert latitude and longitude to pixel coordinates", () => {
    expect(latLongToPixel(800, 600, 0, 0))
      .toEqual({ x: 400, y: 300 });
    expect(latLongToPixel(800, 600, 45, 90))
      .toEqual({ x: 600, y: 150 });
    expect(latLongToPixel(800, 600, -45, -90))
      .toEqual({ x: 200, y: 450 });
  });

  it("should handle coordinates on the edge of the normal range", () => {
    expect(latLongToPixel(800, 600, 90, 180))
      .toEqual({ x: 0, y: 0 });
    expect(latLongToPixel(800, 600, -90, -180))
      .toEqual({ x: 0, y: 599 });
  });

  it("should clamp latitude values outside the range", () => {
    expect(latLongToPixel(800, 600, 100, 0))
      .toEqual({ x: 400, y: 0 });
    expect(latLongToPixel(800, 600, -100, 0))
      .toEqual({ x: 400, y: 599 });
  });

  it("should normalize longitude values outside the range", () => {
    expect(latLongToPixel(800, 600, 0, -160))
      .toEqual({ x: 44, y: 300 });
    expect(latLongToPixel(800, 600, 0, 200))
      .toEqual({ x: 44, y: 300 });
    expect(latLongToPixel(800, 600, 0, -520))
      .toEqual({ x: 44, y: 300 });
  });
});
