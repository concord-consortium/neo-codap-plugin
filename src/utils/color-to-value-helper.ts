function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace(/^#/, "");
  const bigint = parseInt(sanitized, 16);
  return [
    Math.floor(bigint / (256 * 256)) % 256,
    Math.floor((bigint / 256) % 256),
    bigint % 256
  ];
}

function rgbToHue([r, g, b]: [number, number, number]): number {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;

  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return h; // hue in degrees (0–360)
}

// Lightness = (max + min) / 2 from RGB, normalized to [0–1]
function rgbToLightness([r, g, b]: [number, number, number]): number {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max + min) / 2;
}

function rgbAverage([r, g, b]: [number, number, number]): number {
  return (r + g + b) / 3 / 255; // Normalize to 0–1
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function linearLegendPosition(position: number, minVal: number, maxVal: number): number {
  return minVal + position * (maxVal - minVal);
}

function logLegendPosition(position: number, minVal: number, maxVal: number): number {
  const minLog = Math.log10(minVal);
  const maxLog = Math.log10(maxVal);
  const logValue = minLog + position * (maxLog - minLog);
  return Math.pow(10, logValue);
}

export const estimateValueFromHex = (dataType: string, hex: string): number =>{
  const rgb = hexToRgb(hex);
  switch (dataType) {
    case "Rainfall": {
      // Logarithmic mapping from 1mm to 2000mm
      const minHex = "#f7fcf0"; // Approx lightest green on the scale
      const maxHex = "#084182"; // Approx darkest blue on the scale

      const minAvg = rgbAverage(hexToRgb(minHex));
      const maxAvg = rgbAverage(hexToRgb(maxHex));
      const currentAvg = rgbAverage(rgb);

      const position = clamp((currentAvg - minAvg) / (maxAvg - minAvg), 0, 1);
      return logLegendPosition(position, 1, 2000);
    }
    case "Carbon Monoxide": {
      // Linear mapping from 0 to 300
      const minHue = 0;     // red (300 ppbv)
      const maxHue = 60;    // yellow (0 ppbv)

      const hue = rgbToHue(hexToRgb(hex));
      const clampedHue = Math.max(minHue, Math.min(maxHue, hue));

      // Reverse map hue to value — yellow (60°) = 0, red (0°) = 300
      const position = (maxHue - clampedHue) / (maxHue - minHue);
      return linearLegendPosition(position, 0, 300);

    }
    case "Nitrogen Dioxide": {
      const lightness = rgbToLightness(rgb);
      // Because lightness decreases with increasing NO2 (yellow → brown),
      // we reverse the position: light = low NO2, dark = high NO2
      const position = 1 - lightness;

      return linearLegendPosition(position, 0, 1500);
    }
    case "Vegetation Index": {
      // Linear mapping from -0.1 to 0.9
      const lightness = rgbToLightness(rgb);
      // REVERSED: higher lightness = lower vegetation index
      const reversedPosition = 1 - lightness;
      const clampedPos = clamp(reversedPosition, 0, 1);

      return linearLegendPosition(clampedPos, -0.1, 0.9);
    }
    case "Land Surface Temperature [day]": {
      const hue = rgbToHue(rgb);

      // Handle hue wrap-around (300–360 → 0–60)
      if (hue >= 180 && hue <= 300) {
        // Cyan to Magenta → -25°C to 10°C
        const position = (hue - 180) / (300 - 180);
        return linearLegendPosition(position, -25, 10);
      } else {
        // Magenta to Yellow → 10°C to 45°C
        const adjustedHue = hue < 60 ? hue + 360 : hue;
        const position = (adjustedHue - 300) / (420 - 300); // 420 = 60 + 360
        return linearLegendPosition(position, 10, 45);
      }
    }
    case "Active Fires": {
      const lightness = rgbToLightness(rgb);
      const position = clamp(lightness, 0, 1);

      return logLegendPosition(position, 0.1, 30);
    }
    default: return 0;
  }
};
