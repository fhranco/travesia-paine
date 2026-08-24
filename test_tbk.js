const { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = require('transbank-sdk');

async function testWebpay() {
    try {
        console.log('Testing Transbank SDK...');
        const tx = new WebpayPlus.Transaction(new Options(
            IntegrationCommerceCodes.WEBPAY_PLUS,
            IntegrationApiKeys.WEBPAY,
            Environment.Integration
        ));
        const res = await tx.create('ORD-1234', 'SESS-1234', 25000, 'http://localhost:3000/return.html');
        console.log('Webpay Create Success!', res);
    } catch (e) {
        console.error('Webpay Test Error:', e);
    }
}

testWebpay();
