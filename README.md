<p align="center">
  <img src="img/logo.png" alt="node-red-contrib-network-tools logo" width="256">
</p>

<h1 align="center">node-red-contrib-network-tools</h1>

<p align="center">
A comprehensive collection of network monitoring, discovery, and diagnostic tools for Node-RED. This package provides nine powerful nodes for network analysis, monitoring, and discovery in your Node-RED flows.
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/node-red-contrib-network-tools.svg" alt="npm version">
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue.svg" alt="license">
  <img src="https://img.shields.io/badge/node--red-%3E%3D1.0.0-red.svg" alt="node-red compatibility">
</p>

<p align="center">
  <a href="https://brdc.nl/en/node-red-network-tools/">Project page</a> ·
  <a href="https://brdc.nl/nl/node-red-network-tools/">Nederlands</a> ·
  <a href="https://brdc.nl/de/node-red-network-tools/">Deutsch</a>
</p>

---

<p align="center">
<a href="https://buymeacoffee.com/cervezastallone" target="_blank" title="buymeacoffee">
  <img src="https://iili.io/JoQ1MeS.md.png"  alt="buymeacoffee-yellow-badge" style="width: 208px;">
</a>
</p>

## Installation

Install directly from the Node-RED palette manager or via npm:

```bash
npm install node-red-contrib-network-tools
```

After installation, restart Node-RED and you'll find all nodes under the **"brdc-network-nodes"** category in the palette.

## Quick Start

1. **Install the package** using the palette manager or npm
2. **Drag nodes** from the "brdc-network-nodes" category into your flow
3. **Configure targets** (IP addresses, hostnames, or network ranges)
4. **Deploy** and start monitoring your network!

## Available Nodes

### 🏓 Ping IP
Basic ping functionality to test connectivity to IP addresses or hostnames.

**Features:**
- Simple ping operations
- IPv4 and IPv6 support
- Hostname resolution
- Configurable timeout
- Success/failure status reporting

**Usage:**
```
Input: { payload: "8.8.8.8" }
Output: { payload: true, latency: 23, target: "8.8.8.8" }
```

### 🎯 Enhanced Ping
Advanced ping with statistics, retry logic, and continuous monitoring capabilities.

**Features:**
- Multiple ping attempts with statistics
- Continuous monitoring mode
- Jitter calculation
- Packet loss tracking
- Custom packet sizes
- Historical data storage

**Usage:**
```
Input: { payload: "google.com", count: 5 }
Output: { 
  payload: { 
    alive: true, 
    stats: { avg: 25, min: 20, max: 30, loss: 0, jitter: 2.5 } 
  } 
}
```

### 🔍 Network Discovery
Discover devices on your network using CIDR notation, IP ranges, or single addresses. Now with **Bonjour/mDNS support** for zero-configuration service discovery.

**Features:**
- CIDR subnet scanning (e.g., `192.168.1.0/24`)
- IP range scanning (e.g., `192.168.1.1-50` or `10.13.37.1-20`)
- Port scanning capabilities
- Hostname resolution (traditional DNS)
- **Bonjour/mDNS service discovery** (.local hostnames, service advertisements)
- **Zero-configuration networking** support (printers, AirPlay, SSH, web servers, etc.)
- Service type detection (HTTP, SSH, FTP, SMB, printer services)
- Concurrent scanning with progress reporting
- Configurable timeouts and concurrency

**Usage:**
```
Input: { payload: "192.168.1.0/24", includeBonjourServices: true }
Output: { 
  payload: {
    devices: [
      { 
        ip: "192.168.1.1", 
        alive: true, 
        hostname: "router.local",
        bonjourServices: [
          {
            name: "Router Web Interface",
            type: "http",
            port: 80,
            host: "router.local"
          }
        ],
        serviceTypes: ["http"]
      },
      { 
        ip: "192.168.1.100", 
        alive: true, 
        hostname: "Johns-MacBook.local",
        ports: [22, 80],
        bonjourServices: [
          {
            name: "SSH on John's Mac",
            type: "ssh",
            port: 22
          }
        ]
      }
    ],
    bonjourServices: [
      {
        name: "Office Printer",
        type: "printer",
        host: "HP-LaserJet.local",
        port: 631
      }
    ]
  }
}
```

