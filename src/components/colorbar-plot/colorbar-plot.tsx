import React from "react";
import { observer } from "mobx-react-lite";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
import annotationPlugin from "chartjs-plugin-annotation";
Chart.register(annotationPlugin);
import { Bar } from "react-chartjs-2";
import { dataManager } from "../../models/data-manager";
import { pinLabel, pluginState } from "../../models/plugin-state";

import "./colorbar-plot.scss";

interface IDataPoint {
  x: string,
  y: [string, string]
}

interface IDataset {
  label?: string;
  data: IDataPoint[];
  backgroundColor: string;
}

export const ColorbarPlot = observer(function ColorbarPlot() {
  const { loadedImages, currentImageIndex } = dataManager;

  if (!loadedImages.length) {
    return (
      <div className="colorbar-container">
        <div className="colorbar-placeholder">
          No Data: Select a dataset and click Get Data
        </div>
      </div>
    );
  }

  const { pins } = pluginState;
  if (!pins.length) {
    return (
      <div className="colorbar-container">
        <div className="colorbar-placeholder">
          No Pins: Add a pin to the map
        </div>
      </div>
    );
  }

  const labels: string[] = pins.map((pin) => {
    return pinLabel(pin);
  });

  const datasetMap = new Map<number, IDataset>();
  const yLabels: string[] = [];

  loadedImages.forEach((image) => {
    const { date } = image;
    yLabels.push(date);
    // TODO: handle missing dates some datasets do not have data for every month
  });

  // Add the next month to the yLabels
  const lastDateMonth = new Date(yLabels[yLabels.length - 1]).getMonth() + 1;
  const lastDateYear = new Date(yLabels[yLabels.length - 1]).getFullYear();
  // Note: Javascript correctly handles a month of 13 as the next year
  const lastDate = new Date(lastDateYear, lastDateMonth);
  yLabels.push(lastDate.toISOString().split("T")[0]);

  const selectedYMDDate = loadedImages[currentImageIndex].date;

  loadedImages.forEach((image, imageIndex) => {
    const { date } = image;

    Object.values(image.pins).forEach((pin) => {
      const { paletteIndex, color, value } = pin;
      let dataset = datasetMap.get(paletteIndex);
      if (!dataset) {
        dataset = {
          label: `${value}`,
          data: [],
          backgroundColor: color,
        };
        datasetMap.set(paletteIndex, dataset);
      }

      dataset.data.push({
        x: pin.label,
        y: [date, yLabels[imageIndex + 1]],
      });
    });
  });
  const datasets: IDataset[] = Array.from(datasetMap.values());

  // Note: any is used here as the Bar type doesn't support the `events:` list but the code does
  const options: any = {
    animation: {
      duration: 0,
    },
    dragDirection: "upDown",
    events: ["mousedown", "mouseup", "mousemove", "mouseout", "click"],
    plugins: {
      title: {
        display: false,
        text: "",
      },
      legend: {
        display: false,
      },
      // tooltip: {
      //   callbacks: {
      //     title: function(context: any) {
      //       const date = context[0].raw.y;
      //       return date[0];
      //     },
      //     label: function(context: any) {
      //       const ymdDate = ymdDates[context.parsed.y - 1];
      //       const location = selectedMarkers[context.parsed.x].position;
      //       const value = observations[ymdDate][location.index];
      //       const observation = value ? value : 0
      //       return `${placename(location, placenames)}: ${dynamicRound(observation)} ${info.units}`;
      //     }
      //   }
      // },
      annotation: {
        // enter() {
        //   startAnnotationDragListener();
        // },
        // leave() {
        //   stopAnnotationDragListener();
        // },
        annotations: {
          box1: {
            type: "box" as const,
            yMin: yLabels.indexOf(selectedYMDDate!),
            yMax: yLabels.indexOf(selectedYMDDate!) + 1,
            backgroundColor: "rgba(255, 99, 132, 0.25)"
          }
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        type: "category" as const,
        barPercentage: .5,
      },
      y: {
        reverse: true,
        type: "category" as const,
        labels: yLabels,
      }
    },
  };

  return (
    <div className="colorbar-container">
      <Bar options={options} data={{labels, datasets}}/>
    </div>
  );
});
