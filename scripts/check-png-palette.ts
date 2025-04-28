import fs from "fs";
import { decodePng } from "@concord-consortium/png-codec";

// Read the PNG file
// const pngBuffer = fs.readFileSync("neo-images/GPM_3IMERGM/360x180/2025-02-01.png");
const pngBuffer = fs.readFileSync("neo-images/MOD14A1_M_FIRE/360x180/2025-02-01.png");
const png = await decodePng(pngBuffer);

// Debug information
console.log("PNG Properties:");
console.log("==============");
console.log(`Width: ${png.details.width}`);
console.log(`Height: ${png.details.height}`);
console.log(`Color Type: ${png.details.colorType}`);
console.log(`Has Palette: ${!!png.palette}`);
console.log(`Palette Type: ${typeof png.palette}`);
console.log(`Palette Length: ${png.palette ? png.palette.size : "N/A"}`);

// Inspect the palette object
// console.log("\nPalette Object:");
// console.log("==============");
// if (png.palette) {
//     console.log("Keys:", Object.keys(png.palette));
//     console.log("Is Array:", Array.isArray(png.palette));
//     console.log("toString:", png.palette.toString());
//     console.log("Raw palette data:", png.palette);
// }

// Check if the PNG has a palette
if (png.palette) {
    console.log("\nPNG Palette Found:");
    console.log("=================");
    console.log("Index\tR\tG\tB");
    console.log("-------------------");
    for (let i = 0; i < png.palette.size; i++) {
        const color = png.palette.getRgb(i);
        if (color) {
            // Each color is an array of [R,G,B,A]
            console.log(`${i}\t${color[0]}\t${color[1]}\t${color[2]}\t${color[3]}`);
        }
    }
    console.log(`\nTotal palette entries: ${png.palette.size}`);
} else {
    console.log("No palette found in PNG file");
}

console.log("\nRaw chunks in PNG:");
png.rawChunks.forEach((chunk, index) => {
    console.log(`Raw chunk ${index}:`, chunk.type);
});

console.log("\nFirst few pixels:");
console.log("================");
for (let i = 0; i < 10; i++) {
    console.log(`Pixel ${i}: ${png.image.indexedData[i]}`);
}

// // Try reading raw indexes from pixel data
// console.log("\nFirst few pixel indexes:");
// console.log("================");
// const pixelData = png.data;
