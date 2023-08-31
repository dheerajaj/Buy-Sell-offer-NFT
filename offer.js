const xrpl = require('xrpl');
const { Wallet, Client } = require('xrpl');
const {  NFTokenCreateOfferFlag } = require('xrpl');
const { NFTSellOffers } = require('xrpl');
const { RippleAPI } =require('ripple-lib');


const JSON_RPC_URL = 'wss://s.altnet.rippletest.net';

// Replace with your XRPL account seed with an already issued NFT
const seed = 'sEdTcpfZ5CVqm6sxc86ZVmhjsE4L3GM';

if (seed === '') {
  console.log(
    'Please edit this code to update the variable "seed" to an account with a minted NFT to run this snippet. ' +
    'You can get this by running "mint-nft.py" and copying the printed seed.'
  );
} else {

  (async () => {
    // Connect to the XRPL testnet node
    console.log('Connecting to Testnet...');
    
    let client = new Client(JSON_RPC_URL);

    // Initialize wallet from seed
    const issuerWallet = Wallet.fromSeed(seed);
    const issuerAddr = issuerWallet.address;

    console.log(`\nIssuer Account: ${issuerAddr}`);
    console.log(`          Seed: ${issuerWallet.seed}`);

    // Query the issuer account for its NFTs
    const rippleAPI = new RippleAPI({ server: 'wss://s.altnet.rippletest.net:51233' });

    // Connect to Ripple Testnet
    await rippleAPI.connect();
    console.log('Connected to Ripple Testnet');
   
   // Fetch NFTs from Ripple account

   const accountNFTs = await rippleAPI.getAccountNFTs(seed);
   
   if (accountNFTs.length !== 0) {
     let nftInt = 1;
     console.log(`\n - NFTs owned by ${seed}:`);
     for (let nft of accountNFTs) {
       console.log(
         `\n${nftInt}. NFToken metadata:
         NFT ID: ${nft.NFTokenID}
         Issuer: ${nft.Issuer}
         NFT Taxon: ${nft.NFTokenTaxon}`
       );
       nftInt++;
     }
   

      // Sell the NFT on the open market
      console.log(`Selling NFT ${nftokenId} for ${nftokenAmount / 1000000} XRP on the open market...`);
      const sellTx = new NFTokenCreateOffer({
        account: issuerAddr,
        nftoken_id: nftokenId,
        amount: nftokenAmount,
        flags: NFTokenCreateOfferFlag.TF_SELL_NFTOKEN,
      });

      // Sign and submit the transaction
      issuerWallet
        .sign(sellTx)
        .then((signedTx) => client.submitAndWait(signedTx))
        .then((sellTxResponse) => {
          const sellTxResult = sellTxResponse.result;

          console.log(`\n  Sell Offer tx result: ${sellTxResult.meta.TransactionResult}`);
          console.log(`           Tx response: ${JSON.stringify(sellTxResult)}`);

          // Iterate through the tx's metadata and check the changes that occurred on the ledger (AffectedNodes)
          for (const node of sellTxResult.meta.AffectedNodes) {
            if ('CreatedNode' in node && 'NFTokenOffer' in node.CreatedNode.LedgerEntryType) {
              console.log(
                `\n - Sell Offer metadata:
                      NFT ID: ${node.CreatedNode.NewFields.NFTokenID}
                      Sell Offer ID: ${node.CreatedNode.LedgerIndex}
                      Offer amount: ${node.CreatedNode.NewFields.Amount} drops
                      Offer owner: ${node.CreatedNode.NewFields.Owner}
                      Raw metadata: ${JSON.stringify(node)}`
              );
            }
          }

          // Query past sell offers
          client
            .request(new NFTSellOffers(nftokenId))
            .then((responseOffers) => {
              const offerObjects = responseOffers.result;
              let offerInt = 1;
              console.log(`\n - Existing Sell Offers for NFT ${nftokenId}:`);
              for (const offer of offerObjects.offers) {
                console.log(
                  `\n${offerInt}. Sell Offer metadata:
                      NFT ID: ${offerObjects.nft_id}
                      Sell Offer ID: ${offer.nft_offer_index}
                      Offer amount: ${offer.amount} drops
                      Offer owner: ${offer.owner}
                      Raw metadata: ${JSON.stringify(offer)}`
                );
                offerInt++;
              }
            })
            .catch((error) => {
              console.error('Error querying sell offers:', error);
            });
        })
        .catch((error) => {
          console.error('Error signing or submitting transaction:', error);
        });
    } else {
      console.log(`\nError: account ${issuerAddr} has no NFT, thus there are no NFTs to sell.`);
    }
  })().catch((error) => {
    console.error('Error:', error);
  });
}
