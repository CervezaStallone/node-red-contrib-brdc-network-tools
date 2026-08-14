const helper = require("node-red-node-test-helper");
const dnsLookupNode = require("../dns-lookup.js");
const should = require("should");
const sinon = require("sinon");

helper.init(require.resolve('node-red'));

describe('dns-lookup Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "dns-lookup", name: "test name" }];
        helper.load(dnsLookupNode, flow, function () {
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
        var flow = [{ id: "n1", type: "dns-lookup" }];
        helper.load(dnsLookupNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('hostname');
                n1.should.have.property('recordType', 'A');
                n1.should.have.property('timeout', 5000);
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should resolve an A record for google.com', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "dns-lookup", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(dnsLookupNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('records');
                    msg.payload.records.should.be.an.Array();
                    msg.payload.records.length.should.be.above(0);
                    msg.payload.should.have.property('target', 'google.com');
                    msg.payload.should.have.property('recordType', 'A');
                    msg.payload.should.have.property('timestamp');
                    msg.should.have.property('target', 'google.com');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "google.com" });
        });
    });

    it('should perform a reverse (PTR) lookup for 8.8.8.8', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "dns-lookup", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(dnsLookupNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('records');
                    msg.payload.records.should.be.an.Array();
                    msg.payload.records.length.should.be.above(0);
                    msg.payload.should.have.property('target', '8.8.8.8');
                    msg.payload.should.have.property('recordType', 'PTR');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "8.8.8.8", recordType: "ptr" });
        });
    });

    it('should hit the failure output for a bogus hostname', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "dns-lookup", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(dnsLookupNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('error');
                    msg.payload.should.have.property('target', 'this-domain-does-not-exist-xyz123.invalid');
                    msg.payload.should.have.property('recordType', 'A');
                    msg.should.have.property('target', 'this-domain-does-not-exist-xyz123.invalid');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "this-domain-does-not-exist-xyz123.invalid" });
        });
    });

    it('should error when no hostname is provided', function (done) {
        var flow = [
            { id: "n1", type: "dns-lookup", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(dnsLookupNode, flow, function () {
            var n1 = helper.getNode("n1");

            var errorCaught = false;
            n1.on("call:error", function (call) {
                errorCaught = true;
                call.firstArg.should.equal("No hostname/IP provided");
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

    it('should use configured hostname when msg.payload is not provided', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "dns-lookup", hostname: "google.com", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(dnsLookupNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    msg.payload.should.have.property('target', 'google.com');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ payload: "" });
        });
    });

    it('should time out when the lookup takes too long', function (done) {
        this.timeout(15000);
        var dns = require('dns');
        var stub = sinon.stub(dns, 'resolve').callsFake(function() {
            // never call back - simulate a hang
        });

        var flow = [
            { id: "n1", type: "dns-lookup", timeout: 200, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(dnsLookupNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.match(/timed out/i);
                    stub.restore();
                    done();
                } catch(err) {
                    stub.restore();
                    done(err);
                }
            });

            n1.receive({ payload: "google.com" });
        });
    });

});