### 📊 Network Performance Monitor
Monitor network performance with configurable thresholds and alerting.

**Features:**
- Continuous network performance monitoring
- Multiple target monitoring
- Configurable thresholds for latency and availability
- Alert generation for threshold violations
- Performance trend analysis
- Historical data and reporting
- Start/stop monitoring commands

**Usage:**
```
Input: { command: "start" }
Output: { 
  payload: {
    measurements: [
      { target: "8.8.8.8", alive: true, latency: 15 },
      { target: "1.1.1.1", alive: true, latency: 12 }
    ],
    aggregateStats: { averageLatency: 13.5, aliveTargets: 2 }
  }
}
```

### 🌐 DNS Lookup
Resolve DNS records (A, AAAA, MX, TXT, CNAME, NS) or reverse-lookup an IP to a hostname (PTR).

**Features:**
- Forward lookups for any standard DNS record type
- Reverse (PTR) lookups
- Per-message overrides for target and record type
- Configurable timeout with clean failure output

**Usage:**
```
Input: { payload: "example.com", recordType: "MX" }
Output: { payload: { records: [...], target: "example.com", recordType: "MX" } }
```

### 🔌 TCP Port Check
Test whether one or more TCP ports are open on a host — no ICMP required, works through firewalls that block ping.

**Features:**
- Check multiple ports in a single call (comma-separated)
- Per-port open/closed status with response time
- Success output if any port is open, failure if all are closed

**Usage:**
```
Input: { host: "192.168.1.1", ports: "22,80,443" }
Output: { payload: { openPorts: [22, 80], closedPorts: [443], results: [...] } }
```

### 🛰️ Traceroute
Trace the network path to a target, hop by hop.

**Features:**
- Cross-platform (`traceroute` on Linux/macOS, `tracert` on Windows)
- Configurable max hops
- Parsed hop list (IP + response times) plus raw output

**Usage:**
```
Input: { payload: "8.8.8.8", maxHops: 20 }
Output: { payload: { target: "8.8.8.8", hops: [{ hop: 1, ip: "...", times: [...] }, ...] } }
```

### 📶 Bandwidth Monitor
Measure real download throughput by timing a download against a configurable test URL (defaults to a public Cloudflare speed-test endpoint).

**Features:**
- Real-world Mbps measurement, not a synthetic estimate
- Configurable test URL and timeout
- Works with any public or self-hosted HTTP(S) download endpoint

**Usage:**
```
Input: { testUrl: "https://speed.cloudflare.com/__down?bytes=10000000" }
Output: { payload: { mbps: 87.3, bytesReceived: 10000000, elapsedSeconds: 0.92 } }
```

### 📡 SNMP Poll
Query SNMP-enabled devices (switches, routers, printers, UPS units) for one or more OIDs.

**Features:**
- SNMP v1 and v2c support
- Multiple OIDs per request (comma-separated)
- Per-OID error handling — one bad OID doesn't fail the whole poll

**Usage:**
```
Input: { host: "192.168.1.1", community: "public", oids: "1.3.6.1.2.1.1.1.0" }
Output: { payload: { results: [{ oid: "1.3.6.1.2.1.1.1.0", value: "...", type: "OctetString" }] } }
```

## Configuration Tips

All nodes are organized under **"brdc-network-nodes"** in the Node-RED palette for easy access.

### Best Practices
- **Start small**: Begin with a single target before monitoring multiple hosts
- **Set reasonable timeouts**: Use 3-5 seconds for local networks, 10+ seconds for internet hosts
- **Monitor critical services**: Focus on essential infrastructure components
- **Use appropriate intervals**: 30-60 seconds for most monitoring scenarios

## Common Use Cases

### 🏠 Home Network Monitoring
Monitor your home router, smart devices, and internet connectivity:
```
192.168.1.1 (router)
192.168.1.0/24 (discover all devices)
8.8.8.8 (internet connectivity)
```

### 🏢 Business Network Monitoring  
Monitor servers, switches, and critical infrastructure:
```
server.company.com
192.168.10.1 (main switch)
10.0.0.0/16 (corporate network scan)
```

