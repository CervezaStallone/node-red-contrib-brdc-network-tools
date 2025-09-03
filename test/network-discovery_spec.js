var helper = require('node-red-node-test-helper');
var networkDiscoveryNode = require('../network-discovery.js');
var should = require('should');
var sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('Network Discovery Node', function () {
    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "network-discovery", name: "network-discovery" }];
        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'network-discovery');
            done();
        });
    });

    it('should discover single IP address', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "127.0.0.1", wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('subnet', '127.0.0.1');
                    msg.payload.should.have.property('totalHosts', 1);
                    msg.payload.should.have.property('aliveHosts');
                    msg.payload.should.have.property('devices');
                    msg.payload.devices.should.be.an.Array();
                    msg.payload.should.have.property('scanOptions');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });

    it('should handle CIDR subnet notation', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "127.0.0.0/30", concurrent: 5, timeout: 1000, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('subnet', '127.0.0.0/30');
                    msg.payload.should.have.property('totalHosts');
                    msg.payload.totalHosts.should.be.greaterThan(0);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });

    it('should handle IP range notation', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "127.0.0.1-127.0.0.3", timeout: 1000, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('subnet', '127.0.0.1-127.0.0.3');
                    msg.payload.should.have.property('totalHosts', 3);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });

    it('should override configuration with message properties', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "192.168.1.0/24", wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('subnet', '127.0.0.1');
                    msg.payload.scanOptions.should.have.property('timeout', 2000);
                    msg.payload.scanOptions.should.have.property('includeHostnames', true);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ 
                subnet: "127.0.0.1",
                timeout: 2000,
                includeHostnames: true
            });
        });
    });

    it('should handle port scanning when enabled', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "127.0.0.1", includePorts: true, portRange: "22,80", timeout: 1000, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.scanOptions.should.have.property('includePorts', true);
                    msg.payload.scanOptions.should.have.property('portRange', '22,80');
                    if (msg.payload.devices.length > 0) {
                        msg.payload.devices[0].should.have.property('openPorts');
                        msg.payload.devices[0].openPorts.should.be.an.Array();
                    }
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });

    it('should handle hostname resolution when enabled', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "127.0.0.1", includeHostnames: true, timeout: 2000, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.scanOptions.should.have.property('includeHostnames', true);
                    if (msg.payload.devices.length > 0) {
                        msg.payload.devices[0].should.have.property('hostname');
                    }
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });

    it('should prevent concurrent scans', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "127.0.0.0/29", timeout: 2000, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var warningCalled = false;

            // Mock the warn function to detect concurrent scan prevention
            var originalWarn = n1.warn;
            n1.warn = function(msg) {
                if (msg === "Scan already in progress") {
                    warningCalled = true;
                }
                originalWarn.call(this, msg);
            };

            // Start first scan
            n1.receive({ payload: "start" });
            
            // Immediately try to start second scan
            n1.receive({ payload: "start" });

            setTimeout(() => {
                try {
                    warningCalled.should.be.true();
                    done();
                } catch (err) {
                    done(err);
                }
            }, 100);
        });
    });    it('should handle invalid subnet gracefully', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "", wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var errorCalled = false;

            // Mock the error function
            var originalError = n1.error;
            n1.error = function(msg) {
                if (msg.includes("No subnet specified")) {
                    errorCalled = true;
                }
                originalError.call(this, msg);
            };

            n1.receive({ payload: "start" });

            setTimeout(() => {
                try {
                    errorCalled.should.be.true();
                    done();
                } catch (err) {
                    done(err);
                }
            }, 100);
        });
    });

    it('should handle port range parsing correctly', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "127.0.0.1", includePorts: true, portRange: "22,80-82,443", timeout: 1000, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.scanOptions.should.have.property('portRange', '22,80-82,443');
                    // The actual port parsing is tested indirectly through the scanning process
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });

    it('should update status during scan progress', function (done) {
        var flow = [
            { id: "n1", type: "network-discovery", name: "network-discovery", subnet: "127.0.0.1-127.0.0.2", timeout: 1000, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var statusUpdates = [];

            // Mock the status function to track updates
            var originalStatus = n1.status;
            n1.status = function(status) {
                statusUpdates.push(status);
                originalStatus.call(this, status);
            };

            n2.on("input", function (msg) {
                try {
                    // Should have received status updates during scan
                    statusUpdates.length.should.be.greaterThan(1);
                    statusUpdates.some(s => s.text && s.text.includes('scanning')).should.be.true();
                    statusUpdates.some(s => s.text && s.text.includes('found')).should.be.true();
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });

    it('should handle Bonjour service discovery when enabled', function (done) {
        this.timeout(10000); // Bonjour discovery can take longer
        
        var flow = [
            { 
                id: "n1", 
                type: "network-discovery", 
                name: "network-discovery", 
                subnet: "127.0.0.1", 
                includeBonjourServices: true,
                bonjourServiceTypes: "http,ssh",
                bonjourTimeout: 3000,
                wires: [["n2"]] 
            },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('bonjourServicesFound');
                    msg.payload.should.have.property('bonjourServices');
                    msg.payload.bonjourServices.should.be.an.Array();
                    msg.payload.scanOptions.should.have.property('includeBonjourServices', true);
                    msg.payload.scanOptions.should.have.property('bonjourServiceTypes', ['http', 'ssh']);
                    
                    // Check if devices have bonjour properties
                    if (msg.payload.devices.length > 0) {
                        msg.payload.devices[0].should.have.property('bonjourServices');
                        msg.payload.devices[0].should.have.property('serviceTypes');
                        msg.payload.devices[0].should.have.property('bonjourServiceCount');
                    }
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });

    it('should override Bonjour configuration with message properties', function (done) {
        this.timeout(10000);
        
        var flow = [
            { 
                id: "n1", 
                type: "network-discovery", 
                name: "network-discovery", 
                subnet: "127.0.0.1",
                includeBonjourServices: false,
                wires: [["n2"]] 
            },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.scanOptions.should.have.property('includeBonjourServices', true);
                    msg.payload.scanOptions.should.have.property('bonjourServiceTypes', ['ftp', 'smb']);
                    msg.payload.should.have.property('bonjourServices');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ 
                includeBonjourServices: true,
                bonjourServiceTypes: 'ftp,smb',
                bonjourTimeout: 2000
            });
        });
    });

    it('should handle Bonjour discovery errors gracefully', function (done) {
        var flow = [
            { 
                id: "n1", 
                type: "network-discovery", 
                name: "network-discovery", 
                subnet: "127.0.0.1",
                includeBonjourServices: true,
                bonjourTimeout: 1000, // Very short timeout to potentially trigger errors
                wires: [["n2"]] 
            },
            { id: "n2", type: "helper" }
        ];

        helper.load(networkDiscoveryNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    // Should still complete even if Bonjour has issues
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('devices');
                    msg.payload.should.have.property('bonjourServices');
                    // bonjourServices should be an array (could be empty if discovery failed)
                    msg.payload.bonjourServices.should.be.an.Array();
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "start" });
        });
    });
});
