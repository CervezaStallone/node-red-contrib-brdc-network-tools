var helper = require('node-red-node-test-helper');
var enhancedPingNode = require('../enhanced-ping.js');
var should = require('should');

helper.init(require.resolve('node-red'));

describe('Enhanced Ping Node - Timestamp Fix', function () {
    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should use node.ipAddress when msg.payload contains a timestamp', function (done) {
        var flow = [
            { 
                id: "n1", 
                type: "enhanced-ping", 
                name: "enhanced-ping", 
                ipAddress: "127.0.0.1", 
                count: 1,
                wires: [["n2"], ["n3"]] 
            },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            
            var responseReceived = false;
            var handleResponse = function (msg) {
                if (!responseReceived) {
                    responseReceived = true;
                    try {
                        msg.should.have.property('payload');
                        msg.should.have.property('ip', '127.0.0.1'); // Should use configured IP, not timestamp
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            };

            n2.on("input", handleResponse); // Success output
            n3.on("input", handleResponse); // Failure output (localhost should respond)

            // Send message with timestamp in payload (should fall back to configured IP)
            n1.receive({ payload: "1693766400000" });
        });
    });

    it('should use node.ipAddress when msg.payload contains an ISO timestamp', function (done) {
        var flow = [
            { 
                id: "n1", 
                type: "enhanced-ping", 
                name: "enhanced-ping", 
                ipAddress: "127.0.0.1", 
                count: 1,
                wires: [["n2"], ["n3"]] 
            },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            
            var responseReceived = false;
            var handleResponse = function (msg) {
                if (!responseReceived) {
                    responseReceived = true;
                    try {
                        msg.should.have.property('payload');
                        msg.should.have.property('ip', '127.0.0.1'); // Should use configured IP, not ISO timestamp
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            };

            n2.on("input", handleResponse); // Success output
            n3.on("input", handleResponse); // Failure output (localhost should respond)

            // Send message with ISO timestamp in payload (should fall back to configured IP)
            n1.receive({ payload: "2023-09-03T12:00:00.000Z" });
        });
    });

    it('should still use msg.payload when it contains a valid IP address', function (done) {
        var flow = [
            { 
                id: "n1", 
                type: "enhanced-ping", 
                name: "enhanced-ping", 
                ipAddress: "8.8.8.8", 
                count: 1,
                wires: [["n2"], ["n3"]] 
            },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('statistics');
                    msg.payload.statistics.should.have.property('host', '127.0.0.1');
                    // Should be using the payload IP, not the configured one
                    msg.payload.statistics.host.should.not.equal('8.8.8.8');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Send message with valid IP in payload (this should be used)
            n1.receive({ payload: "127.0.0.1" });
        });
    });

    it('should still use msg.payload when it contains a valid hostname', function (done) {
        var flow = [
            { 
                id: "n1", 
                type: "enhanced-ping", 
                name: "enhanced-ping", 
                ipAddress: "8.8.8.8", 
                count: 1,
                wires: [["n2"], ["n3"]] 
            },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('statistics');
                    msg.payload.statistics.should.have.property('host', 'localhost');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Send message with valid hostname in payload (this should be used)
            n1.receive({ payload: "localhost" });
        });
    });

    it('should use msg.ip when msg.payload is invalid and msg.ip is valid', function (done) {
        var flow = [
            { 
                id: "n1", 
                type: "enhanced-ping", 
                name: "enhanced-ping", 
                ipAddress: "8.8.8.8", 
                count: 1,
                wires: [["n2"], ["n3"]] 
            },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(enhancedPingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            
            var responseReceived = false;
            var handleResponse = function (msg) {
                if (!responseReceived) {
                    responseReceived = true;
                    try {
                        msg.should.have.property('payload');
                        msg.should.have.property('ip', '127.0.0.1'); // Should use msg.ip, not payload or node config
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            };

            n2.on("input", handleResponse); // Success output  
            n3.on("input", handleResponse); // Failure output (localhost should respond)

            // Send message with invalid payload but valid msg.ip - should use msg.ip
            n1.receive({ 
                payload: "1693766400000", // Invalid timestamp 
                ip: "127.0.0.1" // Valid IP that should be used
            });
        });
    });
});
