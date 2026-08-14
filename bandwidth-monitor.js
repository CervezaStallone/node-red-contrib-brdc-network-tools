module.exports = function(RED) {
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');

    function BandwidthMonitorNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Store configuration
        node.name = config.name;
        node.testUrl = (config.testUrl !== undefined && config.testUrl !== null) ? config.testUrl : 'https://speed.cloudflare.com/__down?bytes=10000000';
        node.timeout = config.timeout || 15000;

        node.on('input', function(msg) {
            // Get test URL from input message first, then config
            var testUrl = (msg.testUrl !== undefined && msg.testUrl !== null && msg.testUrl !== '') ? msg.testUrl : node.testUrl;
            var timeout = (msg.timeout !== undefined && msg.timeout !== null) ? msg.timeout : node.timeout;

            if (!testUrl) {
                node.error("No test URL provided", msg);
                return;
            }

            var parsedUrl;
            try {
                parsedUrl = new URL(testUrl);
            } catch (err) {
                node.status({fill: "red", shape: "ring", text: "invalid url"});
                var invalidMsg = Object.assign({}, msg, {
                    payload: {
                        error: err.message,
                        testUrl: testUrl
                    }
                });
                node.send([null, invalidMsg]);
                return;
            }

            var client = parsedUrl.protocol === 'http:' ? http : https;

            node.status({fill: "yellow", shape: "dot", text: "testing..."});

            var settled = false;
            var bytesReceived = 0;
            var startTime = Date.now();

            var req = client.get(parsedUrl, { timeout: timeout }, function(res) {
                if (settled) {
                    return;
                }

                if (res.statusCode < 200 || res.statusCode >= 300) {
                    settled = true;
                    var err = new Error("HTTP " + res.statusCode);
                    res.resume();
                    node.status({fill: "red", shape: "ring", text: "HTTP " + res.statusCode});
                    var failMsg = Object.assign({}, msg, {
                        payload: {
                            error: err.message,
                            testUrl: testUrl
                        }
                    });
                    node.send([null, failMsg]);
                    return;
                }

                res.on('data', function(chunk) {
                    bytesReceived += chunk.length;
                });

                res.on('end', function() {
                    if (settled) {
                        return;
                    }
                    settled = true;

                    var elapsedSeconds = (Date.now() - startTime) / 1000;
                    var mbps = (bytesReceived > 0 && elapsedSeconds > 0)
                        ? (bytesReceived * 8 / 1000000) / elapsedSeconds
                        : 0;

                    node.status({fill: "green", shape: "dot", text: mbps.toFixed(1) + " Mbps"});

                    var successMsg = Object.assign({}, msg, {
                        payload: {
                            testUrl: testUrl,
                            bytesReceived: bytesReceived,
                            elapsedSeconds: elapsedSeconds,
                            mbps: mbps,
                            timestamp: new Date().toISOString()
                        }
                    });
                    node.send([successMsg, null]);
                });

                res.on('error', function(err) {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    node.status({fill: "red", shape: "ring", text: "error"});
                    var errMsg = Object.assign({}, msg, {
                        payload: {
                            error: err.message,
                            testUrl: testUrl
                        }
                    });
                    node.send([null, errMsg]);
                });
            });

            req.on('timeout', function() {
                if (settled) {
                    return;
                }
                settled = true;
                var err = new Error("Request timed out");
                node.status({fill: "red", shape: "ring", text: "timeout"});
                var timeoutMsg = Object.assign({}, msg, {
                    payload: {
                        error: err.message,
                        testUrl: testUrl
                    }
                });
                node.send([null, timeoutMsg]);
                req.destroy();
            });

            req.on('error', function(err) {
                if (settled) {
                    return;
                }
                settled = true;
                node.status({fill: "red", shape: "ring", text: "error"});
                var errorMsg = Object.assign({}, msg, {
                    payload: {
                        error: err.message,
                        testUrl: testUrl
                    }
                });
                node.send([null, errorMsg]);
            });
        });

        node.on('close', function() {
            node.status({});
        });
    }

    RED.nodes.registerType("bandwidth-monitor", BandwidthMonitorNode);
};
