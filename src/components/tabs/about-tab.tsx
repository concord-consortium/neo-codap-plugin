import React from "react";
import "./about-tab.scss";

export function AboutTab() {
  return (
    <div className="about-tab">
      <h4>About</h4>
      <p>
        This plugin uses data from the <a href="https://neo.gsfc.nasa.gov/" rel="noreferrer" target="_blank">NASA Earth Observations</a> (NEO) site which supplies integrated worldwide data for a variety of geophysical phenomena. Choose from among the several sets of raster data to see and interact with them in CODAP.
      </p>
      <h4>Acknowledgements</h4>
      <p>
        This material is supported by the <a href="https://concord.org/our-work/research-projects/data-in-space-and-time/" rel="noreferrer" target="_blank">Data in Space and Time project</a> at the Concord Consortium. It is based on work supported by the National Science Foundation under Grant No. DUE-2201154. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the authors and do not necessarily reflect the views of the National Science Foundation.
      </p>
    </div>
  );
}