### ☁️ Cloud Service Monitoring
Monitor external services and APIs:
```
api.service.com
cdn.provider.com
database.cloud.com
```

## Flow Examples

### Example 1: Basic Internet Connectivity Check
```
[Inject] → [Ping IP: 8.8.8.8] → [Debug]
```
*Simple flow to check if internet is reachable*

### Example 2: Network Device Discovery
```
[Inject: 192.168.1.0/24] → [Network Discovery] → [Function: Filter Alive] → [Debug]
```
*Discover all devices on your local network*

### Example 3: Continuous Server Monitoring
```
[Inject: start] → [Performance Monitor] → [Switch: Alert/Normal] → [Dashboard/Email]
```
*Monitor multiple servers with alerting*

### Example 4: Advanced Network Health Dashboard
```
[Inject] → [Enhanced Ping] → [Function: Parse Stats] → [Chart Widget]
```
*Create network performance charts with statistics*

## 🎛️ Bonjour/mDNS Configuration

The Network Discovery node now supports **Bonjour/mDNS** (also known as zero-configuration networking) for discovering services that advertise themselves on the local network.

### What is Bonjour/mDNS?

Bonjour/mDNS enables automatic discovery of devices and services without requiring manual configuration. Common examples include:

- **Printers** advertising print services
- **Apple devices** (AirPlay, SSH, file sharing)
- **Web servers** on development machines
- **IoT devices** with web interfaces
- **Network-attached storage** (NAS) devices
- **Smart home devices**

### Configuration Options

**Enable Bonjour/mDNS Discovery:** Checkbox to enable service discovery

**Service Types:** Comma-separated list of services to discover:
- `http` - Web servers and web interfaces
- `ssh` - SSH servers
- `ftp` - FTP servers  
- `smb` - Windows file sharing
- `printer` - Network printers
- `airplay` - Apple AirPlay devices
- `afpovertcp` - Apple Filing Protocol
- `nfs` - Network File System

**Bonjour Timeout:** How long to wait for service responses (1000-30000ms)

### Example Service Types by Device

**Home Networks:**
```
http,ssh,printer,airplay,smb
```

**Development Networks:**
```
http,ssh,ftp,mongodb,redis,postgresql
```

**Office Networks:**
```
http,ssh,smb,printer,afpovertcp
```

### Benefits

1. **Discover .local hostnames** that don't exist in DNS
2. **Identify device types** based on advertised services  
3. **Find network services** automatically without port scanning
4. **Monitor service availability** in real-time
5. **Cross-platform compatibility** (works on Windows, macOS, Linux)

## Troubleshooting

### Common Issues

**"Host unreachable" errors:**
- Check if the target IP/hostname is correct
- Verify network connectivity
- Increase timeout values for slow networks

**No devices found in network discovery:**
- Ensure the subnet notation is correct (e.g., 192.168.1.0/24)
- Check if devices respond to ping (some may have firewalls)
- Try smaller IP ranges first

**Bonjour/mDNS services not found:**
- Not all devices advertise services via Bonjour/mDNS
- Some networks may block multicast traffic (required for mDNS)
- Try increasing the Bonjour timeout value
- Check if devices are on the same network segment
- Some enterprise firewalls block mDNS traffic

**Bonjour discovery slow or incomplete:**
- Increase the timeout value (try 10000ms for large networks)
- Reduce the number of service types being searched
- Some devices may advertise services slowly after network changes

**Performance monitor not starting:**
- Verify at least one target is configured
- Check that targets are reachable
- Ensure monitoring interval is reasonable (minimum 10 seconds)

## Support & Documentation

- **Node Help**: Each node includes detailed help text accessible in Node-RED
- **Configuration**: All settings have tooltips and validation
- **Error Handling**: Errors are displayed in Node-RED debug panel

## Requirements

- **Node-RED**: v1.0.0 or higher
- **Node.js**: v12.0.0 or higher
- **Operating System**: Windows, macOS, Linux

## Contributing

Contributions are welcome — bug reports, feature requests, and pull requests alike. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get set up and what to expect from the review process.

## About

Created by **Brian Rodriguez - BRDC.nl** for the Node-RED community.

## Version History

