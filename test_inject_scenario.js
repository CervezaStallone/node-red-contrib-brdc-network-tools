// Simulate an inject node message
function testInjectScenario() {
    console.log('=== Testing Inject Node Scenario ===');
    
    // This is what an inject node typically sends
    var msg = {
        payload: "10.13.37.13",
        timestamp: 1756891718855,
        _msgid: "abc123"
    };
    
    // Simulate the enhanced-ping validation logic
    var node = {
        ipAddress: "10.13.37.13"  // configured in the node
    };
    
    function isValidTarget(target) {
        if (!target || typeof target !== 'string') {
            return false;
        }
        
        // Check if it's a timestamp (all digits, typically 10-13 digits for Unix timestamp)
        if (/^\d{10,}$/.test(target)) {
            return false;
        }
        
        var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        var ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}$/;
        var hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (ipv4Regex.test(target) || ipv6Regex.test(target)) {
            return true;
        }
        
        if (hostnameRegex.test(target)) {
            return /[a-zA-Z.]/.test(target) && !(/^\d+$/.test(target));
        }
        
        return false;
    }
    
    // Simulate the enhanced-ping input validation
    var targetIP;
    console.log('msg.payload:', msg.payload, 'type:', typeof msg.payload);
    console.log('msg.ip:', msg.ip, 'type:', typeof msg.ip);
    console.log('msg.timestamp:', msg.timestamp, 'type:', typeof msg.timestamp);
    console.log('node.ipAddress:', node.ipAddress);
    
    if (msg.payload && isValidTarget(String(msg.payload))) {
        targetIP = String(msg.payload);
        console.log('Using msg.payload:', targetIP);
    } else if (msg.ip && isValidTarget(String(msg.ip))) {
        targetIP = String(msg.ip);
        console.log('Using msg.ip:', targetIP);
    } else {
        targetIP = node.ipAddress;
        console.log('Using node.ipAddress:', targetIP);
    }
    
    console.log('Final targetIP:', targetIP);
    console.log('targetIP validation:', isValidTarget(targetIP));
}

testInjectScenario();
