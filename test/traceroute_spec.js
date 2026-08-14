const helper = require("node-red-node-test-helper");
const tracerouteNode = require("../traceroute.js");
const should = require("should");

helper.init(require.resolve('node-red'));

describe('traceroute Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "traceroute", name: "test name" }];
        helper.load(tracerouteNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('name', 'test name');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should have default properties', function (done) {
        var flow = [{ id: "n1", type: "traceroute" }];
        helper.load(tracerouteNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('target');
                n1.should.have.property('maxHops', 30);
                n1.should.have.property('timeout', 30000);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should traceroute to 127.0.0.1 from config', function (done) {
        this.timeout(20000);
        var flow = [
            { id: "n1", type: "traceroute", target: "127.0.0.1", maxHops: 30, timeout: 30000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tracerouteNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('target', '127.0.0.1');
                    msg.payload.should.have.property('hops');
                    msg.payload.hops.should.be.an.Array();
                    msg.payload.hops.length.should.be.above(0);
                    msg.payload.hops[0].should.have.property('hop', 1);
                    msg.payload.should.have.property('raw');
                    msg.payload.should.have.property('timestamp');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "" });
        });
    });

    it('should traceroute using msg.payload override', function (done) {
        this.timeout(20000);
        var flow = [
            { id: "n1", type: "traceroute", target: "8.8.8.8", maxHops: 30, timeout: 30000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tracerouteNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.payload.should.have.property('target', '127.0.0.1');
                    msg.payload.hops[0].should.have.property('hop', 1);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "127.0.0.1" });
        });
    });

    it('should error when no target is provided', function (done) {
        var flow = [
            { id: "n1", type: "traceroute", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tracerouteNode, flow, function () {
            var n1 = helper.getNode("n1");

            var errorCaught = false;
            n1.on("call:error", function (call) {
                errorCaught = true;
                call.firstArg.should.equal("No target provided");
                done();
            });

            n1.receive({ payload: "" });

            setTimeout(() => {
                if (!errorCaught) {
                    done(new Error("Expected error was not caught"));
                }
            }, 1000);
        });
    });

    it('should send failure output when target cannot be resolved', function (done) {
        this.timeout(20000);
        var flow = [
            { id: "n1", type: "traceroute", target: "invalid.invalid.nonexistent", maxHops: 5, timeout: 10000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tracerouteNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('error');
                    msg.payload.should.have.property('target', 'invalid.invalid.nonexistent');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "" });
        });
    });

});
