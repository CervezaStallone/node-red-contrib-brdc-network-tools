# node-red-contrib-network-tools

A comprehensive collection of network monitoring and discovery tools for Node-RED. This package provides four powerful nodes for network analysis, monitoring, and discovery in your Node-RED flows.

## Installation

Install directly from the Node-RED palette manager or via npm:

```bash
npm install node-red-contrib-network-tools
```

After installation, restart Node-RED and you'll find all nodes under the **"networktools"** category in the palette.

## Quick Start

1. **Install the package** using the palette manager or npm
2. **Drag nodes** from the "networktools" category into your flow
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
Discover devices on your network using CIDR notation, IP ranges, or single addresses.

**Features:**
- CIDR subnet scanning (e.g., `192.168.1.0/24`)
- IP range scanning (e.g., `192.168.1.1-50` or `10.13.37.1-20`)
- Port scanning capabilities
- Hostname resolution
- Concurrent scanning with progress reporting
- Configurable timeouts and concurrency

**Usage:**
```
Input: { payload: "192.168.1.0/24" }
Output: { 
  payload: [
    { ip: "192.168.1.1", alive: true, hostname: "router.local" },
    { ip: "192.168.1.100", alive: true, ports: [22, 80] }
  ]
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

## Configuration Tips

All nodes are organized under **"networktools"** in the Node-RED palette for easy access.

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

## License

MIT License - Free for personal and commercial use.

## About

Created by **Brian Rodriguez - BRDC.nl** for the Node-RED community.

## Version History

### v2.1.4 (Latest)
- Organized all nodes under "networktools" category
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
