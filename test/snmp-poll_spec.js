const helper = require("node-red-node-test-helper");
const snmpPollNode = require("../snmp-poll.js");
const should = require("should");
const sinon = require("sinon");

helper.init(require.resolve('node-red'));

describe('snmp-poll Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "snmp-poll", name: "test name" }];
        helper.load(snmpPollNode, flow, function () {
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
        var flow = [{ id: "n1", type: "snmp-poll" }];
        helper.load(snmpPollNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('host');
                n1.should.have.property('community', 'public');
                n1.should.have.property('oids', '1.3.6.1.2.1.1.1.0');
                n1.should.have.property('version', '2c');
                n1.should.have.property('timeout', 5000);
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should hit the failure output on timeout/unreachable host', function (done) {
        this.timeout(5000);
        var flow = [
            { id: "n1", type: "snmp-poll", host: "192.0.2.1", community: "public", oids: "1.3.6.1.2.1.1.1.0", timeout: 1000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(snmpPollNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('error');
                    msg.payload.should.have.property('host', '192.0.2.1');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({});
        });
    });

    it('should error when no host is provided', function (done) {
        var flow = [
            { id: "n1", type: "snmp-poll", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(snmpPollNode, flow, function () {
            var n1 = helper.getNode("n1");

            var errorCaught = false;
            n1.on("call:error", function (call) {
                errorCaught = true;
                call.firstArg.should.equal("No host provided");
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

    it('should allow msg.host, msg.community, msg.oids, msg.timeout to override config', function (done) {
        this.timeout(3000);
        var flow = [
            { id: "n1", type: "snmp-poll", host: "10.255.255.1", community: "public", oids: "1.3.6.1.2.1.1.1.0", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(snmpPollNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('host', '192.0.2.1');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ host: "192.0.2.1", timeout: 1000 });
        });
    });

});
