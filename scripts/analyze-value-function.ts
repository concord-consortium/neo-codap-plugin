import fs from "fs";

const kIncludePaletteIndex0 = true;

// Read the color mapping CSV
const csvContent = fs.readFileSync("color-mapping.csv", "utf-8");
const lines = csvContent.split("\n").slice(1); // Skip header
const data = lines.map(line => {
    const [paletteIndex, r, g, b, value] = line.split(",").map(Number);
    return { paletteIndex, r, g, b, value };
});

// Sort by palette index and filter out 99999.00 values
const validData = data
  .filter(d => d.value !== 99999.00 && (kIncludePaletteIndex0 || d.paletteIndex !== 0))
  .sort((a, b) => a.paletteIndex - b.paletteIndex);

// Extract x (palette index) and y (value) arrays for analysis
const paletteIndexes = validData.map(d => d.paletteIndex);
const physicalValues = validData.map(d => d.value);

// Function to calculate mean
function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Function to calculate standard deviation
function stdDev(arr) {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length);
}

// Function to calculate correlation coefficient
function correlation(x, y) {
    const xMean = mean(x);
    const yMean = mean(y);
    const xStdDev = stdDev(x);
    const yStdDev = stdDev(y);

    const numerator = x.reduce((sum, xi, i) =>
        sum + (xi - xMean) * (y[i] - yMean), 0);
    return numerator / (x.length * xStdDev * yStdDev);
}

// Function to calculate R-squared for a given function
function rSquared(x, y, func) {
    const yMean = mean(y);
    const totalSS = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residualSS = y.reduce((sum, yi, i) =>
        sum + Math.pow(yi - func(x[i]), 2), 0);
    return 1 - (residualSS / totalSS);
}

function calculatePowerFit() {
  const lnX = paletteIndexes.map(xi => Math.log(xi));
  const lnXMean = mean(lnX);
  const lnYMean = mean(lnY);
  const bPow = lnX.reduce((sum, xi, i) => sum + (xi - lnXMean) * (lnY[i] - lnYMean), 0) /
    lnX.reduce((sum, xi) => sum + Math.pow(xi - lnXMean, 2), 0);
  const lnAPow = lnYMean - bPow * lnXMean;
  const aPow = Math.exp(lnAPow);

  const _powerFunc = x => aPow * Math.pow(x, bPow);
  const _powerRSquared = rSquared(paletteIndexes, physicalValues, _powerFunc);
  console.log(`\nPower function: f(x) = ${aPow.toFixed(4)}x^${bPow.toFixed(4)}`);
  console.log(`R-squared for power fit: ${_powerRSquared.toFixed(4)}`);
  return { powerRSquared: _powerRSquared, powerFunc: _powerFunc };
}

function calculateExponentialFit() {
  const xMean = mean(paletteIndexes);
  const bExp = paletteIndexes.reduce((sum, xi, i) => sum + (xi - xMean) * (lnY[i] - mean(lnY)), 0) /
    paletteIndexes.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
  const lnA = mean(lnY) - bExp * xMean;
  const a = Math.exp(lnA);

  const _expFunc = x => a * Math.exp(bExp * x);
  const _expRSquared = rSquared(paletteIndexes, physicalValues, _expFunc);
  console.log(`Exponential function: f(x) = ${a}e^(${bExp}x)`);
  console.log(`R-squared for exponential fit: ${_expRSquared.toFixed(4)}`);
  return { expRSquared: _expRSquared, expFunc: _expFunc };
}

function calculateLinearRegression() {
  const xMean = mean(paletteIndexes);
  const yMean = mean(physicalValues);
  const m = paletteIndexes.reduce((sum, xi, i) => sum + (xi - xMean) * (physicalValues[i] - yMean), 0) /
    paletteIndexes.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
  const b = yMean - m * xMean;

  const _linearFunc = x => m * x + b;
  const _linearRSquared = rSquared(paletteIndexes, physicalValues, _linearFunc);
  console.log(`Linear function: f(x) = ${m.toFixed(4)}x + ${b.toFixed(4)}`);
  console.log(`R-squared for linear fit: ${_linearRSquared.toFixed(4)}`);
  return { linearRSquared: _linearRSquared, linearFunc: _linearFunc };
}

// Try different function types
console.log("Analyzing relationship between palette index and value...\n");
console.log(`Total data points: ${validData.length}`);
console.log(`Value range: ${Math.min(...physicalValues)} to ${Math.max(...physicalValues)}\n`);

// 1. Linear function: f(x) = mx + b
const correlationCoeff = correlation(paletteIndexes, physicalValues);
console.log(`Linear correlation coefficient: ${correlationCoeff.toFixed(4)}`);

// Calculate linear regression
const { linearRSquared, linearFunc } = calculateLinearRegression();

// 2. Exponential function: f(x) = ae^(bx)
// First, try to fit ln(y) = ln(a) + bx
const lnY = physicalValues.map(yi => Math.log(yi));
const lnCorrelation = correlation(paletteIndexes, lnY);
console.log(`\nLog correlation coefficient: ${lnCorrelation.toFixed(4)}`);

// Calculate exponential regression
const { expRSquared, expFunc } = calculateExponentialFit();

// 3. Power function: f(x) = ax^b
// Try to fit ln(y) = ln(a) + bln(x)
const { powerRSquared, powerFunc } = calculatePowerFit();

// Print summary of best fit
console.log("\nBest fit analysis:");
const fits = [
    { name: "Linear", rSquared: linearRSquared, func: linearFunc },
    { name: "Exponential", rSquared: expRSquared, func: expFunc },
    { name: "Power", rSquared: powerRSquared, func: powerFunc }
];

const bestFit = fits.reduce((best, current) =>
    current.rSquared > best.rSquared ? current : best
);

console.log(`Best fit: ${bestFit.name} function (R-squared = ${bestFit.rSquared.toFixed(4)})`);

// Generate some example predictions
console.log("\nExample predictions:");
const testIndices = [0, 64, 128, 192, 210];
testIndices.forEach(index => {
    const validDataNearIndex = validData.find(d => d.paletteIndex >= index);
    if (!validDataNearIndex) {
        return;
    }
    const { value: actual, paletteIndex } = validDataNearIndex;
    const predicted = bestFit.func(paletteIndex);
    const error = Math.abs(actual - predicted);
    const errorPercent = (error / actual) * 100;
    console.log(`Palette index ${paletteIndex}: ` +
      `Actual: ${actual?.toFixed(3) || "N/A"} ` +
      `Predicted: ${predicted.toFixed(3)} ` +
      `Error: ${error.toFixed(3)} (${errorPercent.toFixed(2)}%)`
    );
});
