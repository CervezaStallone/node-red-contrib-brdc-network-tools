module.exports = function(RED) {
    const ping = require('ping');

    function PingIPNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        // Store configuration
        node.ipAddress = config.ipAddress;
        node.timeout = config.timeout || 5000;
        node.name = config.name;        node.on('input', function(msg) {
            // Get IP address from input message first, then config
            var targetIP = msg.payload || msg.ip || node.ipAddress;
            
            if (!targetIP) {
                node.error("No IP address provided");
                return;
            }            // Validate IP address format (basic validation)
            var ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
            var ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
            var hostnameRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            
            if (!ipv4Regex.test(targetIP) && !ipv6Regex.test(targetIP) && !hostnameRegex.test(targetIP)) {
                node.error("Invalid IP address format: " + targetIP);
                return;
            }

            // Update node status
            node.status({fill: "yellow", shape: "dot", text: "pinging " + targetIP});

            // Ping configuration
            var pingConfig = {
                timeout: node.timeout / 1000, // Convert to seconds
                extra: ["-n", "1"] // Windows ping command for single ping
            };

            // Perform ping
            ping.promise.probe(targetIP, pingConfig)
                .then(function(result) {
                    var outputMsg = {
                        payload: {
                            host: result.host,
                            alive: result.alive,
                            time: result.time,
                            min: result.min,
                            max: result.max,
                            avg: result.avg,
                            packetLoss: result.packetLoss,
                            output: result.output
                        },
                        ip: targetIP,
                        timestamp: new Date().toISOString()
                    };

                    if (result.alive) {
                        node.status({fill: "green", shape: "dot", text: "alive (" + result.time + "ms)"});
                        node.send([outputMsg, null]); // Send to first output (success)
                    } else {
                        node.status({fill: "red", shape: "dot", text: "not reachable"});
                        node.send([null, outputMsg]); // Send to second output (failure)
                    }
                })
                .catch(function(error) {
                    node.error("Ping failed: " + error.message);
                    node.status({fill: "red", shape: "ring", text: "error"});
                    
                    var errorMsg = {
                        payload: {
                            error: error.message,
                            alive: false
                        },
                        ip: targetIP,
                        timestamp: new Date().toISOString()
                    };
                    
                    node.send([null, errorMsg]); // Send to second output (error)
                });
        });

        node.on('close', function() {
            node.status({});
        });
    }

    RED.nodes.registerType("ping-ip", PingIPNode);
};
