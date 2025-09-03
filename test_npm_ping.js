const ping = require('ping');

async function testPing() {
    console.log('Testing ping functionality...');
    
    const targets = ['8.8.8.8', '127.0.0.1', 'google.com'];
    
    for (const target of targets) {
        console.log(`\nTesting target: ${target}`);
        
        const config = {
            timeout: 5,
            extra: process.platform === 'win32' ? ["-n", "1"] : ["-c", "1"]
        };
        
        try {
            const result = await ping.promise.probe(target, config);
            console.log('Result:', {
                host: result.host,
                alive: result.alive,
                time: result.time,
                min: result.min,
                max: result.max,
                avg: result.avg,
                packetLoss: result.packetLoss,
                output: result.output
            });
        } catch (error) {
            console.log('Error:', error.message);
        }
    }
}

testPing().catch(console.error);
