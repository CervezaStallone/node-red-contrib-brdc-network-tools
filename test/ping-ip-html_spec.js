const fs = require('fs');
const path = require('path');
const should = require('should');

describe('ping-ip Node HTML Configuration', function () {

    let htmlContent;

    before(function() {
        // Read the HTML file
        const htmlPath = path.join(__dirname, '..', 'ping-ip.html');
        htmlContent = fs.readFileSync(htmlPath, 'utf8');
    });

    it('should contain proper node registration', function() {
        htmlContent.should.match(/RED\.nodes\.registerType\('ping-ip'/);
    });    it('should have correct node category', function() {
        htmlContent.should.match(/category:\s*['"]brdc-network-nodes['"]/);
    });

    it('should have correct number of inputs and outputs', function() {
        htmlContent.should.match(/inputs:\s*1/);
        htmlContent.should.match(/outputs:\s*2/);
    });

    it('should have proper defaults configuration', function() {
        htmlContent.should.match(/defaults:\s*{/);
        htmlContent.should.match(/name:\s*{value:\s*['"]{2}}/);
        htmlContent.should.match(/ipAddress:\s*{value:\s*['"]{2}}/);
        htmlContent.should.match(/timeout:\s*{value:\s*5000/);
    });

    it('should have proper form template', function() {
        htmlContent.should.match(/data-template-name=['"]ping-ip['"]/);
        htmlContent.should.match(/node-input-name/);
        htmlContent.should.match(/node-input-ipAddress/);
        htmlContent.should.match(/node-input-timeout/);
    });

    it('should have help documentation', function() {
        htmlContent.should.match(/data-help-name=['"]ping-ip['"]/);
        htmlContent.should.match(/Inputs/);
        htmlContent.should.match(/Outputs/);
        htmlContent.should.match(/Details/);
    });

    it('should have proper input validation', function() {
        htmlContent.should.match(/validate:\s*RED\.validators\.number\(\)/);
    });

    it('should have output labels', function() {
        htmlContent.should.match(/outputLabels:\s*\[['"]success['"],\s*['"]failure['"]\]/);
    });

    it('should have proper icon configuration', function() {
        htmlContent.should.match(/icon:\s*['"]network\.svg['"]/);
    });

    it('should have palette label', function() {
        htmlContent.should.match(/paletteLabel:\s*['"]ping ip['"]/);
    });

    it('should contain usage examples in help', function() {
        htmlContent.should.match(/Examples/);
        htmlContent.should.match(/8\.8\.8\.8/);
        htmlContent.should.match(/google\.com/);
    });

    it('should explain timeout parameter properly', function() {
        htmlContent.should.match(/Timeout.*milliseconds/i);
        htmlContent.should.match(/1000-30000/);
    });

    it('should document message properties', function() {
        htmlContent.should.match(/msg\.payload/);
        htmlContent.should.match(/msg\.ip/);
        htmlContent.should.match(/timestamp/);
    });

});
