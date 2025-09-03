function isValidTarget(target) {
    if (!target || typeof target !== 'string') {
        return false;
    }
    
    console.log('Testing target:', target, 'type:', typeof target);
    
    // Check if it's a timestamp (all digits, typically 10-13 digits for Unix timestamp)
    if (/^\d{10,}$/.test(target)) {
        console.log('Caught by timestamp regex');
        return false;
    }
    
    var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    var ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}$/;
    var hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (ipv4Regex.test(target) || ipv6Regex.test(target)) {
        console.log('Matched IP regex');
        return true;
    }
    
    if (hostnameRegex.test(target)) {
        console.log('Passed hostname regex, checking for letters/dots');
        var hasLetters = /[a-zA-Z.]/.test(target);
        var isAllDigits = /^\d+$/.test(target);
        console.log('Has letters:', hasLetters, 'Is all digits:', isAllDigits);
        return hasLetters && !isAllDigits;
    }
    
    console.log('No regex matched');
    return false;
}

console.log('=== Testing validation ===');
console.log('Result for 1756891718855:', isValidTarget('1756891718855'));
console.log('Result for 10.13.37.12:', isValidTarget('10.13.37.12'));
