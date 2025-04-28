import fs from "fs";
import { decodePng } from "@concord-consortium/png-codec";

// const kDatasetId = "GPM_3IMERGM";
// const kDatasetId = "MOP_CO_M";
// const kDatasetId = "AURA_NO2_M";
// const kDatasetId = "MOD_NDVI_M";
const kDatasetId = "MOD_LSTD_CLIM_M";
// const kDatasetId = "MOD14A1_M_FIRE";

// const kImageDate = "2025-02-01";
// const kImageDate = "2024-09-01";
const kImageDate = "2001-12-01";

// Read the CSV file
const csvContent = fs.readFileSync(`neo-images/${kDatasetId}/360x180/${kImageDate}.csv`, "utf-8");
const csvValues = csvContent
    .split("\n")
    .map(line => line.split(",").map(value => parseFloat(value.trim())));

// Read the PNG file
const pngBuffer = fs.readFileSync(`neo-images/${kDatasetId}/360x180/${kImageDate}.png`);
const png = await decodePng(pngBuffer);

if (!png.palette) {
    console.error("No palette found in PNG file");
    process.exit(1);
}

if (png.details.colorType !== 3) {
    console.error("PNG is not in indexed color mode");
    process.exit(1);
}

// Check for duplicate colors in the palette
const colorMap = new Map();

for (let i = 0; i < png.palette.size; i++) {
    const color = png.palette.getRgb(i);
    if (color) {
        const colorKey = `${color[0]},${color[1]},${color[2]}`;
        if (colorMap.has(colorKey)) {
            console.error(`Duplicate color found: RGB(${colorKey}) at palette indexes ${colorMap.get(colorKey)} and ${i}`);
        } else {
            colorMap.set(colorKey, i);
        }
    }
}

// Create a map to store palette index -> value mappings
const indexToValue = new Map();

// Process each pixel
for (let y = 0; y < png.image.height; y++) {
    const csvY = y;

    for (let x = 0; x < png.image.width; x++) {
        // Skip if we don't have corresponding CSV data
        if (!csvValues[csvY] || !csvValues[csvY][x]) continue;

        const csvValue = csvValues[csvY][x];

        const paletteIndex = png.image.indexedData[y * png.image.width + x];

        if (paletteIndex < 0 || paletteIndex > 255) {
            console.error(`Invalid palette index ${paletteIndex} at (${x},${y})`);
            continue;
        }

        // Get the RGB values from the PNG palette
        const color = png.palette.getRgb(paletteIndex);
        if (!color) {
            console.error(`No color found for palette index ${paletteIndex} at (${x},${y})`);
            continue;
        }
        const [r, g, b] = color;

        // Store the mapping
        if (!indexToValue.has(csvValue)) {
            indexToValue.set(csvValue, {
                paletteIndex,
                r,
                g,
                b,
                value: csvValue,
                count: 1
            });
        } else {
            const existingMapping = indexToValue.get(csvValue);
            existingMapping.count++;
        }
    }
}

// Convert map to array and sort by palette index
const mappings = Array.from(indexToValue.values())
    .sort((a, b) => a.value - b.value);

// Create CSV output
const csvOutput = ["palette_index,r,g,b,value"];
mappings.forEach(mapping => {
    csvOutput.push(`${mapping.paletteIndex},${mapping.r},${mapping.g},${mapping.b},${mapping.value},${mapping.count}`);
});

// Write to file
fs.writeFileSync("color-mapping.csv", csvOutput.join("\n"));

// Print summary
console.log(`PNG Dimensions: ${png.image.width}x${png.image.height}`);
console.log(`CSV Dimensions: ${csvValues[0].length}x${csvValues.length}`);
console.log("Color mapping has been saved to color_mapping.csv");
console.log(`Total number of unique colors: ${mappings.length}`);

// Print value range
const values = mappings.map(m => m.value);
console.log(`Value range: ${Math.min(...values)} to ${Math.max(...values)}`);

// Print palette index range
const indices = mappings.map(m => m.paletteIndex);
console.log(`Palette index range: ${Math.min(...indices)} to ${Math.max(...indices)}`);

// Validate the mapping
console.log("\nValidating color mapping...");
let totalPixels = 0;
let correctPredictions = 0;
let incorrectPredictions = 0;
let skippedPixels = 0;

// Create a reverse mapping from palette index to value
const paletteToValue = new Map(mappings.map(m => [m.paletteIndex, m.value]));

for (let y = 0; y < png.image.height; y++) {
    const csvY = y;

    for (let x = 0; x < png.image.width; x++) {
        totalPixels++;

        // Skip if we don't have corresponding CSV data
        if (!csvValues[csvY] || !csvValues[csvY][x]) {
            skippedPixels++;
            continue;
        }

        const csvValue = csvValues[csvY][x];

        const paletteIndex = png.image.indexedData[y * png.image.width + x];

        if (paletteIndex < 0 || paletteIndex > 255) {
          console.error(`Invalid palette index ${paletteIndex} at (${x},${y})`);
          continue;
        }

        // Get the predicted value from our mapping
        const predictedValue = paletteToValue.get(paletteIndex);

        if (predictedValue === undefined) {
            console.error(`No value mapping found for palette index ${paletteIndex} at (${x},${y})`);
            incorrectPredictions++;
            continue;
        }

        // Compare with actual value
        if (Math.abs(predictedValue - csvValue) < 0.001) { // Using small epsilon for float comparison
            correctPredictions++;
        } else {
            console.error(`Mismatch at (${x},${y}): predicted ${predictedValue}, actual ${csvValue}`);
            incorrectPredictions++;
        }
    }
}

console.log("\nValidation Results:");
console.log(`Total pixels: ${totalPixels}`);
console.log(`Skipped pixels (no CSV data): ${skippedPixels}`);
console.log(`Correct predictions: ${correctPredictions}`);
console.log(`Incorrect predictions: ${incorrectPredictions}`);
console.log(`Accuracy: ${((correctPredictions / (correctPredictions + incorrectPredictions)) * 100).toFixed(2)}%`);
