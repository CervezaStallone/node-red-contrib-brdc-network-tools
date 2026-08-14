const helper = require("node-red-node-test-helper");
const bandwidthMonitorNode = require("../bandwidth-monitor.js");
const should = require("should");
const sinon = require("sinon");

helper.init(require.resolve('node-red'));

describe('bandwidth-monitor Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "bandwidth-monitor", name: "test name" }];
        helper.load(bandwidthMonitorNode, flow, function () {
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
        var flow = [{ id: "n1", type: "bandwidth-monitor" }];
        helper.load(bandwidthMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('testUrl');
                n1.should.have.property('timeout');
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should measure bandwidth from a small real download', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "bandwidth-monitor", testUrl: "https://speed.cloudflare.com/__down?bytes=200000", timeout: 10000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(bandwidthMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                done(new Error("Expected success output, got failure: " + JSON.stringify(msg.payload)));
            });

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('testUrl', "https://speed.cloudflare.com/__down?bytes=200000");
                    msg.payload.should.have.property('bytesReceived');
                    msg.payload.bytesReceived.should.be.a.Number();
                    // Allow generous tolerance around the requested 200000 bytes
                    msg.payload.bytesReceived.should.be.above(50000);
                    msg.payload.should.have.property('elapsedSeconds');
                    msg.payload.elapsedSeconds.should.be.above(0);
                    msg.payload.should.have.property('mbps');
                    msg.payload.mbps.should.be.a.Number();
                    msg.payload.mbps.should.be.above(0);
                    msg.payload.should.have.property('timestamp');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({});
        });
    });

    it('should override testUrl and timeout via msg', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "bandwidth-monitor", testUrl: "", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(bandwidthMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                done(new Error("Expected success output, got failure: " + JSON.stringify(msg.payload)));
            });

            n2.on("input", function (msg) {
                try {
                    msg.payload.should.have.property('testUrl', "https://speed.cloudflare.com/__down?bytes=200000");
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ testUrl: "https://speed.cloudflare.com/__down?bytes=200000", timeout: 10000 });
        });
    });

    it('should fail with an invalid URL string', function (done) {
        var flow = [
            { id: "n1", type: "bandwidth-monitor", testUrl: "not a url", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(bandwidthMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.be.a.String();
                    msg.payload.should.have.property('testUrl', "not a url");
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({});
        });
    });

    it('should error when no test URL is provided', function (done) {
        var flow = [
            { id: "n1", type: "bandwidth-monitor", testUrl: "", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(bandwidthMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");

            var errorCaught = false;
            n1.on("call:error", function (call) {
                errorCaught = true;
                call.firstArg.should.equal("No test URL provided");
                done();
            });

            n1.receive({});

            setTimeout(() => {
                if (!errorCaught) {
                    done(new Error("Expected error was not caught"));
                }
            }, 1000);
        });
    });

    it('should handle timeout against an unreachable host', function (done) {
        this.timeout(5000);
        var flow = [
            { id: "n1", type: "bandwidth-monitor", testUrl: "http://10.255.255.1/test", timeout: 1000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(bandwidthMonitorNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('error');
                    msg.payload.should.have.property('testUrl', "http://10.255.255.1/test");
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({});
        });
    });

});