### v3.0.0 (Latest)
- **🎉 NEW: 5 New Nodes** - `dns-lookup`, `tcp-port-check`, `traceroute`, `bandwidth-monitor`, `snmp-poll` join the original four
- **⚖️ License Change** - Relicensed from MIT to GPL-3.0
- **Docs** - Full documentation, badges, and contributing guide added

### v2.3.6
- **Republish** - Republished to npm; registry had been stuck on v2.3.5 despite the hostname-validation, packaging, and test-runner fixes below already being in git

### v2.3.5
- **🔧 FIXED: Inject Node Compatibility** - All nodes now handle inject node timestamps properly
- **Enhanced Fallback Logic** - Enhanced-ping and ping-ip nodes fall back to configured IP when msg.payload contains timestamps
- **Network Performance Monitor Improvements** - Fixed ping result handling and added input validation
- **Consistent Behavior** - All nodes now use the same fallback validation approach for better user experience
- **Consistent Hostname Validation** - ping-ip and network-performance-monitor now accept single-label LAN hostnames (e.g. `nas`, `raspberrypi`), matching enhanced-ping
- **Better Error Handling** - Improved ping result processing and error states
- **Docs** - Corrected palette category name in README (was documented as "networktools", nodes actually register under "brdc-network-nodes")
- **Packaging** - Added an npm `files` allowlist so debug/dev scripts no longer ship in the published package
- **Dev** - Bumped `mocha` to v11 to fix the test runner crashing on newer Node.js versions

### v2.3.3
- **🔧 FIXED: Network Performance Monitor** - Fixed ping configuration and result processing
- **Improved Ping Results** - Better handling of "unknown" values and failed pings
- **Enhanced Validation** - Added input validation to network performance monitor
- **Platform Compatibility** - Improved ping command arguments for cross-platform support

### v2.3.2
- **🔧 FIXED: Enhanced Ping Timestamp Validation** - Changed to direct validation approach
- **Ping-IP IPv6 Support** - Added proper IPv6 address validation
- **Improved Hostname Validation** - More strict hostname format checking
- **Test Coverage** - Enhanced test suite for edge cases and validation scenarios

### v2.3.1
- **🔧 FIXED: Enhanced Ping Input Validation** - Fixed bug where timestamps in msg.payload would be used as host target
- **Improved Input Logic** - Enhanced ping now properly validates msg.payload before using it as target IP/hostname
- **Better Error Handling** - Falls back to msg.ip or node.ipAddress when msg.payload contains invalid data
- **Timestamp Rejection** - Numeric timestamps and ISO date strings are now properly rejected
- **Comprehensive Testing** - Added extensive tests for input validation scenarios

### v2.2.0
- **🎉 NEW: Bonjour/mDNS Service Discovery** - Zero-configuration networking support
- **Service Type Detection** - Automatically discover HTTP, SSH, FTP, SMB, printer services and more
- **Enhanced Device Information** - Discover .local hostnames and service advertisements
- **Cross-Platform Support** - Works on Windows, macOS, and Linux
- **Configurable Service Types** - Specify which services to discover
- **Service Correlation** - Link discovered services to IP addresses and devices
- **Comprehensive Testing** - Full test coverage for new Bonjour functionality

### v2.1.4
- Organized all nodes under "brdc-network-nodes" category
- Enhanced network discovery with shorthand IP ranges
- Comprehensive network performance monitoring
- Full English documentation and help text

### v2.1.0
- Added Network Performance Monitor node
- Enhanced ping statistics and jitter calculation  
- Improved network discovery performance

### v2.0.0
- Initial release with four network monitoring nodes
- Support for IPv4/IPv6 and hostname resolution
- CIDR and IP range scanning capabilities

---

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.

The npm dependencies are installed under their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Node-RED is a trademark of the OpenJS Foundation. This is an independent package, not affiliated with or endorsed by the OpenJS Foundation or the Node-RED project.

The software is provided as is, without any warranty (see [LICENSE](LICENSE)). Use it at your own risk; to the extent permitted by law, BRDC is not liable for any damage caused by its use, including damage to networks or equipment.

---

<p align="center">
  Developed by <strong><a href="https://brdc.nl">BRDC</a></strong><br>
</p>