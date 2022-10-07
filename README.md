## Horizon.sol
Standard ERC20 Token with some minor changes for the purpose of migrating an already established token. Imports from openzeppelin’s ERC20, MerkleProof, and Ownable contracts.

## Token Goals:
Migrate an existing token using snapshot data while keeping the data off-chain. Upon launch, allow the community liquidity provider wallet the ability to claim their tokens and set up the new liquidity pool before anyone else. Pause the ability to transfer tokens after claiming them for a short time to prevent scammers (and make it one time only).

## Added Functions:
### claim(amount, merkleProof):
- Claims tokens. This is the only way new tokens are minted. amount and merkleProof must match the snapshot spreadsheet exactly.
- Verification done via a merkle tree that is generated from a snapshot of addresses and token amounts of the established token. 
- The merkle root used for verification is unchangeable and set at contract deployment to prevent someone altering it and minting unlimited tokens.
- The amount of tokens claimed will be reduced by a factor of 1,000 for everyone. This is set within the claim function.
- Will emit a TokenClaim(address, amount) event upon completion.

### addEarlyClaimer(address):
- Upon deployment, no one will be able to claim or transfer tokens. Only addresses in the earlyClaimer mapping will be able to mint and transfer tokens, but they must be first added to the mapping via this function.

### setClaimActive(): 
- Toggles between allowing all addresses to claim or not assuming they are in the snapshot. This does not affect any addresses in the earlyClaimer mapping. 

### removeLaunchTransferPause():
- Will allow any wallet to begin transferring/trading their tokens. This cannot be undone. This does not affect any addresses in the earlyClaimer mapping.

### burn(amount):
- Burns tokens from sender’s address.

## Deployment:
1) Deploy contract with merkle root
2) Add community address and two of uniswap’s contracts to the earlyClaimer mapping using the addEarlyClaimer(address) function
3) Claim tokens on the community address and create the new liquidity pool on uniswap
4) Change claimActive to true using the setClaimActive() function allowing the community to claim their tokens, but not transfer/trade them yet
5) When ready, use the removeLaunchTransferPause() function to allow for token transfers/trading
6) (optional) Turn off claims using the setClaimActive() function again and renounce ownership using the renounceOwnership() function locking in the current total supply and forever shutting down the claim function