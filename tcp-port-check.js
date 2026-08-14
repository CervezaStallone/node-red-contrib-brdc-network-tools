module.exports = function(RED) {
    const net = require('net');

    function TcpPortCheckNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Store configuration
        node.name = config.name;
        node.host = config.host;
        node.ports = config.ports || "80";
        node.timeout = config.timeout || 3000;

        node.on('input', function(msg) {
            var host = msg.host || node.host;
            var portsInput = msg.ports || node.ports;
            var timeout = msg.timeout || node.timeout;

            if (!host || String(host).trim() === '') {
                node.error("No host provided", msg);
                return;
            }

            var ports = parsePorts(portsInput);

            if (ports.length === 0) {
                node.error("No valid ports provided", msg);
                return;
            }

            node.status({fill: "yellow", shape: "dot", text: "checking " + host});

            checkPorts(host, ports, timeout).then(function(results) {
                var openPorts = results.filter(r => r.open).map(r => r.port);
                var closedPorts = results.filter(r => !r.open).map(r => r.port);

                var payload = {
                    host: host,
                    results: results,
                    openPorts: openPorts,
                    closedPorts: closedPorts,
                    timestamp: new Date().toISOString()
                };

                var outputMsg = RED.util.cloneMessage(msg);
                outputMsg.payload = payload;

                if (openPorts.length > 0) {
                    node.status({fill: "green", shape: "dot", text: openPorts.length + "/" + results.length + " open"});
                    node.send([outputMsg, null]);
                } else {
                    node.status({fill: "red", shape: "dot", text: "all closed"});
                    node.send([null, outputMsg]);
                }
            }).catch(function(error) {
                node.error("TCP port check failed: " + error.message, msg);
                node.status({fill: "red", shape: "ring", text: "error"});
            });
        });

        function parsePorts(portsInput) {
            var rawPorts;
            if (Array.isArray(portsInput)) {
                rawPorts = portsInput;
            } else {
                rawPorts = String(portsInput).split(',').map(p => p.trim());
            }

            var ports = [];
            rawPorts.forEach(function(p) {
                var portNum = parseInt(p, 10);
                if (!isNaN(portNum) && portNum >= 1 && portNum <= 65535) {
                    ports.push(portNum);
                }
            });

            return ports;
        }

        function checkPorts(host, ports, timeout) {
            var portPromises = ports.map(port => testPort(host, port, timeout));
            return Promise.all(portPromises);
        }

        function testPort(host, port, timeout) {
            return new Promise((resolve) => {
                var socket = new net.Socket();
                var startTime = Date.now();
                var settled = false;

                var timer = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    socket.destroy();
                    resolve({ port: port, open: false, error: 'timeout' });
                }, timeout);

                socket.connect(port, host, () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    var responseTime = Date.now() - startTime;
                    socket.destroy();
                    resolve({ port: port, open: true, responseTime: responseTime });
                });

                socket.on('error', (err) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    socket.destroy();
                    resolve({ port: port, open: false, error: err.message });
                });
            });
        }

        node.on('close', function() {
            node.status({});
        });
    }

    RED.nodes.registerType("tcp-port-check", TcpPortCheckNode);
};
