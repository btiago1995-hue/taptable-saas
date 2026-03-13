import crypto from 'crypto';

/**
 * Helper library to calculate and verify Vinti4Net Fingerprints
 * Based on SISP Vinti4 API Documentation
 */

export function generateVinti4Fingerprint(params: {
    posAutCode: string;
    timeStamp: string;
    amount: string;
    merchantRef: string;
    merchantSession: string;
    posID: string;
    currency: string;
    transactionCode: string;
    entityCode?: string;
    referenceNumber?: string;
}): string {
    
    // As per SISP Documentation, the string to hash is a concatenation of the values
    // posAutCode + timeStamp + amount + merchantRef + merchantSession + posID + currency + transactionCode + entityCode + referenceNumber
    
    // We base64 encode the values before hashing.
    const encode = (val: string | undefined) => {
        if (!val) return "";
        return Buffer.from(val).toString('base64');
    };

    const rawString = 
        encode(params.posAutCode) +
        encode(params.timeStamp) +
        encode(params.amount) +
        encode(params.merchantRef) +
        encode(params.merchantSession) +
        encode(params.posID) +
        encode(params.currency) +
        encode(params.transactionCode) +
        encode(params.entityCode) +
        encode(params.referenceNumber);

    // SISP uses SHA-512 to generate the final fingerprint
    const hash = crypto.createHash('sha512').update(rawString).digest('base64');
    return hash;
}

export function verifyVinti4Response(params: {
    posAutCode: string;
    messageType: string;
    merchantRespCP: string;
    merchantRespTid: string;
    merchantRespMessageID: string;
    merchantRespReference: string;
    merchantRespPan: string;
    merchantResp: string;
    merchantRespTimeStamp: string;
    providedFingerprint: string;
}): boolean {
    const encode = (val: string | undefined) => {
        if (!val) return "";
        return Buffer.from(val).toString('base64');
    };

    const rawString = 
        encode(params.posAutCode) +
        encode(params.messageType) +
        encode(params.merchantRespCP) +
        encode(params.merchantRespTid) +
        encode(params.merchantRespMessageID) +
        encode(params.merchantRespReference) +
        encode(params.merchantRespPan) +
        encode(params.merchantResp) +
        encode(params.merchantRespTimeStamp);

    const calculatedHash = crypto.createHash('sha512').update(rawString).digest('base64');
    return calculatedHash === params.providedFingerprint;
}
