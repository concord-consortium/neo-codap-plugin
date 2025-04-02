# Utility Scripts

This directory contains utility scripts for the neo-codap-plugin project.

## Service Discovery Tool

### list-bonjour-services.mjs

This script uses the `bonjour-service` package to discover and list all Bonjour/Zeroconf services on your local network.

#### Usage

You can run the service discovery tool using npm:

```bash
npm run discover-services
```

The script will continuously monitor for services being advertised on your local network using Bonjour/Zeroconf (also known as mDNS). For each service, it will display:

- Service name
- Service type
- Host
- IP address(es)
- Port
- Subtypes (if any)
- Protocol
- Flags (if any)
- TXT records (if any)

This can be particularly useful for:

1. Debugging network connectivity issues
2. Discovering available services on your local network
3. Verifying that your own services are being advertised correctly

#### Terminating the Script

The script will run continuously until manually stopped. To stop the script, press `Ctrl+C` in the terminal.
