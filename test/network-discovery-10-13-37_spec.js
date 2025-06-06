// Test the actual network-discovery node with 10.13.37.0/24
const helper = require('node-red-node-test-helper');
const networkDiscoveryNode = require('../network-discovery.js');
const { spawn } = require('child_process');

// Check if 10.13.37.0/24 network is available
function isNetworkAvailable(callback) {
    const ping = spawn(process.platform === 'win32' ? 'ping' : 'ping', 
                      process.platform === 'win32' ? ['-n', '1', '10.13.37.1'] : ['-c', '1', '10.13.37.1']);
    
    ping.on('close', (code) => {
        callback(code === 0);
    });
    
    ping.on('error', () => {
        callback(false);
    });
}

describe('network-discovery with 10.13.37.0/24', function() {
    this.timeout(60000); // 60 seconds timeout for network operations
    
    let networkAvailable = false;
    
    before(function(done) {
        isNetworkAvailable((available) => {
            networkAvailable = available;
            if (!available) {
                console.log('      ⚠️  10.13.37.0/24 network not available - skipping network-specific tests');
            }
            done();
        });
    });
    
    beforeEach(function(done) {
        helper.startServer(done);
    });

    afterEach(function(done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should discover devices in 10.13.37.0/24 network', function(done) {
        if (!networkAvailable) {
            this.skip();
            return;
        }
        const flow = [
            {
                id: "n1",
                type: "network-discovery",
                name: "10.13.37.0/24 discovery",
                subnet: "10.13.37.0/24",
                timeout: 3000,
                concurrent: 5,
                includeHostnames: true,
                includePorts: false,
                wires: [["n2"]]
            },
            {
                id: "n2", 
                type: "helper"
            }
        ];

        helper.load(networkDiscoveryNode, flow, function() {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function(msg) {
                try {
                    console.log("=== Network Discovery Results for 10.13.37.0/24 ===");
                    console.log(`Topic: ${msg.topic}`);
                    console.log(`Subnet: ${msg.payload.subnet}`);
                    console.log(`Total hosts scanned: ${msg.payload.totalHosts}`);
                    console.log(`Alive hosts found: ${msg.payload.aliveHosts}`);
                    console.log(`Scan duration: ${msg.payload.scanDuration}`);
                    
                    // Validate the response structure
                    msg.should.have.property('topic', 'network-discovery');
                    msg.payload.should.have.property('subnet', '10.13.37.0/24');
                    msg.payload.should.have.property('totalHosts', 254);
                    msg.payload.should.have.property('aliveHosts');
                    msg.payload.should.have.property('devices');
                    msg.payload.should.have.property('scanOptions');
                    
                    // Check that devices were found (based on our test results)
                    msg.payload.aliveHosts.should.be.above(0, 'Should find at least one alive host');
                    msg.payload.devices.should.be.an('array');
                    
                    console.log("\n=== Found Devices ===");
                    msg.payload.devices.forEach((device, index) => {
                        console.log(`${index + 1}. IP: ${device.ip}`);
                        console.log(`   Alive: ${device.alive}`);
                        console.log(`   Response Time: ${device.responseTime}ms`);
                        console.log(`   Timestamp: ${device.timestamp}`);
                        if (device.hostname) {
                            console.log(`   Hostname: ${device.hostname}`);
                        }
                        console.log('');
                        
                        // Validate device structure
                        device.should.have.property('ip');
                        device.should.have.property('alive', true);
                        device.should.have.property('responseTime');
                        device.should.have.property('timestamp');
                    });
                    
                    // Check scan options
                    msg.payload.scanOptions.should.have.property('timeout', 3000);
                    msg.payload.scanOptions.should.have.property('includeHostnames', true);
                    msg.payload.scanOptions.should.have.property('includePorts', false);
                    
                    console.log("✓ Network discovery test passed successfully!");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the network discovery
            n1.receive({payload: "start scan"});
        });
    });    it('should handle 10.13.37.0/24 with port scanning', function(done) {
        if (!networkAvailable) {
            this.skip();
            return;
        }
        const flow = [
            {
                id: "n1",
                type: "network-discovery",
                name: "10.13.37.0/24 with ports",
                subnet: "10.13.37.0/24",
                portRange: "22,80,443,3389",
                timeout: 2000,
                concurrent: 3,
                includeHostnames: false,
                includePorts: true,
                wires: [["n2"]]
            },
            {
                id: "n2", 
                type: "helper"
            }
        ];

        helper.load(networkDiscoveryNode, flow, function() {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function(msg) {
                try {
                    console.log("=== Network Discovery with Port Scanning ===");
                    console.log(`Found ${msg.payload.aliveHosts} hosts with port scanning`);
                    
                    msg.payload.devices.forEach((device, index) => {
                        console.log(`${index + 1}. ${device.ip} (${device.responseTime}ms)`);
                        if (device.openPorts && device.openPorts.length > 0) {
                            console.log(`   Open ports: ${device.openPorts.join(', ')}`);
                        } else {
                            console.log(`   Open ports: none detected`);
                        }
                    });
                    
                    // Validate port scanning results
                    msg.payload.scanOptions.should.have.property('includePorts', true);
                    msg.payload.scanOptions.should.have.property('portRange', '22,80,443,3389');
                    
                    // Each device should have openPorts property
                    msg.payload.devices.forEach(device => {
                        device.should.have.property('openPorts');
                        device.openPorts.should.be.an('array');
                    });
                    
                    console.log("✓ Port scanning test passed successfully!");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the network discovery with port scanning
            n1.receive({
                payload: "start scan",
                subnet: "10.13.37.0/24",
                includePorts: true,
                portRange: "22,80,443,3389"
            });
        });
    });    it('should handle message-based subnet override for 10.13.37.0/24', function(done) {
        if (!networkAvailable) {
            this.skip();
            return;
        }
        const flow = [
            {
                id: "n1",
                type: "network-discovery",
                name: "default config",
                subnet: "192.168.1.0/24", // Default different subnet
                timeout: 2000,
                concurrent: 3,
                wires: [["n2"]]
            },
            {
                id: "n2", 
                type: "helper"
            }
        ];

        helper.load(networkDiscoveryNode, flow, function() {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function(msg) {
                try {
                    console.log("=== Message-based Subnet Override Test ===");
                    
                    // Should use the message subnet, not the node configuration
                    msg.payload.should.have.property('subnet', '10.13.37.0/24');
                    msg.payload.aliveHosts.should.be.above(0);
                    
                    console.log(`✓ Successfully overrode subnet to 10.13.37.0/24`);
                    console.log(`✓ Found ${msg.payload.aliveHosts} hosts`);
                    
                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Send message with subnet override
            n1.receive({
                payload: "scan",
                subnet: "10.13.37.0/24",
                timeout: 2000
            });
        });
    });
});
