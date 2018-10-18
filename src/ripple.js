const axios = require('axios')
const RippleAPI = require('ripple-lib').RippleAPI;


const RippleFacuetURL = "https://faucet.altnet.rippletest.net/accounts"
const faucet = axios.create({
	baseURL: RippleFacuetURL,
});

const INTERVAL = 1000;
const api = new RippleAPI({server: 'wss://s.altnet.rippletest.net:51233'});
const ledgerOffset = 5;
const myInstructions = {maxLedgerVersionOffset: ledgerOffset};

/* Verify a transaction is in a validated XRP Ledger version */
function verifyTransaction(hash, options, self) {
    setStateOfMessage(self,`Verifying Transaction`)
	console.log('Verifying Transaction');
	return api.getTransaction(hash, options).then(data => {
        setStateOfMessage(self,`Final Result ${data.outcome.result}`)
		console.log('Final Result: ', data.outcome.result);
		console.log('Validated in Ledger: ', data.outcome.ledgerVersion);
		console.log('Sequence: ', data.sequence);
		return data.outcome.result === 'tesSUCCESS';
	}).catch(error => {
    /* If transaction not in latest validated ledger,
    try again until max ledger hit */
    if (error instanceof api.errors.PendingLedgerVersionError) {
    	return new Promise((resolve, reject) => {
    		setTimeout(() => verifyTransaction(hash, options, self)
    			.then(resolve, reject), INTERVAL);
    	});
    }
    return error;
});
}


/* Function to prepare, sign, and submit a transaction to the XRP Ledger. */
function submitTransaction(lastClosedLedgerVersion, prepared, secret, self) {
	const signedData = api.sign(prepared.txJSON, secret);
	return api.submit(signedData.signedTransaction).then(data => {
        setStateOfMessage(self,`Tentative Message: ${data.resultCode}`)
		console.log('Tentative Result: ', data.resultCode);
		console.log('Tentative Message: ', data.resultMessage);
    /* The tentative result should be ignored. Transactions that succeed here can ultimately fail,
    and transactions that fail here can ultimately succeed. */

    /* Begin validation workflow */
    const options = {
    	minLedgerVersion: lastClosedLedgerVersion,
    	maxLedgerVersion: prepared.instructions.maxLedgerVersion
    };
    return new Promise((resolve, reject) => {
    	setTimeout(() => verifyTransaction(signedData.id, options, self)
    		.then(resolve, reject), INTERVAL);
    });
});
}

function setStateOfMessage(self, message){
    self.setState({
        message
    })
}

function fundAddress(address,funder,secret,payment,self){
	api.connect().then(() => {
        setStateOfMessage(self,'API Connected')
		console.log('Connected');
		return api.preparePayment(funder, payment, myInstructions);
	}).then(prepared => {
        setStateOfMessage(self,'Order Prepared')
		console.log('Order Prepared');
		return api.getLedger().then(ledger => {
            setStateOfMessage(self,'Current Ledger')
			console.log('Current Ledger', ledger.ledgerVersion);
			return submitTransaction(ledger.ledgerVersion, prepared, secret, self);
		});
	}).then(() => {
		api.disconnect().then(() => {
            self.setState({
                isTransactionSuccess: false
            })
			console.log('api disconnected');
			// process.exit();
		});
	}).catch((err)=>{
        const errorMessage = err.toString().slice(1,16);
        console.log(errorMessage)
        self.setState({
            isTransactionSuccess: false,
            message: errorMessage
        })
    });
}

export function fundingWallet(self) {
    const {
        address
    } = self.state;
    
    faucet.post().then(response=>{
        let cred = response.data.account;
        console.log(cred)
        const payment = {
            source: {
                address: cred.address,
                maxAmount: {
                    value: '9500',
                    currency: 'XRP'
                }
            },
            destination: {
                address: address,
                amount: {
                    value: '9500',
                    currency: 'XRP'
                }
            }
        }
        // console.log(payment)
        fundAddress(address,cred.address,cred.secret,payment, self)
    })
    
}
