const helper = require("node-red-node-test-helper");
const net = require("net");
const tcpPortCheckNode = require("../tcp-port-check.js");
const should = require("should");

helper.init(require.resolve('node-red'));

describe('tcp-port-check Node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        var flow = [{ id: "n1", type: "tcp-port-check", name: "test name" }];
        helper.load(tcpPortCheckNode, flow, function () {
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
        var flow = [{ id: "n1", type: "tcp-port-check" }];
        helper.load(tcpPortCheckNode, flow, function () {
            var n1 = helper.getNode("n1");
            try {
                n1.should.have.property('host');
                n1.should.have.property('ports', '80');
                n1.should.have.property('timeout', 3000);
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should detect an open port on a real server', function (done) {
        this.timeout(15000);
        var server = net.createServer(function (socket) {
            socket.end();
        });

        server.listen(0, '127.0.0.1', function () {
            var openPort = server.address().port;

            var flow = [
                { id: "n1", type: "tcp-port-check", host: "127.0.0.1", ports: String(openPort), timeout: 2000, wires: [["n2"], ["n3"]] },
                { id: "n2", type: "helper" },
                { id: "n3", type: "helper" }
            ];

            helper.load(tcpPortCheckNode, flow, function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.have.property('host', '127.0.0.1');
                        msg.payload.should.have.property('openPorts');
                        msg.payload.openPorts.should.containEql(openPort);
                        msg.payload.closedPorts.should.be.an.Array();
                        msg.payload.should.have.property('timestamp');
                        msg.payload.results.should.be.an.Array();
                        var result = msg.payload.results.find(r => r.port === openPort);
                        should.exist(result);
                        result.should.have.property('open', true);
                        result.should.have.property('responseTime');
                        result.responseTime.should.be.a.Number();
                        server.close(function () { done(); });
                    } catch(err) {
                        server.close(function () { done(err); });
                    }
                });

                n1.receive({});
            });
        });
    });

    it('should report a closed port as failure', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "tcp-port-check", host: "127.0.0.1", ports: "59999", timeout: 500, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tcpPortCheckNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('host', '127.0.0.1');
                    msg.payload.openPorts.should.eql([]);
                    msg.payload.closedPorts.should.containEql(59999);
                    var result = msg.payload.results.find(r => r.port === 59999);
                    should.exist(result);
                    result.should.have.property('open', false);
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({});
        });
    });

    it('should handle mixed open and closed ports, routing to success', function (done) {
        this.timeout(15000);
        var server = net.createServer(function (socket) {
            socket.end();
        });

        server.listen(0, '127.0.0.1', function () {
            var openPort = server.address().port;

            var flow = [
                { id: "n1", type: "tcp-port-check", host: "127.0.0.1", ports: openPort + ",59999", timeout: 800, wires: [["n2"], ["n3"]] },
                { id: "n2", type: "helper" },
                { id: "n3", type: "helper" }
            ];

            helper.load(tcpPortCheckNode, flow, function () {
                var n1 = helper.getNode("n1");
                var n2 = helper.getNode("n2");

                n2.on("input", function (msg) {
                    try {
                        msg.payload.openPorts.should.containEql(openPort);
                        msg.payload.closedPorts.should.containEql(59999);
                        msg.payload.results.should.have.length(2);
                        server.close(function () { done(); });
                    } catch(err) {
                        server.close(function () { done(err); });
                    }
                });

                n1.receive({});
            });
        });
    });

    it('should accept an array of ports via msg.ports', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "tcp-port-check", host: "127.0.0.1", timeout: 500, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tcpPortCheckNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.payload.results.should.have.length(1);
                    msg.payload.results[0].should.have.property('port', 59998);
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ ports: [59998] });
        });
    });

    it('should override host via msg.host', function (done) {
        this.timeout(15000);
        var flow = [
            { id: "n1", type: "tcp-port-check", host: "192.0.2.1", ports: "59999", timeout: 500, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tcpPortCheckNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n3 = helper.getNode("n3");

            n3.on("input", function (msg) {
                try {
                    msg.payload.should.have.property('host', '127.0.0.1');
                    done();
                } catch(err) {
                    done(err);
                }
            });

            n1.receive({ host: "127.0.0.1" });
        });
    });

    it('should error when no host is provided', function (done) {
        var flow = [
            { id: "n1", type: "tcp-port-check", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tcpPortCheckNode, flow, function () {
            var n1 = helper.getNode("n1");

            var errorCaught = false;
            n1.on("call:error", function (call) {
                errorCaught = true;
                call.firstArg.should.equal("No host provided");
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

    it('should error when no valid ports are provided', function (done) {
        var flow = [
            { id: "n1", type: "tcp-port-check", host: "127.0.0.1", ports: "abc,99999,0,-1", wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];

        helper.load(tcpPortCheckNode, flow, function () {
            var n1 = helper.getNode("n1");

            var errorCaught = false;
            n1.on("call:error", function (call) {
                errorCaught = true;
                call.firstArg.should.equal("No valid ports provided");
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

});
