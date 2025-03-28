#!/usr/bin/env node
/* eslint-env node */

/**
 * A simple script that discovers and lists all Bonjour/Zeroconf services on the local network.
 * Uses the bonjour-service package which is already a devDependency in the project.
 */

import { Bonjour } from "bonjour-service";
const bonjour = new Bonjour();

console.log("Discovering Bonjour/Zeroconf services on the local network...");
console.log("Press Ctrl+C to exit.\n");

// Start a browser for all services
// Note that I've found this does not list all services, but only a few. When a type
// is specified then it seems to find the webpack dev server service right away.
// const browser = bonjour.find({});
// Start a browser for just https services
const browser = bonjour.find({type: "https"});
// Passing a name to the find method does not work. This name is only available on
// SRV records. But the bonjour browser sends a PTR record with the name. So the
// webpack dev server bonjour server does not match this request and then is not
// found.
// const browser = bonjour.find({type: "https", name: "neo-codap-plugin"});

// Handle when a service is found
browser.on("up", service => {
  console.log("Service found:");
  console.log(`  Name: ${service.name}`);
  console.log(`  FQDN: ${service.fqdn}`);
  console.log(`  Type: ${service.type}`);
  console.log(`  Host: ${service.host}`);
  console.log(`  IP Address: ${service.addresses ? service.addresses.join(", ") : "Unknown"}`);
  console.log(`  Port: ${service.port}`);
  console.log(`  Subtypes: ${service.subtypes ? service.subtypes.join(", ") : "None"}`);
  console.log(`  Protocol: ${service.protocol}`);
  console.log(`  Flags: ${service.flags ? service.flags.join(", ") : "None"}`);
  console.log("  TXT Records:");
  if (service.txt) {
    Object.entries(service.txt).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`);
    });
  } else {
    console.log("    None");
  }
  console.log("-----------------------------------");
});

// Handle service down events
browser.on("down", service => {
  console.log(`Service down: ${service.name} (${service.type})`);
});

// Handle errors
browser.on("error", error => {
  console.error("Error discovering services:", error);
});

// Clean up on process exit
process.on("SIGINT", () => {
  console.log("\nStopping service discovery...");
  bonjour.destroy();
  process.exit();
});
