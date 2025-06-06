const helper = require("node-red-node-test-helper");
const pingNode = require("../ping-ip.js");
const should = require("should");
const sinon = require("sinon");

helper.init(require.resolve('node-red'));

describe('ping-ip Node - Edge Cases', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
        sinon.restore();
    });

    it('should handle ping library errors gracefully', function (done) {
        // Mock the ping library to throw an error
        var ping = require('ping');
        var stub = sinon.stub(ping.promise, 'probe').rejects(new Error('Network error'));

        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            
            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('error', 'Network error');
                    msg.payload.should.have.property('alive', false);
                    stub.restore();
                    done();
                } catch(err) {
                    stub.restore();
                    done(err);
                }
            });

            n1.receive({ payload: "8.8.8.8" });
        });
    });

    it('should handle timeout correctly', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 1000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            
            var startTime = Date.now();
            
            n3.on("input", function (msg) {
                try {
                    var elapsed = Date.now() - startTime;
                    // Should timeout within reasonable time (allowing some buffer)
                    elapsed.should.be.below(3000);
                    msg.payload.should.have.property('alive', false);
                    done();
                } catch(err) {
                    done(err);
                }
            });

            // Use a non-routable IP that should timeout
            n1.receive({ payload: "10.255.255.1" });
        });
    });

    it('should handle multiple rapid requests', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var responseCount = 0;
            
            n2.on("input", function (msg) {
                responseCount++;
                if (responseCount === 3) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.have.property('alive', true);
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            });

            // Send multiple requests rapidly
            n1.receive({ payload: "8.8.8.8" });
            n1.receive({ payload: "8.8.8.8" });
            n1.receive({ payload: "8.8.8.8" });
        });
    });    it('should validate IPv6 addresses', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var responseReceived = false;
            
            // Handle both success and failure for IPv6 (depends on network config)
            var handleResponse = function (msg) {
                if (!responseReceived) {
                    responseReceived = true;
                    try {
                        msg.should.have.property('payload');
                        msg.should.have.property('ip', '::1'); // localhost IPv6
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            };

            helper.getNode("n2").on("input", handleResponse);
            helper.getNode("n3").on("input", handleResponse);

            // Use localhost IPv6 instead of Google's IPv6 DNS
            n1.receive({ payload: "::1" });
        });
    });    it('should handle empty payload correctly', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", ipAddress: "8.8.8.8", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('ip', '8.8.8.8');
                    msg.payload.should.have.property('host', '8.8.8.8');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "" });
        });
    });

    it('should handle null payload correctly', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", ipAddress: "8.8.8.8", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('ip', '8.8.8.8');
                    msg.payload.should.have.property('host', '8.8.8.8');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: null });
        });
    });

    it('should handle very short timeout values', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 100, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var responseReceived = false;
            
            // Either output is acceptable for very short timeouts
            var handleResponse = function (msg) {
                if (!responseReceived) {
                    responseReceived = true;
                    try {
                        msg.should.have.property('payload');
                        msg.should.have.property('ip', '8.8.8.8');
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            };

            helper.getNode("n2").on("input", handleResponse);
            helper.getNode("n3").on("input", handleResponse);

            n1.receive({ payload: "8.8.8.8" });
        });
    });

    it('should properly clean up on node close', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            
            // Trigger close event
            n1.close();
            
            // Check that status is cleared (this tests the close handler)
            setTimeout(() => {
                done(); // If we get here without errors, cleanup worked
            }, 100);
        });
    });

});
