function isValidTarget(target) {
    if (!target || typeof target !== 'string') {
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

console.log('Testing improved validation:');
console.log('1693766400000:', isValidTarget('1693766400000'));
console.log('2023-09-03T12:00:00.000Z:', isValidTarget('2023-09-03T12:00:00.000Z'));
console.log('1693766400:', isValidTarget('1693766400'));
console.log('127.0.0.1:', isValidTarget('127.0.0.1'));
console.log('google.com:', isValidTarget('google.com'));
console.log('localhost:', isValidTarget('localhost'));
console.log('server-01:', isValidTarget('server-01'));
console.log('192.168.1.100:', isValidTarget('192.168.1.100'));
console.log('null:', isValidTarget(null));
console.log('undefined:', isValidTarget(undefined));
console.log('number 123:', isValidTarget(123));
