module.exports = function(RED) {
    const { exec } = require('child_process');

    function TracerouteNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Store configuration
        node.name = config.name;
        node.target = config.target;
        node.maxHops = config.maxHops || 30;
        node.timeout = config.timeout || 30000;

        node.on('input', function(msg) {
            // msg.payload overrides node.target if truthy
            var target = msg.payload ? String(msg.payload) : node.target;
            var maxHops = msg.maxHops || node.maxHops;

            if (!target) {
                node.error("No target provided", msg);
                return;
            }

            node.status({fill: "yellow", shape: "dot", text: "tracing " + target});

            var isWindows = process.platform === 'win32';
            var command = isWindows
                ? `tracert -h ${maxHops} -w 2000 ${target}`
                : `traceroute -m ${maxHops} -w 2 -q 1 ${target}`;

            exec(command, { timeout: node.timeout }, function(error, stdout, stderr) {
                if (error && (!stdout || stdout.length === 0)) {
                    node.status({fill: "red", shape: "ring", text: "error"});

                    var errorMsg = Object.assign({}, msg, {
                        payload: {
                            error: error.message,
                            target: target
                        }
                    });

                    node.send([null, errorMsg]);
                    return;
                }

                // Even if `error` is set, stdout may contain a partial route
                // (traceroute/tracert often exit non-zero on incomplete routes)
                var hops = parseTraceroute(stdout);

                node.status({fill: "green", shape: "dot", text: hops.length + " hops"});

                var outputMsg = Object.assign({}, msg, {
                    payload: {
                        target: target,
                        hops: hops,
                        raw: stdout,
                        timestamp: new Date().toISOString()
                    }
                });

                node.send([outputMsg, null]);
            });
        });

        function parseTraceroute(stdout) {
            var hops = [];
            var lines = stdout.split('\n');

            lines.forEach(function(line) {
                var hopMatch = line.match(/^\s*(\d+)\s+/);
                if (!hopMatch) {
                    return;
                }

                var hopNumber = parseInt(hopMatch[1], 10);

                var ipMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
                var ip = ipMatch ? ipMatch[1] : null;

                var timeMatches = line.match(/(\d+(?:\.\d+)?)\s*ms/g) || [];
                var times = timeMatches.map(function(match) {
                    return parseFloat(match);
                });

                var timeout = line.indexOf('*') !== -1;

                hops.push({
                    hop: hopNumber,
                    ip: ip,
                    times: times,
                    timeout: timeout
                });
            });

            return hops;
        }

        node.on('close', function() {
            node.status({});
        });
    }

    RED.nodes.registerType("traceroute", TracerouteNode);
};
