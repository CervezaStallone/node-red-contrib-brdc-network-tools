module.exports = function(RED) {
    const ping = require('ping');

    function EnhancedPingNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        // Store configuration
        node.ipAddress = config.ipAddress;
        node.timeout = config.timeout || 5000;
        node.interval = config.interval || 0; // Continuous ping interval (0 = single ping)
        node.count = config.count || 1;
        node.size = config.size || 32; // Packet size
        node.retries = config.retries || 0;
        node.name = config.name;
        
        var intervalId = null;
        var pingHistory = [];
        var maxHistorySize = 100;        node.on('input', function(msg) {
            // Handle control commands first
            if (msg.command === 'stop' && intervalId) {
                clearInterval(intervalId);
                intervalId = null;
                node.status({fill: "grey", shape: "ring", text: "stopped"});
                return;
            }
            
            if (msg.command === 'clear-history') {
                pingHistory = [];
                node.status({fill: "blue", shape: "dot", text: "history cleared"});
                return;
            }
            
            if (msg.command === 'get-history') {
                var historyOutput = {
                    payload: pingHistory,
                    command: 'history-data',
                    timestamp: new Date().toISOString()
                };
                node.send([historyOutput, null]);
                return;
            }

            // Stop any existing interval
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }

            // Get configuration from message or node config
            var targetIP = msg.payload || msg.ip || node.ipAddress;
            var pingCount = msg.count || node.count;
            var pingInterval = msg.interval || node.interval;
            var timeout = msg.timeout || node.timeout;
            var packetSize = msg.size || node.size;
            var maxRetries = msg.retries || node.retries;
            
            if (!targetIP) {
                node.error("No IP address provided", msg);
                return;
            }

            // Enhanced validation
            if (!isValidTarget(targetIP)) {
                node.error("Invalid IP address or hostname format: " + targetIP, msg);
                return;
            }

            // Single ping or continuous ping
            if (pingInterval > 0) {
                startContinuousPing(targetIP, pingInterval, timeout, packetSize, maxRetries, msg);
            } else {
                performPingSequence(targetIP, pingCount, timeout, packetSize, maxRetries, msg);
            }
        });

        function isValidTarget(target) {
            var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            var ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}$/;
            var hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            
            return ipv4Regex.test(target) || ipv6Regex.test(target) || hostnameRegex.test(target);
        }

        function startContinuousPing(targetIP, interval, timeout, packetSize, maxRetries, originalMsg) {
            node.status({fill: "blue", shape: "dot", text: "continuous ping " + targetIP});
            
            intervalId = setInterval(() => {
                performSinglePing(targetIP, timeout, packetSize, maxRetries, originalMsg, true);
            }, interval);

            // Send initial ping immediately
            performSinglePing(targetIP, timeout, packetSize, maxRetries, originalMsg, true);
        }

        function performPingSequence(targetIP, count, timeout, packetSize, maxRetries, originalMsg) {
            var results = [];
            var completed = 0;

            node.status({fill: "yellow", shape: "dot", text: `pinging ${targetIP} (${count}x)`});

            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    performSinglePing(targetIP, timeout, packetSize, maxRetries, originalMsg, false, (result) => {
                        results.push(result);
                        completed++;

                        if (completed === count) {
                            // Send aggregated results
                            sendAggregatedResults(targetIP, results, originalMsg);
                        }
                    });
                }, i * 100); // Space out pings by 100ms
            }
        }

        function performSinglePing(targetIP, timeout, packetSize, maxRetries, originalMsg, isContinuous, callback) {
            var attempt = 0;
            
            function attemptPing() {
                var pingConfig = {
                    timeout: timeout / 1000,
                    extra: process.platform === 'win32' ? 
                        ["-n", "1", "-l", packetSize.toString()] : 
                        ["-c", "1", "-s", packetSize.toString()]
                };

                ping.promise.probe(targetIP, pingConfig)
                    .then(function(result) {
                        var timestamp = new Date().toISOString();
                        var pingResult = {
                            host: result.host,
                            alive: result.alive,
                            time: result.time,
                            min: result.min,
                            max: result.max,
                            avg: result.avg,
                            packetLoss: result.packetLoss,
                            output: result.output,
                            packetSize: packetSize,
                            attempt: attempt + 1,
                            timestamp: timestamp
                        };                        // Add to history
                        addToHistory(targetIP, pingResult);

                        // Create statistics for single ping (especially for continuous mode)
                        var statistics = {
                            host: targetIP,
                            totalPings: 1,
                            successfulPings: result.alive ? 1 : 0,
                            failedPings: result.alive ? 0 : 1,
                            successRate: result.alive ? 100 : 0,
                            averageTime: result.alive ? parseFloat(result.time || 0) : 0,
                            minResponseTime: result.alive ? parseFloat(result.time || 0) : 0,
                            maxResponseTime: result.alive ? parseFloat(result.time || 0) : 0,
                            jitter: 0, // Single ping has no jitter
                            timestamp: timestamp
                        };

                        var outputMsg = {
                            ...originalMsg,
                            payload: {
                                statistics: statistics,
                                pingResult: pingResult,
                                target: targetIP,
                                timestamp: timestamp
                            },
                            ip: targetIP,
                            timestamp: timestamp,
                            history: isContinuous ? getRecentHistory(targetIP, 10) : undefined
                        };                        if (result.alive) {
                            if (!isContinuous) {
                                node.status({fill: "green", shape: "dot", text: `alive (${result.time}ms)`});
                            }
                            
                            // Only send messages directly for continuous mode
                            if (isContinuous) {
                                node.send([outputMsg, null]);
                            }                        } else {
                            if (attempt < maxRetries) {
                                attempt++;
                                setTimeout(attemptPing, 500); // Reduced retry delay from 1000ms to 500ms
                                return;
                            }
                            
                            if (!isContinuous) {
                                node.status({fill: "red", shape: "dot", text: "not reachable"});
                            }
                            
                            // Only send messages directly for continuous mode
                            if (isContinuous) {
                                node.send([null, outputMsg]);
                            }
                        }

                        if (callback) callback(pingResult);
                    })                    .catch(function(error) {
                        if (attempt < maxRetries) {
                            attempt++;
                            setTimeout(attemptPing, 500); // Reduced retry delay from 1000ms to 500ms
                            return;
                        }node.error("Ping failed: " + error.message, originalMsg);
                        if (!isContinuous) {
                            node.status({fill: "red", shape: "ring", text: "error"});
                        }
                        
                        var errorTimestamp = new Date().toISOString();
                        var errorStatistics = {
                            host: targetIP,
                            totalPings: 1,
                            successfulPings: 0,
                            failedPings: 1,
                            successRate: 0,
                            averageTime: 0,
                            minResponseTime: 0,
                            maxResponseTime: 0,
                            jitter: 0,
                            timestamp: errorTimestamp
                        };
                        
                        var errorMsg = {
                            ...originalMsg,
                            payload: {
                                statistics: errorStatistics,
                                error: error.message,
                                alive: false,
                                attempt: attempt + 1,
                                timestamp: errorTimestamp
                            },
                            ip: targetIP,
                            timestamp: errorTimestamp
                        };                        
                        // Only send messages directly for continuous mode
                        if (isContinuous) {
                            node.send([null, errorMsg]);
                        }
                        if (callback) callback(errorMsg.payload);
                    });
            }

            attemptPing();
        }        function sendAggregatedResults(targetIP, results, originalMsg) {
            var alive = results.filter(r => r.alive);
            var dead = results.filter(r => !r.alive);
            
            var statistics = {
                host: targetIP,
                totalPings: results.length,
                successfulPings: alive.length,
                failedPings: dead.length,
                successRate: (alive.length / results.length) * 100,
                averageTime: alive.length > 0 ? alive.reduce((sum, r) => sum + parseFloat(r.time || 0), 0) / alive.length : 0,
                minResponseTime: alive.length > 0 ? Math.min(...alive.map(r => parseFloat(r.time || 0))) : 0,
                maxResponseTime: alive.length > 0 ? Math.max(...alive.map(r => parseFloat(r.time || 0))) : 0,
                jitter: calculateJitter(alive),
                results: results,
                timestamp: new Date().toISOString()
            };

            var outputMsg = {
                ...originalMsg,
                payload: {
                    statistics: statistics,
                    target: targetIP,
                    timestamp: statistics.timestamp
                },
                ip: targetIP,
                timestamp: statistics.timestamp
            };

            if (statistics.successRate > 50) {
                node.status({fill: "green", shape: "dot", text: `${statistics.successRate.toFixed(1)}% success`});
                node.send([outputMsg, null]);
            } else {
                node.status({fill: "red", shape: "dot", text: `${statistics.successRate.toFixed(1)}% success`});
                node.send([null, outputMsg]);
            }
        }

        function calculateJitter(aliveResults) {
            if (aliveResults.length < 2) return 0;
            
            var times = aliveResults.map(r => parseFloat(r.time || 0));
            var deltas = [];
            
            for (let i = 1; i < times.length; i++) {
                deltas.push(Math.abs(times[i] - times[i-1]));
            }
            
            return deltas.length > 0 ? deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length : 0;
        }

        function addToHistory(ip, result) {
            if (!pingHistory[ip]) {
                pingHistory[ip] = [];
            }
            
            pingHistory[ip].push(result);
            
            if (pingHistory[ip].length > maxHistorySize) {
                pingHistory[ip].shift();
            }
        }        function getRecentHistory(ip, count) {
            if (!pingHistory[ip]) return [];
            return pingHistory[ip].slice(-count);
        }

        node.on('close', function() {
            if (intervalId) {
                clearInterval(intervalId);
            }
            node.status({});
        });
    }

    RED.nodes.registerType("enhanced-ping", EnhancedPingNode);
};
