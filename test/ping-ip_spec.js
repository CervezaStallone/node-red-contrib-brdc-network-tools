const helper = require("node-red-node-test-helper");
const pingNode = require("../ping-ip.js");
const should = require("should");
const sinon = require("sinon");

helper.init(require.resolve('node-red'));

describe('ping-ip Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "ping-ip", name: "test name" }];
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('name', 'test name');
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should have default properties', function (done) {
        var flow = [{ id: "n1", type: "ping-ip" }];
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('ipAddress');
                n1.should.have.property('timeout');
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should ping a valid IP address from config', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", ipAddress: "8.8.8.8", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('alive', true);
                    msg.payload.should.have.property('host', '8.8.8.8');
                    msg.should.have.property('ip', '8.8.8.8');
                    msg.should.have.property('timestamp');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "" });
        });
    });

    it('should ping a valid IP address from msg.payload', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('alive', true);
                    msg.payload.should.have.property('host', '1.1.1.1');
                    msg.should.have.property('ip', '1.1.1.1');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "1.1.1.1" });
        });
    });

    it('should ping a valid IP address from msg.ip', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('alive', true);
                    msg.payload.should.have.property('host', '8.8.4.4');
                    msg.should.have.property('ip', '8.8.4.4');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ ip: "8.8.4.4" });
        });
    });

    it('should handle unreachable IP address', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 2000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");
            
            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('alive', false);
                    msg.should.have.property('ip', '192.168.999.999');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            // Use an invalid IP that should fail
            n1.receive({ payload: "192.168.999.999" });
        });
    });

    it('should handle hostname pinging', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('alive', true);
                    msg.payload.should.have.property('host');
                    msg.should.have.property('ip', 'google.com');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "google.com" });
        });
    });    it('should error when no IP address is provided', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            
            var errorCaught = false;
            n1.on("call:error", function (call) {
                errorCaught = true;
                call.firstArg.should.equal("No IP address provided");
                done();
            });

            n1.receive({ payload: "" });
            
            // Fallback timeout in case error event doesn't fire
            setTimeout(() => {
                if (!errorCaught) {
                    done(new Error("Expected error was not caught"));
                }
            }, 1000);
        });
    });    it('should error with invalid IP address format', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            
            var errorCaught = false;
            n1.on("call:error", function (call) {
                errorCaught = true;
                call.firstArg.should.match(/Invalid IP address format/);
                done();
            });

            n1.receive({ payload: "invalid-ip-format" });
            
            // Fallback timeout
            setTimeout(() => {
                if (!errorCaught) {
                    done(new Error("Expected error was not caught"));
                }
            }, 1000);
        });
    });

    it('should prioritize msg.payload over configured IP', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", ipAddress: "8.8.8.8", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            
            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('ip', '1.1.1.1');
                    msg.payload.should.have.property('host', '1.1.1.1');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "1.1.1.1" });
        });
    });    it('should include timing information in successful ping', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            
            n2.on("input", function (msg) {
                try {
                    msg.payload.should.have.property('time');
                    // Time can be number or string depending on ping library
                    (typeof msg.payload.time === 'string' || typeof msg.payload.time === 'number').should.be.true();
                    msg.payload.should.have.property('min');
                    msg.payload.should.have.property('max');
                    msg.payload.should.have.property('avg');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "8.8.8.8" });
        });
    });

});
