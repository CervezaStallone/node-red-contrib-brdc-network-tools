const ping = require('ping');

async function testSpecificIP() {
    console.log('Testing 10.13.37.13 with network-performance-monitor config...');
    
    const target = '10.13.37.13';
    
    // Use the exact same config as network-performance-monitor
    const config = {
        timeout: 5000 / 1000,  // 5 seconds
        extra: process.platform === 'win32' ? ["-n", "1"] : ["-c", "1"]
    };
    
    console.log('Config:', config);
    console.log('Platform:', process.platform);
    
    try {
        const result = await ping.promise.probe(target, config);
        console.log('Full result object:', result);
        
        console.log('Processed result:');
        console.log('- alive:', result.alive);
        console.log('- time:', result.time);
        console.log('- packetLoss:', result.packetLoss);
        console.log('- output:', result.output);
        
    } catch (error) {
        console.log('Error:', error.message);
    }
}

testSpecificIP().catch(console.error);
