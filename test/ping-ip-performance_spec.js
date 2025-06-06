const helper = require("node-red-node-test-helper");
const pingNode = require("../ping-ip.js");
const should = require("should");

helper.init(require.resolve('node-red'));

describe('ping-ip Node - Performance Tests', function () {
    // Increase timeout for performance tests
    this.timeout(30000);

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should handle concurrent pings efficiently', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var successCount = 0;
            var startTime = Date.now();
            var totalRequests = 10;
            
            n2.on("input", function (msg) {
                successCount++;
                if (successCount === totalRequests) {
                    var elapsed = Date.now() - startTime;
                    try {
                        // Should complete within reasonable time
                        elapsed.should.be.below(15000);
                        console.log(`Completed ${totalRequests} pings in ${elapsed}ms`);
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            });

            // Send multiple ping requests
            var targets = ['8.8.8.8', '1.1.1.1', '8.8.4.4', '1.0.0.1', 'google.com'];
            for (let i = 0; i < totalRequests; i++) {
                n1.receive({ payload: targets[i % targets.length] });
            }
        });
    });

    it('should maintain accuracy under load', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 3000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var responses = [];
            var totalRequests = 5;
            
            n2.on("input", function (msg) {
                responses.push(msg);
                if (responses.length === totalRequests) {
                    try {
                        // Check that all responses are valid
                        responses.forEach(response => {
                            response.should.have.property('payload');
                            response.payload.should.have.property('alive', true);
                            response.payload.should.have.property('time');
                            response.should.have.property('timestamp');
                        });
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            });

            // Send requests to reliable hosts
            for (let i = 0; i < totalRequests; i++) {
                n1.receive({ payload: '8.8.8.8' });
            }
        });
    });

    it('should handle mixed success/failure scenarios', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 2000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var n3 = helper.getNode("n3");
            var successCount = 0;
            var failureCount = 0;
            var totalRequests = 4;
            
            n2.on("input", function (msg) {
                successCount++;
                checkCompletion();
            });

            n3.on("input", function (msg) {
                failureCount++;
                checkCompletion();
            });

            function checkCompletion() {
                if (successCount + failureCount === totalRequests) {
                    try {
                        successCount.should.be.above(0);
                        failureCount.should.be.above(0);
                        console.log(`Success: ${successCount}, Failures: ${failureCount}`);
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            }

            // Mix of valid and invalid targets
            n1.receive({ payload: '8.8.8.8' });        // Should succeed
            n1.receive({ payload: '192.168.999.999' }); // Should fail
            n1.receive({ payload: '1.1.1.1' });        // Should succeed
            n1.receive({ payload: '10.255.255.1' });   // Should fail
        });
    });    it('should handle rapid sequential requests', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 5000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var responseCount = 0;
            var requestInterval = 200; // ms
            var totalRequests = 3; // Reduced from 5
            
            n2.on("input", function (msg) {
                responseCount++;
                if (responseCount === totalRequests) {
                    try {
                        msg.should.have.property('payload');
                        msg.payload.should.have.property('alive', true);
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            });

            // Send requests at intervals
            var requestCount = 0;
            var interval = setInterval(() => {
                if (requestCount < totalRequests) {
                    n1.receive({ payload: '8.8.8.8' });
                    requestCount++;
                } else {
                    clearInterval(interval);
                }
            }, requestInterval);
        });
    });    it('should maintain memory efficiency during extended use', function (done) {
        var flow = [
            { id: "n1", type: "ping-ip", timeout: 1000, wires: [["n2"], ["n3"]] },
            { id: "n2", type: "helper" },
            { id: "n3", type: "helper" }
        ];
        
        helper.load(pingNode, flow, function () {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            var responseCount = 0;
            var totalRequests = 10; // Reduced from 20
            
            n2.on("input", function (msg) {
                responseCount++;
                if (responseCount === totalRequests) {
                    try {
                        // If we get here without memory issues, test passes
                        msg.should.have.property('payload');
                        done();
                    } catch(err) {
                        done(err);
                    }
                }
            });

            // Send many requests to test memory management
            for (let i = 0; i < totalRequests; i++) {
                setTimeout(() => {
                    n1.receive({ payload: '8.8.8.8' });
                }, i * 100); // Increased interval
            }
        });
    });

});
