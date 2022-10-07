const {MerkleTree} = require("merkletreejs");
const keccak256 = require("keccak256");

const main = async () => {
  let addresses = [
    "0x21C66F57d58fcB3DBDd62629b44D36AB181fc369",
    "0x4C858E5c26d37f070F7c227E811263ca66595F78",
    "0x0C39F4A9CAB10C83D38069C965Eb3951caD07e79",
    "0xb3c9ED8320eCE3018ef457543E722A473a6499EB",
    "0xCDF1BE7E7b04e39D728241C87e5F8B6BbE9B40cb",
    "0x14637d58bb711486fA33CA2C1BdF08B9BefAF14F",
    "0xc43Fe4d87F6B810CAb49dE69A7FF2C787f15C1F1"
  ]

  let amounts = [
    1000000,
    1000000000,
    10000000000,
    20000000000,
    85000000,
    1000000,
    1000000
  ]

  // Recreate abi.encodePacked from solidity for (address, amount) pairs
  let hexAmounts = amounts.map(value => value.toString(16).toUpperCase().padStart(64, 0));
  let hashInput = addresses.map((addr,i) => addr.concat(hexAmounts[i]));
  
  // Create Merkle Tree
  let leaves = hashInput.map(addr => keccak256(addr));
  let merkleTree = new MerkleTree(leaves, keccak256, {sortPairs: true});
  let rootHash = merkleTree.getRoot().toString('hex');

  // Create hexProofs
  const hexProofs = leaves.map((leaf, i) => merkleTree.getHexProof(leaves[i]));

  // // Test proofs:
  // let proofs = []
  // let formattedProof;
  // for(let i = 0; i < hexProofs.length; i++) {
  //   formattedProof = '[' + hexProofs[i].toString() + ']';
  //   proofs[i] = formattedProof;
  //   // console.log(i);
  //   // console.log(merkleTree.verify(hexProofs[i], claimingTokens[i], rootHash));
  // }
  // proofs.forEach(element => console.log(element));
  
  // Deploy Contract
  const tokenContractFactory = await ethers.getContractFactory("HORIZON");
  tokenContract = await tokenContractFactory.deploy("0x" + rootHash);
  await tokenContract.deployed();
  console.log("Contract deployed to:", tokenContract.address);

  await tokenContract.addEarlyClaimer(addresses[2]);
  // Uniswap contracts to create LP
  await tokenContract.addEarlyClaimer("0x1F98431c8aD98523631AE4a59f267346ea31F984");
  await tokenContract.addEarlyClaimer("0xC36442b4a4522E871399CD717aBDD847Ab11FE88");
}

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMain();