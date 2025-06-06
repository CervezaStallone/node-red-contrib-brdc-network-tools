module.exports = function(RED) {
    const ping = require('ping');

    function NetworkPerformanceMonitorNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        // Configuration
        node.targets = config.targets || [];
        node.interval = config.interval || 60000; // Default 1 minute
        node.timeout = config.timeout || 5000;
        node.historyLimit = config.historyLimit || 100;
        node.thresholds = {
            latency: config.latencyThreshold || 100,
            packetLoss: config.packetLossThreshold || 5,
            availability: config.availabilityThreshold || 95
        };
        
        var monitoringInterval = null;
        var performanceData = {};
        var alertHistory = [];

        node.on('input', function(msg) {
            // Handle control commands
            if (msg.command === 'start') {
                startMonitoring(msg);
                return;
            }
            
            if (msg.command === 'stop') {
                stopMonitoring();
                return;
            }
            
            if (msg.command === 'get-report') {
                generateReport(msg);
                return;
            }
            
            if (msg.command === 'clear-data') {
                clearPerformanceData();
                return;
            }
            
            if (msg.command === 'add-target') {
                addTarget(msg.target);
                return;
            }
            
            if (msg.command === 'remove-target') {
                removeTarget(msg.target);
                return;
            }

            // Default behavior - perform single measurement
            var targets = msg.targets || node.targets;
            if (targets.length === 0) {
                node.error("No targets specified", msg);
                return;
            }

            performMeasurement(targets, msg);
        });

        function startMonitoring(msg) {
            if (monitoringInterval) {
                node.warn("Monitoring already active");
                return;
            }

            var targets = msg.targets || node.targets;
            var interval = msg.interval || node.interval;

            if (targets.length === 0) {
                node.error("No targets specified for monitoring", msg);
                return;
            }

            monitoringInterval = setInterval(() => {
                performMeasurement(targets);
            }, interval);

            node.status({fill: "green", shape: "dot", text: `monitoring ${targets.length} targets`});
            
            // Perform initial measurement
            performMeasurement(targets, msg);
        }

        function stopMonitoring() {
            if (monitoringInterval) {
                clearInterval(monitoringInterval);
                monitoringInterval = null;
                node.status({fill: "grey", shape: "ring", text: "stopped"});
            }
        }

        async function performMeasurement(targets, originalMsg) {
            try {
                var timestamp = new Date().toISOString();
                var measurements = [];

                // Ping all targets concurrently
                var pingPromises = targets.map(async (target) => {
                    try {
                        var result = await pingTarget(target);
                        var measurement = {
                            target: target,
                            timestamp: timestamp,
                            alive: result.alive,
                            latency: result.time || null,
                            packetLoss: result.packetLoss || 0
                        };

                        // Store in performance data
                        if (!performanceData[target]) {
                            performanceData[target] = [];
                        }
                        
                        performanceData[target].push(measurement);
                        
                        // Limit history size
                        if (performanceData[target].length > node.historyLimit) {
                            performanceData[target].shift();
                        }

                        // Check thresholds and generate alerts
                        checkThresholds(target, measurement);

                        measurements.push(measurement);
                        return measurement;
                    } catch (error) {
                        var errorMeasurement = {
                            target: target,
                            timestamp: timestamp,
                            alive: false,
                            error: error.message,
                            latency: null,
                            packetLoss: 100
                        };
                        
                        measurements.push(errorMeasurement);
                        return errorMeasurement;
                    }
                });

                var results = await Promise.all(pingPromises);
                
                // Calculate aggregate statistics
                var aggregateStats = calculateAggregateStats(results);
                
                var outputMsg = {
                    payload: {
                        timestamp: timestamp,
                        measurements: measurements,
                        aggregate: aggregateStats,
                        alerts: getRecentAlerts(5)
                    },
                    topic: 'network-performance'
                };

                if (originalMsg) {
                    outputMsg = { ...originalMsg, ...outputMsg };
                }

                // Update status with summary
                var aliveCount = results.filter(r => r.alive).length;
                var avgLatency = aggregateStats.averageLatency;
                node.status({
                    fill: aliveCount === results.length ? "green" : "yellow",
                    shape: "dot",
                    text: `${aliveCount}/${results.length} up, ${avgLatency}ms avg`
                });

                node.send([outputMsg, null]);

            } catch (error) {
                node.error("Performance measurement failed: " + error.message);
                node.status({fill: "red", shape: "ring", text: "error"});
            }
        }

        async function pingTarget(target) {
            var config = {
                timeout: node.timeout / 1000,
                extra: ["-n", "1"]
            };
            
            return await ping.promise.probe(target, config);
        }

        function calculateAggregateStats(measurements) {
            var alive = measurements.filter(m => m.alive);
            var latencies = alive.map(m => m.latency).filter(l => l !== null);
            
            return {
                totalTargets: measurements.length,
                aliveTargets: alive.length,
                downTargets: measurements.length - alive.length,
                availabilityPercent: (alive.length / measurements.length) * 100,
                averageLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
                minLatency: latencies.length > 0 ? Math.min(...latencies) : null,
                maxLatency: latencies.length > 0 ? Math.max(...latencies) : null,
                packetLossPercent: measurements.reduce((sum, m) => sum + (m.packetLoss || 0), 0) / measurements.length
            };
        }

        function checkThresholds(target, measurement) {
            var alerts = [];

            // Check latency threshold
            if (measurement.alive && measurement.latency > node.thresholds.latency) {
                alerts.push({
                    type: 'latency',
                    target: target,
                    value: measurement.latency,
                    threshold: node.thresholds.latency,
                    timestamp: measurement.timestamp,
                    severity: measurement.latency > node.thresholds.latency * 2 ? 'critical' : 'warning'
                });
            }

            // Check availability
            if (!measurement.alive) {
                alerts.push({
                    type: 'availability',
                    target: target,
                    value: 0,
                    threshold: 100,
                    timestamp: measurement.timestamp,
                    severity: 'critical'
                });
            }

            // Check packet loss
            if (measurement.packetLoss > node.thresholds.packetLoss) {
                alerts.push({
                    type: 'packet_loss',
                    target: target,
                    value: measurement.packetLoss,
                    threshold: node.thresholds.packetLoss,
                    timestamp: measurement.timestamp,
                    severity: measurement.packetLoss > node.thresholds.packetLoss * 2 ? 'critical' : 'warning'
                });
            }

            // Store alerts
            alertHistory.push(...alerts);
            
            // Limit alert history
            if (alertHistory.length > 1000) {
                alertHistory = alertHistory.slice(-500);
            }

            // Send alert messages if any
            if (alerts.length > 0) {
                var alertMsg = {
                    payload: alerts,
                    topic: 'network-alerts',
                    timestamp: measurement.timestamp
                };
                node.send([null, alertMsg]);
            }
        }

        function generateReport(msg) {
            var report = {
                timestamp: new Date().toISOString(),
                monitoringActive: monitoringInterval !== null,
                targets: Object.keys(performanceData),
                summary: {}
            };

            // Generate summary for each target
            Object.keys(performanceData).forEach(target => {
                var data = performanceData[target];
                var recentData = data.slice(-24); // Last 24 measurements
                
                var alive = recentData.filter(d => d.alive);
                var latencies = alive.map(d => d.latency).filter(l => l !== null);
                
                report.summary[target] = {
                    totalMeasurements: recentData.length,
                    availability: (alive.length / recentData.length) * 100,
                    averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null,
                    minLatency: latencies.length > 0 ? Math.min(...latencies) : null,
                    maxLatency: latencies.length > 0 ? Math.max(...latencies) : null,
                    lastMeasurement: data[data.length - 1],
                    trend: calculateTrend(data.slice(-10))
                };
            });

            // Recent alerts
            report.recentAlerts = getRecentAlerts(20);
            
            var outputMsg = {
                payload: report,
                topic: 'network-performance-report'
            };

            if (msg) {
                outputMsg = { ...msg, ...outputMsg };
            }

            node.send([outputMsg, null]);
        }

        function calculateTrend(data) {
            if (data.length < 2) return 'insufficient_data';
            
            var latencies = data.filter(d => d.alive).map(d => d.latency).filter(l => l !== null);
            if (latencies.length < 2) return 'no_latency_data';
            
            var firstHalf = latencies.slice(0, Math.floor(latencies.length / 2));
            var secondHalf = latencies.slice(Math.floor(latencies.length / 2));
            
            var firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            var secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            
            var diff = secondAvg - firstAvg;
            
            if (Math.abs(diff) < 5) return 'stable';
            return diff > 0 ? 'increasing' : 'decreasing';
        }

        function getRecentAlerts(count) {
            return alertHistory.slice(-count);
        }

        function clearPerformanceData() {
            performanceData = {};
            alertHistory = [];
            node.status({fill: "blue", shape: "dot", text: "data cleared"});
        }

        function addTarget(target) {
            if (target && !node.targets.includes(target)) {
                node.targets.push(target);
                node.status({fill: "blue", shape: "dot", text: `added ${target}`});
            }
        }

        function removeTarget(target) {
            var index = node.targets.indexOf(target);
            if (index > -1) {
                node.targets.splice(index, 1);
                delete performanceData[target];
                node.status({fill: "blue", shape: "dot", text: `removed ${target}`});
            }
        }

        node.on('close', function() {
            stopMonitoring();
            node.status({});
        });
    }

    RED.nodes.registerType("network-performance-monitor", NetworkPerformanceMonitorNode);
};
