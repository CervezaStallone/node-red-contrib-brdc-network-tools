module.exports = function(RED) {
    const dns = require('dns');

    function DNSLookupNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Store configuration
        node.hostname = config.hostname;
        node.recordType = config.recordType || 'A';
        node.timeout = config.timeout || 5000;
        node.name = config.name;

        node.on('input', function(msg) {
            // Get target hostname/IP from msg.payload first, then config
            var target;
            if (msg.payload) {
                target = String(msg.payload);
            } else {
                target = node.hostname;
            }

            if (!target) {
                node.error("No hostname/IP provided", msg);
                return;
            }

            // Get record type from msg, then config, then default
            var recordType = (msg.recordType || node.recordType || 'A').toString().toUpperCase();

            // Get timeout from msg, then config, then default
            var timeout = msg.timeout || node.timeout || 5000;

            node.status({fill: "yellow", shape: "dot", text: "resolving " + target});

            var settled = false;

            var timer = setTimeout(function() {
                if (settled) {
                    return;
                }
                settled = true;

                node.status({fill: "red", shape: "ring", text: "timeout"});

                var timeoutErr = new Error("DNS lookup timed out");
                var errorMsg = Object.assign({}, msg, {
                    payload: {
                        error: timeoutErr.message,
                        code: timeoutErr.code,
                        target: target,
                        recordType: recordType
                    },
                    target: target
                });

                node.send([null, errorMsg]);
            }, timeout);

            function handleResult(err, result) {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);

                if (err) {
                    node.status({fill: "red", shape: "dot", text: "error"});

                    var errorMsg = Object.assign({}, msg, {
                        payload: {
                            error: err.message,
                            code: err.code,
                            target: target,
                            recordType: recordType
                        },
                        target: target
                    });

                    node.send([null, errorMsg]);
                    return;
                }

                node.status({fill: "green", shape: "dot", text: recordType + " resolved"});

                var successMsg = Object.assign({}, msg, {
                    payload: {
                        records: result,
                        target: target,
                        recordType: recordType,
                        timestamp: new Date().toISOString()
                    },
                    target: target
                });

                node.send([successMsg, null]);
            }

            if (recordType === 'PTR') {
                dns.reverse(target, handleResult);
            } else {
                dns.resolve(target, recordType, handleResult);
            }
        });

        node.on('close', function() {
            node.status({});
        });
    }

    RED.nodes.registerType("dns-lookup", DNSLookupNode);
};
