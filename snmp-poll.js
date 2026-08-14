module.exports = function(RED) {
    const snmp = require('net-snmp');

    function SnmpPollNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Store configuration
        node.name = config.name;
        node.host = config.host;
        node.community = config.community || 'public';
        node.oids = config.oids || '1.3.6.1.2.1.1.1.0';
        node.version = config.version || '2c';
        node.timeout = config.timeout || 5000;

        node.on('input', function(msg) {
            // Resolve overrides: msg wins over node config
            var host = (msg.host !== undefined && msg.host !== null && msg.host !== '') ? msg.host : node.host;
            var community = (msg.community !== undefined && msg.community !== null && msg.community !== '') ? msg.community : node.community;
            var oids = (msg.oids !== undefined && msg.oids !== null && msg.oids !== '') ? msg.oids : node.oids;
            var version = (msg.version !== undefined && msg.version !== null && msg.version !== '') ? msg.version : node.version;
            var timeout = (msg.timeout !== undefined && msg.timeout !== null && msg.timeout !== '') ? msg.timeout : node.timeout;

            if (!host) {
                node.error("No host provided", msg);
                return;
            }

            var oidsArray = String(oids).split(',').map(function(o) { return o.trim(); }).filter(function(o) { return o.length > 0; });

            node.status({fill: "yellow", shape: "dot", text: "polling " + host});

            var options = {
                timeout: timeout,
                version: version === '1' ? snmp.Version1 : snmp.Version2c
            };

            var session = snmp.createSession(host, community, options);

            session.get(oidsArray, function(error, varbinds) {
                if (error) {
                    node.status({fill: "red", shape: "dot", text: "error"});
                    node.error("SNMP poll failed: " + error.message, msg);

                    var errorMsg = Object.assign({}, msg, {
                        payload: {
                            error: error.message,
                            host: host
                        }
                    });

                    session.close();
                    node.send([null, errorMsg]);
                    return;
                }

                var results = [];
                var errors = [];

                for (var i = 0; i < varbinds.length; i++) {
                    var vb = varbinds[i];
                    if (snmp.isVarbindError(vb)) {
                        errors.push(snmp.varbindError(vb));
                    } else {
                        var value = vb.value;
                        if (Buffer.isBuffer(value)) {
                            value = value.toString();
                        }
                        results.push({
                            oid: vb.oid,
                            value: value,
                            type: vb.type
                        });
                    }
                }

                node.status({fill: "green", shape: "dot", text: results.length + " OIDs"});

                var successMsg = Object.assign({}, msg, {
                    payload: {
                        host: host,
                        results: results,
                        errors: errors,
                        timestamp: new Date().toISOString()
                    }
                });

                session.close();
                node.send([successMsg, null]);
            });
        });

        node.on('close', function() {
            node.status({});
        });
    }

    RED.nodes.registerType("snmp-poll", SnmpPollNode);
};
