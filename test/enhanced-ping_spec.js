var helper = require('node-red-node-test-helper');
var enhancedPingNode = require('../enhanced-ping.js');
var should = require('should');
var sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('Enhanced Ping Node', function () {
    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "enhanced-ping", name: "enhanced-ping" }];
        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property('name', 'enhanced-ping');
            done();
        });
    });

    it('should perform single ping with statistics', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "127.0.0.1", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('statistics');
                    msg.payload.statistics.should.have.property('host', '127.0.0.1');
                    msg.payload.statistics.should.have.property('totalPings');
                    msg.payload.statistics.should.have.property('successfulPings');
                    msg.payload.statistics.should.have.property('successRate');
                    msg.payload.statistics.should.have.property('averageTime');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "127.0.0.1" });
        });
    });

    it('should handle multiple ping count', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "127.0.0.1", count: 3, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.payload.statistics.should.have.property('totalPings', 3);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "127.0.0.1" });
        });
    });    it('should handle retry logic on failures', function (done) {
        this.timeout(10000); // Increase timeout to 10 seconds to accommodate retry delays
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "192.0.2.1", retries: 2, timeout: 500, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('statistics');
                    // Should have attempted retries
                    msg.payload.statistics.should.have.property('totalPings');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "192.0.2.1" });
        });
    });

    it('should handle continuous ping mode', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "127.0.0.1", interval: 100, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var messageCount = 0;

            n2.on("input", function (msg) {
                messageCount++;
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('statistics');
                    
                    if (messageCount >= 2) {
                        // Stop continuous ping
                        n1.receive({ command: "stop" });
                        setTimeout(() => done(), 50);
                    }
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "127.0.0.1", interval: 100 });
        });
    });    it('should handle stop command', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "127.0.0.1", interval: 200, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var messageCount = 0;

            n2.on("input", function (msg) {
                messageCount++;
                if (messageCount === 1) {
                    // Send stop command immediately after first message
                    setTimeout(() => {
                        n1.receive({ command: "stop" });
                        // Wait and check if more messages arrive
                        setTimeout(() => {
                            // Allow for up to 2 messages (initial + possibly one interval message)
                            // but no more after stop command
                            messageCount.should.be.belowOrEqual(2);
                            done();
                        }, 300);
                    }, 10);
                }
            });

            n1.receive({ payload: "127.0.0.1", interval: 200 });
        });
    });

    it('should handle clear history command', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "127.0.0.1", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");

            // First perform a ping to create history
            n1.receive({ payload: "127.0.0.1" });
            
            setTimeout(() => {
                // Then clear history
                n1.receive({ command: "clear-history" });
                done();
            }, 100);
        });
    });

    it('should handle get history command', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "127.0.0.1", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var responseCount = 0;

            n2.on("input", function (msg) {
                responseCount++;
                if (responseCount === 2) { // Second response should be history
                    try {
                        msg.should.have.property('command', 'history-data');
                        msg.should.have.property('payload');
                        done();
                    } catch (err) {
                        done(err);
                    }
                }
            });

            // First perform a ping
            n1.receive({ payload: "127.0.0.1" });
            
            setTimeout(() => {
                // Then request history
                n1.receive({ command: "get-history" });
            }, 100);
        });
    });

    it('should calculate jitter correctly', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "127.0.0.1", count: 5, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.payload.statistics.should.have.property('jitter');
                    msg.payload.statistics.jitter.should.be.a.Number();
                    msg.payload.statistics.jitter.should.be.greaterThanOrEqual(0);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "127.0.0.1" });
        });
    });

    it('should handle custom packet size', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "127.0.0.1", size: 64, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.payload.should.have.property('statistics');
                    // Verify the ping was performed (we can't easily test packet size directly)
                    msg.payload.statistics.should.have.property('host', '127.0.0.1');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "127.0.0.1", size: 64 });
        });
    });

    it('should handle input message overrides', function (done) {
        var flow = [
            { id: "n1", type: "enhanced-ping", name: "enhanced-ping", ipAddress: "192.168.1.1", timeout: 5000, count: 1, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");

            // Listen for success or failure
            var handled = false;
            n2.on("input", function (msg) {
                if (!handled) {
                    handled = true;
                    try {
                        msg.should.have.property('ip', '127.0.0.1');
                        msg.payload.statistics.should.have.property('totalPings', 2);
                        done();
                    } catch (err) {
                        done(err);
                    }
                }
            });

            n3.on("input", function (msg) {
                if (!handled) {
                    handled = true;
                    try {
                        msg.should.have.property('ip', '127.0.0.1');
                        done();
                    } catch (err) {
                        done(err);
                    }
                }
            });

            // Override config with message properties
            n1.receive({ 
                payload: "127.0.0.1",
                timeout: 2000,
                count: 2
            });
        });
    });
});
