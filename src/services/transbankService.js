const { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = require('transbank-sdk');
const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.WEBPAY_ENVIRONMENT === 'PRODUCTION';

const commerceCode = isProduction ? process.env.WEBPAY_COMMERCE_CODE : IntegrationCommerceCodes.WEBPAY_PLUS;
const apiKey = isProduction ? process.env.WEBPAY_API_KEY : IntegrationApiKeys.WEBPAY;
const environment = isProduction ? Environment.Production : Environment.Integration;

const tx = new WebpayPlus.Transaction(new Options(commerceCode, apiKey, environment));

/**
 * Inicia una transacción en Webpay Plus.
 * @param {string} buyOrder - Código único de la orden de compra.
 * @param {string} sessionId - ID de sesión del usuario.
 * @param {number} amount - Monto en pesos chilenos (CLP).
 * @param {string} returnUrl - URL donde Transbank redirige tras el pago.
 */
async function createTransaction(buyOrder, sessionId, amount, returnUrl) {
    try {
        const response = await tx.create(buyOrder, sessionId, amount, returnUrl);
        return {
            token: response.token,
            url: response.url
        };
    } catch (error) {
        console.error('[Webpay Create Error]', error);
        throw new Error('Error al conectar con la pasarela de pagos Webpay Plus.');
    }
}

/**
 * Confirma el estado de la transacción en Transbank tras el retorno del cliente.
 * @param {string} token - Token retornado por Webpay.
 */
async function commitTransaction(token) {
    try {
        const response = await tx.commit(token);
        
        // Se considera autorizada si response_code === 0 y status === 'AUTHORIZED'
        const isApproved = response.response_code === 0 && response.status === 'AUTHORIZED';

        return {
            isApproved,
            status: response.status,
            responseCode: response.response_code,
            buyOrder: response.buy_order,
            sessionId: response.session_id,
            amount: response.amount,
            authorizationCode: response.authorization_code,
            paymentTypeCode: response.payment_type_code,
            sharesNumber: response.installments_number || 0,
            cardNumber: response.card_detail ? response.card_detail.card_number : '****',
            transactionDate: response.transaction_date,
            raw: response
        };
    } catch (error) {
        console.error('[Webpay Commit Error]', error);
        throw error;
    }
}

module.exports = {
    createTransaction,
    commitTransaction
};
