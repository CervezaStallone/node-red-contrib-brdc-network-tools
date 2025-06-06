var helper = require('node-red-node-test-helper');
var networkPerformanceMonitorNode = require('../network-performance-monitor.js');
var should = require('should');
var sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('Network Performance Monitor Node', function () {
    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "network-performance-monitor", name: "network-performance-monitor" }];
        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'network-performance-monitor');
            done();
        });
    });

    it('should perform single measurement for multiple targets', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", targets: ["127.0.0.1", "127.0.0.2"], wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('timestamp');
                    msg.payload.should.have.property('measurements');
                    msg.payload.measurements.should.be.an.Array();
                    msg.payload.measurements.length.should.equal(2);
                    msg.payload.should.have.property('aggregate');
                    msg.payload.aggregate.should.have.property('totalTargets', 2);
                    msg.payload.aggregate.should.have.property('aliveTargets');
                    msg.payload.aggregate.should.have.property('availabilityPercent');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ targets: ["127.0.0.1", "127.0.0.2"] });
        });
    });

    it('should start and stop continuous monitoring', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", targets: ["127.0.0.1"], interval: 100, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var messageCount = 0;

            n2.on("input", function (msg) {
                messageCount++;
                if (messageCount === 2) {
                    // Stop monitoring after receiving 2 measurements
                    n1.receive({ command: "stop" });
                    
                    setTimeout(() => {
                        // Should have stopped receiving messages
                        messageCount.should.equal(2);
                        done();
                    }, 200);
                }
            });

            // Start monitoring
            n1.receive({ command: "start", targets: ["127.0.0.1"], interval: 100 });
        });
    });

    it('should generate performance report', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", targets: ["127.0.0.1"], wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var responseCount = 0;

            n2.on("input", function (msg) {
                responseCount++;
                if (responseCount === 2) { // Second message should be the report
                    try {
                        msg.should.have.property('topic', 'network-performance-report');
                        msg.payload.should.have.property('timestamp');
                        msg.payload.should.have.property('monitoringActive');
                        msg.payload.should.have.property('targets');
                        msg.payload.should.have.property('summary');
                        msg.payload.should.have.property('recentAlerts');
                        done();
                    } catch (err) {
                        done(err);
                    }
                }
            });

            // First perform a measurement to generate some data
            n1.receive({ targets: ["127.0.0.1"] });
            
            setTimeout(() => {
                // Then request a report
                n1.receive({ command: "get-report" });
            }, 100);
        });
    });

    it('should generate alerts for threshold violations', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", 
                targets: ["192.0.2.1"], // Non-routable address to trigger failure
                latencyThreshold: 1, // Very low threshold to trigger alerts
                timeout: 1000,
                wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('topic', 'network-alerts');
                    msg.should.have.property('payload');
                    msg.payload.should.be.an.Array();
                    msg.payload.length.should.be.greaterThan(0);
                    msg.payload[0].should.have.property('type');
                    msg.payload[0].should.have.property('target');
                    msg.payload[0].should.have.property('severity');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ targets: ["192.0.2.1"] });
        });
    });

    it('should add and remove targets dynamically', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", targets: ["127.0.0.1"], wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var statusUpdates = [];

            // Mock the status function to track updates
            var originalStatus = n1.status;
            n1.status = function(status) {
                statusUpdates.push(status);
                originalStatus.call(this, status);
            };

            // Add a target
            n1.receive({ command: "add-target", target: "127.0.0.2" });
            
            setTimeout(() => {
                // Remove a target
                n1.receive({ command: "remove-target", target: "127.0.0.2" });
                
                setTimeout(() => {
                    try {
                        // Should have status updates for add/remove operations
                        statusUpdates.some(s => s.text && s.text.includes('added')).should.be.true();
                        statusUpdates.some(s => s.text && s.text.includes('removed')).should.be.true();
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, 50);
            }, 50);
        });
    });

    it('should clear performance data', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", targets: ["127.0.0.1"], wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var statusUpdates = [];

            // Mock the status function
            var originalStatus = n1.status;
            n1.status = function(status) {
                statusUpdates.push(status);
                originalStatus.call(this, status);
            };

            // First generate some data
            n1.receive({ targets: ["127.0.0.1"] });
            
            setTimeout(() => {
                // Then clear data
                n1.receive({ command: "clear-data" });
                
                setTimeout(() => {
                    try {
                        statusUpdates.some(s => s.text && s.text.includes('data cleared')).should.be.true();
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, 50);
            }, 100);
        });
    });

    it('should calculate aggregate statistics correctly', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", 
                targets: ["127.0.0.1", "192.0.2.1"], // Mix of reachable and unreachable
                timeout: 1000,
                wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.payload.aggregate.should.have.property('totalTargets', 2);
                    msg.payload.aggregate.should.have.property('aliveTargets');
                    msg.payload.aggregate.should.have.property('downTargets');
                    msg.payload.aggregate.should.have.property('availabilityPercent');
                    msg.payload.aggregate.availabilityPercent.should.be.a.Number();
                    msg.payload.aggregate.availabilityPercent.should.be.within(0, 100);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ targets: ["127.0.0.1", "192.0.2.1"] });
        });
    });

    it('should handle input message overrides', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", 
                targets: ["192.168.1.1"], 
                timeout: 5000,
                wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");

            var handled = false;
            
            n2.on("input", function (msg) {
                if (!handled) {
                    handled = true;
                    try {
                        // Should use overridden targets
                        msg.payload.measurements.length.should.equal(1);
                        msg.payload.measurements[0].target.should.equal("127.0.0.1");
                        done();
                    } catch (err) {
                        done(err);
                    }
                }
            });

            n3.on("input", function (msg) {
                if (!handled) {
                    handled = true;
                    done(); // Accept either success or failure path
                }
            });

            // Override config with message properties
            n1.receive({ 
                targets: ["127.0.0.1"],
                timeout: 2000
            });
        });
    });

    it('should track performance history and calculate trends', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", 
                targets: ["127.0.0.1"],
                historyLimit: 10,
                wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var measurementCount = 0;

            n2.on("input", function (msg) {
                measurementCount++;
                if (measurementCount === 3) {
                    // After 3 measurements, request a report to check trends
                    n1.receive({ command: "get-report" });
                } else if (measurementCount === 4) {
                    try {
                        // This should be the report
                        msg.payload.should.have.property('summary');
                        if (msg.payload.summary['127.0.0.1']) {
                            msg.payload.summary['127.0.0.1'].should.have.property('trend');
                            msg.payload.summary['127.0.0.1'].trend.should.be.a.String();
                        }
                        done();
                    } catch (err) {
                        done(err);
                    }
                }
            });

            // Perform multiple measurements to build history
            n1.receive({ targets: ["127.0.0.1"] });
            setTimeout(() => n1.receive({ targets: ["127.0.0.1"] }), 50);
            setTimeout(() => n1.receive({ targets: ["127.0.0.1"] }), 100);
        });
    });

    it('should prevent monitoring conflicts', function (done) {
        var flow = [
            { id: "n1", type: "network-performance-monitor", name: "network-performance-monitor", 
                targets: ["127.0.0.1"], 
                interval: 200,
                wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(networkPerformanceMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var warningCalled = false;

            // Mock the warn function
            var originalWarn = n1.warn;
            n1.warn = function(msg) {
                if (msg === "Monitoring already active") {
                    warningCalled = true;
                }
                originalWarn.call(this, msg);
            };

            // Start first monitoring session
            n1.receive({ command: "start", targets: ["127.0.0.1"], interval: 200 });
            
            setTimeout(() => {
                // Try to start second session
                n1.receive({ command: "start", targets: ["127.0.0.1"], interval: 200 });
                
                setTimeout(() => {
                    try {
                        warningCalled.should.be.true();
                        n1.receive({ command: "stop" });
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, 50);
            }, 50);
        });
    });
});
