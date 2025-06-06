module.exports = function(RED) {
    const ping = require('ping');
    const net = require('net');
    const dns = require('dns');
    const { exec } = require('child_process');

    function NetworkDiscoveryNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Configuration
        node.subnet = config.subnet || '192.168.1.0/24';
        node.portRange = config.portRange || '22,80,443';
        node.timeout = config.timeout || 3000;
        node.concurrent = config.concurrent || 10;
        node.includeHostnames = config.includeHostnames || false;
        node.includePorts = config.includePorts || false;
        
        var scanInProgress = false;

        // Add initialization logging
        node.log(`Network Discovery Node initialized:`);
        node.log(`  Default subnet: ${node.subnet}`);
        node.log(`  Default timeout: ${node.timeout}ms`);
        node.log(`  Default concurrent: ${node.concurrent}`);
        node.log(`  Platform: ${process.platform}`);
        node.log(`  Node.js version: ${process.version}`);

        node.on('input', function(msg) {
            if (scanInProgress) {
                node.warn("Scan already in progress");
                return;
            }

            var subnet = msg.subnet || node.subnet;
            var portRange = msg.portRange || node.portRange;
            var timeout = msg.timeout || node.timeout;
            var concurrent = msg.concurrent || node.concurrent;
            var includeHostnames = msg.hasOwnProperty('includeHostnames') ? msg.includeHostnames : node.includeHostnames;
            var includePorts = msg.hasOwnProperty('includePorts') ? msg.includePorts : node.includePorts;

            // Check for explicitly empty subnet configurations
            if (!subnet || subnet.trim() === '' || (config.subnet === "" && !msg.subnet)) {
                node.error("No subnet specified", msg);
                return;
            }

            scanInProgress = true;
            node.status({fill: "yellow", shape: "dot", text: "scanning " + subnet});

            node.log(`=== Starting Discovery Process ===`);
            node.log(`Subnet: ${subnet}, Timeout: ${timeout}, Concurrent: ${concurrent}`);
            node.log(`Include hostnames: ${includeHostnames}, Include ports: ${includePorts}`);
            
            discoverNetwork(subnet, portRange, timeout, concurrent, includeHostnames, includePorts, msg);
        });async function discoverNetwork(subnet, portRange, timeout, concurrent, includeHostnames, includePorts, originalMsg) {
            try {
                var ipList = generateIPList(subnet);
                var discoveredDevices = [];
                var totalHosts = ipList.length;
                var scannedHosts = 0;

                node.log(`Starting network discovery for subnet: ${subnet}`);
                node.log(`Generated ${totalHosts} IPs to scan: ${ipList.slice(0, 5).join(', ')}${totalHosts > 5 ? '...' : ''}`);

                if (totalHosts === 0) {
                    node.error("No IPs generated from subnet", originalMsg);
                    return;
                }

                // Ping sweep with concurrency control
                var pingPromises = [];
                var semaphore = 0;

                for (let ip of ipList) {
                    // Control concurrency
                    while (semaphore >= concurrent) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                    
                    semaphore++;                    var promise = pingHost(ip, timeout).then(async (result) => {
                        scannedHosts++;
                        node.status({
                            fill: "yellow", 
                            shape: "dot", 
                            text: `scanning ${scannedHosts}/${totalHosts}`
                        });

                        if (result.alive) {
                            node.log(`Found alive host: ${ip} (${result.time}ms) via ${result.method}`);
                            var device = {
                                ip: ip,
                                alive: true,
                                responseTime: result.time,
                                timestamp: new Date().toISOString(),
                                detectionMethod: result.method
                            };

                            // Add hostname if requested
                            if (includeHostnames) {
                                try {
                                    device.hostname = await resolveHostname(ip);
                                } catch (e) {
                                    device.hostname = null;
                                }
                            }

                            // Add port scan if requested
                            if (includePorts) {
                                device.openPorts = await scanPorts(ip, portRange, timeout);
                            }

                            discoveredDevices.push(device);
                        } else {
                            node.log(`Host ${ip} is not alive: ${result.error || 'No response'} (tried: ${result.method})`);
                        }
                        
                        semaphore--;
                        return result;
                    }).catch(error => {
                        scannedHosts++;
                        semaphore--;
                        node.log(`Exception pinging ${ip}: ${error.message}`);
                        return { alive: false, error: error.message, method: 'exception' };
                    });

                    pingPromises.push(promise);
                }

                await Promise.all(pingPromises);

                // Generate discovery report
                var report = {
                    subnet: subnet,
                    totalHosts: totalHosts,
                    aliveHosts: discoveredDevices.length,
                    scanDuration: new Date().toISOString(),
                    devices: discoveredDevices,
                    scanOptions: {
                        portRange: portRange,
                        timeout: timeout,
                        includeHostnames: includeHostnames,
                        includePorts: includePorts
                    }
                };                
                
                var outputMsg = {
                    ...originalMsg,
                    payload: report,
                    topic: 'network-discovery'
                };

                node.log(`=== Discovery Complete ===`);
                node.log(`Found ${discoveredDevices.length} devices out of ${totalHosts} scanned`);
                node.log(`Sending report: ${JSON.stringify(report, null, 2)}`);

                node.status({
                    fill: "green", 
                    shape: "dot", 
                    text: `found ${discoveredDevices.length}/${totalHosts} hosts`
                });

                node.send(outputMsg);

            } catch (error) {
                node.error("Network discovery failed: " + error.message, originalMsg);
                node.status({fill: "red", shape: "ring", text: "error"});            
            } finally {
                scanInProgress = false;
            }
        }        function generateIPList(subnet) {
            var ips = [];
            
            node.log(`Generating IP list for subnet: ${subnet}`);
            
            if (subnet.includes('/')) {
                // CIDR notation
                var [network, prefix] = subnet.split('/');
                var prefixNum = parseInt(prefix);
                var networkParts = network.split('.').map(Number);
                
                node.log(`CIDR: network=${network}, prefix=${prefixNum}`);
                
                // Calculate network address and host bits
                var hostBits = 32 - prefixNum;
                var numHosts = Math.pow(2, hostBits) - 2; // Exclude network and broadcast
                
                if (hostBits > 16) {
                    node.warn("Network too large, limiting scan to 254 hosts");
                    numHosts = 254;
                }
                
                // Simple approach for /24 networks (most common case)
                if (prefixNum === 24) {
                    var baseIP = networkParts.slice(0, 3).join('.');
                    for (let i = 1; i <= 254; i++) {
                        ips.push(`${baseIP}.${i}`);
                    }
                } else {
                    // More complex CIDR calculation for other prefix lengths
                    var networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
                    var subnetMask = ~((1 << hostBits) - 1);
                    var networkAddress = networkNum & subnetMask;
                    
                    // Generate host IPs (skip network address and broadcast)
                    for (let i = 1; i <= Math.min(numHosts, 254); i++) {
                        var hostIP = networkAddress + i;
                        ips.push(numberToIP(hostIP));
                    }
                }            } else if (subnet.includes('-')) {
                // Range notation (e.g., 192.168.1.1-192.168.1.50 or 192.168.1.1-50)
                var [startIP, endPart] = subnet.split('-');
                var startNum = ipToNumber(startIP);
                var endNum;
                
                // Check if endPart is a full IP or just the last octet
                if (endPart.includes('.')) {
                    // Full IP address (e.g., 192.168.1.1-192.168.1.50)
                    endNum = ipToNumber(endPart);
                } else {
                    // Shorthand notation (e.g., 192.168.1.1-50)
                    var startIPParts = startIP.split('.');
                    var endIPLastOctet = parseInt(endPart);
                    
                    // Validate the last octet
                    if (endIPLastOctet < 0 || endIPLastOctet > 255) {
                        node.error(`Invalid end octet in range: ${endPart}. Must be between 0-255.`);
                        return [];
                    }
                    
                    // Construct the full end IP using the same first 3 octets as start IP
                    var endIP = startIPParts[0] + '.' + startIPParts[1] + '.' + startIPParts[2] + '.' + endIPLastOctet;
                    endNum = ipToNumber(endIP);
                }
                
                // Validate range
                if (startNum > endNum) {
                    node.error(`Invalid IP range: start IP (${startIP}) is greater than end IP`);
                    return [];
                }
                
                for (let num = startNum; num <= endNum; num++) {
                    ips.push(numberToIP(num));
                }
            } else {
                // Single IP
                ips.push(subnet);
            }
            
            node.log(`Generated ${ips.length} IPs: ${ips.slice(0, 5).join(', ')}${ips.length > 5 ? '...' : ''}`);
            return ips;
        }

        function ipToNumber(ip) {
            return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
        }

        function numberToIP(num) {
            return [(num >>> 24), (num >>> 16 & 255), (num >>> 8 & 255), (num & 255)].join('.');
        }        async function pingHost(ip, timeout) {
            try {
                // Enhanced ping with multiple fallback methods
                node.log(`Attempting to ping ${ip} with timeout ${timeout}ms`);
                
                // Method 1: Try exec ping first (more reliable in Node-RED)
                node.log(`Trying exec ping for ${ip}`);
                try {
                    var execResult = await execPing(ip, timeout);
                    if (execResult.alive) {
                        node.log(`Exec ping successful for ${ip}: ${execResult.time}ms`);
                        return execResult;
                    }
                } catch (execError) {
                    node.log(`Exec ping failed for ${ip}: ${execError.message}`);
                }
                
                // Method 2: Try the ping library with detailed configuration
                var isWindows = process.platform === 'win32';
                var config = {
                    timeout: Math.max(1, Math.floor(timeout / 1000)),
                    extra: isWindows ? ["-n", "1", "-w", timeout.toString()] : ["-c", "1", "-W", Math.floor(timeout / 1000).toString()],
                    numeric: false,
                    v6: false
                };
                
                node.log(`Ping config for ${ip}: ${JSON.stringify(config)}`);
                
                try {
                    var result = await ping.promise.probe(ip, config);
                    node.log(`Ping library result for ${ip}: ${JSON.stringify(result)}`);
                    
                    if (result.alive) {
                        return {
                            alive: true,
                            time: parseFloat(result.time || result.avg || result.min || 0),
                            error: null,
                            method: 'ping-library'
                        };
                    }
                } catch (pingError) {
                    node.log(`Ping library failed for ${ip}: ${pingError.message}`);
                }
                
                // Method 3: Last resort - TCP connect test on common ports
                node.log(`Trying TCP connect test for ${ip}`);
                try {
                    var tcpResult = await tcpPingTest(ip, timeout);
                    if (tcpResult.alive) {
                        return tcpResult;
                    }
                } catch (tcpError) {
                    node.log(`TCP connect test failed for ${ip}: ${tcpError.message}`);
                }
                
                // All methods failed
                node.log(`All ping methods failed for ${ip}`);
                return {
                    alive: false,
                    time: 0,
                    error: 'All ping methods failed',
                    method: 'none'
                };
                
            } catch (error) {
                node.error(`Critical ping error for ${ip}: ${error.message}`);
                return {
                    alive: false,
                    time: 0,
                    error: error.message,
                    method: 'error'
                };
            }
        }

        async function execPing(ip, timeout) {
            return new Promise((resolve) => {
                var isWindows = process.platform === 'win32';
                var command = isWindows 
                    ? `ping -n 1 -w ${timeout} ${ip}`
                    : `ping -c 1 -W ${Math.floor(timeout/1000)} ${ip}`;
                
                node.log(`Executing: ${command}`);
                
                exec(command, { timeout: timeout + 1000 }, (error, stdout, stderr) => {
                    if (error) {
                        node.log(`Exec ping error for ${ip}: ${error.message}`);
                        resolve({ alive: false, time: 0, error: error.message, method: 'exec-error' });
                        return;
                    }
                    
                    var output = stdout + stderr;
                    node.log(`Exec ping output for ${ip}: ${output.substring(0, 200)}`);
                    
                    // Parse Windows ping output
                    if (isWindows) {
                        if (output.includes('TTL=') || output.includes('time=')) {
                            var timeMatch = output.match(/time[<=](\d+)ms/i);
                            var time = timeMatch ? parseInt(timeMatch[1]) : 0;
                            resolve({ alive: true, time: time, error: null, method: 'exec-windows' });
                        } else {
                            resolve({ alive: false, time: 0, error: 'No TTL in output', method: 'exec-windows-fail' });
                        }
                    } else {
                        // Parse Linux/Unix ping output
                        if (output.includes(' 0% packet loss') || output.includes('1 received')) {
                            var timeMatch = output.match(/time=(\d+\.?\d*)/);
                            var time = timeMatch ? parseFloat(timeMatch[1]) : 0;
                            resolve({ alive: true, time: time, error: null, method: 'exec-unix' });
                        } else {
                            resolve({ alive: false, time: 0, error: 'Packet loss detected', method: 'exec-unix-fail' });
                        }
                    }
                });
            });
        }

        async function tcpPingTest(ip, timeout) {
            // Test common ports to see if host is reachable
            const testPorts = [80, 443, 22, 3389, 135, 445];
            
            for (const port of testPorts) {
                try {
                    var startTime = Date.now();
                    var isOpen = await testTcpPort(ip, port, Math.min(timeout, 2000));
                    if (isOpen) {
                        var responseTime = Date.now() - startTime;
                        node.log(`TCP ping successful for ${ip}:${port} in ${responseTime}ms`);
                        return {
                            alive: true,
                            time: responseTime,
                            error: null,
                            method: `tcp-${port}`,
                            port: port
                        };
                    }
                } catch (e) {
                    // Continue to next port
                }
            }
            
            return {
                alive: false,
                time: 0,
                error: 'No TCP ports responded',
                method: 'tcp-fail'
            };
        }

        function testTcpPort(ip, port, timeout) {
            return new Promise((resolve) => {
                var socket = new net.Socket();
                var timer = setTimeout(() => {
                    socket.destroy();
                    resolve(false);
                }, timeout);

                socket.connect(port, ip, () => {
                    clearTimeout(timer);
                    socket.destroy();
                    resolve(true);
                });

                socket.on('error', () => {
                    clearTimeout(timer);
                    socket.destroy();
                    resolve(false);
                });
            });
        }

        async function resolveHostname(ip) {
            return new Promise((resolve, reject) => {
                dns.reverse(ip, (err, hostnames) => {
                    if (err) reject(err);
                    else resolve(hostnames[0] || null);
                });
            });
        }

        async function scanPorts(ip, portRange, timeout) {
            var ports = parsePortRange(portRange);
            var openPorts = [];
            
            var portPromises = ports.map(port => {
                return new Promise((resolve) => {
                    var socket = new net.Socket();
                    var timer = setTimeout(() => {
                        socket.destroy();
                        resolve(null);
                    }, timeout);

                    socket.connect(port, ip, () => {
                        clearTimeout(timer);
                        socket.destroy();
                        resolve(port);
                    });

                    socket.on('error', () => {
                        clearTimeout(timer);
                        resolve(null);
                    });
                });
            });

            var results = await Promise.all(portPromises);
            return results.filter(port => port !== null);
        }

        function parsePortRange(portRange) {
            var ports = [];
            var ranges = portRange.split(',');
            
            ranges.forEach(range => {
                range = range.trim();
                if (range.includes('-')) {
                    var [start, end] = range.split('-').map(Number);
                    for (let port = start; port <= end; port++) {
                        ports.push(port);
                    }
                } else {
                    ports.push(Number(range));
                }
            });
            
            return ports;
        }

        node.on('close', function() {
            scanInProgress = false;
            node.status({});
        });
    }

    RED.nodes.registerType("network-discovery", NetworkDiscoveryNode);
};
