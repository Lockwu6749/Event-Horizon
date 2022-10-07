const { expect } = require("chai");
const { ethers } = require("hardhat");
const {MerkleTree} = require("merkletreejs");
const keccak256 = require("keccak256");

describe("Horizon Tests", function () {
  before(async () => {
    [ owner, addr1, addr2, addr3, addr4 ] = await ethers.getSigners();
    signers = [ owner, addr1, addr2, addr3, addr4 ];

    addresses = signers.map(signer => signer.address);
    amounts = [
        50000,
        1000000,
        25000,
        750000,
        450000000
    ]

    // Recreate abi.encodePacked from solidity for (address, amount) pairs
    let hexAmounts = amounts.map(value => value.toString(16).toUpperCase().padStart(64, 0));
    let hashInput = addresses.map((addr,i) => addr.concat(hexAmounts[i]));
    
    // Create Merkle Tree and get rootHash
    let leaves = hashInput.map(hash => keccak256(hash));
    let merkleTree = new MerkleTree(leaves, keccak256, {sortPairs: true});
    let rootHash = merkleTree.getRoot().toString('hex');

    // Create hexProofs
    hexProofs = leaves.map((leaf, i) => merkleTree.getHexProof(leaves[i]));

    // Deploy Contract
    const tokenContractFactory = await ethers.getContractFactory("Horizon");
    tokenContract = await tokenContractFactory.deploy("0x" + rootHash);
    await tokenContract.deployed();

    // Declare global constants
    DECIMALS = await tokenContract.decimals();
    TEN = new ethers.BigNumber.from(10);
  });

  it("should prevent early claims for all addresses", async function () {
    for(let i = 0; i < signers.length; i++) {
      await expect(tokenContract.connect(signers[i]).claim(amounts[i], hexProofs[i])).to.be.revertedWith("Claim not active");
    }
  });

  it("should prevent anyone but owner from using setClaimActive", async function () {
    for(let i = 1; i < signers.length; i++) {
      await expect(tokenContract.connect(signers[i]).setClaimActive()).to.be.revertedWith("Ownable: caller is not the owner");
    }
  });

  it("should prevent anyone but owner from using addEarlyClaimer", async function () {
    for(let i = 1; i < signers.length; i++) {
      await expect(tokenContract.connect(signers[i]).addEarlyClaimer(signers[i].address)).to.be.revertedWith("Ownable: caller is not the owner");
    }
  });

  it("should prevent anyone but owner from using removeLaunchTransferPause", async function () {
    for(let i = 1; i < signers.length; i++) {
      await expect(tokenContract.connect(signers[i]).removeLaunchTransferPause()).to.be.revertedWith("Ownable: caller is not the owner");
    }
  });

  it("should add early claimer to mapping", async function () {
    let i = 4;
    await tokenContract.addEarlyClaimer(signers[i].address);
    expect(await tokenContract.isEarlyClaimer(signers[i].address)).to.equal(true);
  });

  it("should prevent early claimer from claiming with a different users' amount and proof", async function () {
    let i = 4
    for(let j = 0; j < i; j++) {
      await expect(tokenContract.connect(signers[i]).claim(amounts[0], hexProofs[0])).to.be.revertedWith("Invalid proof");
    }
  });

  it("should allow early claimer to claim tokens and the correct amount (/ 1000)", async function () {
    let i = 4;
    await tokenContract.connect(signers[i]).claim(amounts[i], hexProofs[i]);
    let balance = await tokenContract.balanceOf(signers[i].address);
    expect(Number(balance) / 10 ** DECIMALS).to.equal(amounts[i] / 1000 );
  });

  it("should prevent double claiming", async function () {
    let i = 4;
    await expect(tokenContract.connect(signers[i]).claim(amounts[i], hexProofs[i])).to.be.revertedWith("Address has already claimed");
  });

  it("should change claimActive", async function () {
    await tokenContract.setClaimActive();
    let claimActive = await tokenContract.claimActive();
    expect(claimActive).to.equal(true);
  });

  it("should allow all whitelisted addresses to claim their tokens", async function () {
    let = i = 4;
    for(let j = 0; j < i; j++) {
      await tokenContract.connect(signers[j]).claim(amounts[j], hexProofs[j]);
      let balance = await tokenContract.balanceOf(signers[j].address);
      expect(Number(balance) / 10 ** DECIMALS).to.equal(amounts[j] / 1000 );
    }
  });

  it("should prevent non early claimers from transfering tokens", async function () {
    let = i = 4;
    for(let j = 0; j < i; j++) {
      await expect(tokenContract.connect(signers[j]).transfer(signers[i].address, amounts[j] / 1000)).to.be.revertedWith("Launch Transfer Pause still active");
    }
  });

  it("removeLaunchTransferPause should allow transfers", async function () {
    await tokenContract.removeLaunchTransferPause();

    let i = 4;
    let oldBalance = await tokenContract.balanceOf(signers[i].address);
    oldBalance = oldBalance.div(TEN.pow(DECIMALS));
    let newBalance;
    for(let j = 0; j < i; j++) {
      let amount = new ethers.BigNumber.from(amounts[j] / 1000);
      amount = amount.mul(TEN.pow(DECIMALS));

      await tokenContract.connect(signers[j]).transfer(signers[i].address, amount);

      newBalance = await tokenContract.balanceOf(signers[i].address);
      newBalance = newBalance.div(TEN.pow(DECIMALS))

      expect(newBalance).to.equal(oldBalance.add(amount.div(TEN.pow(DECIMALS))));

      await tokenContract.connect(signers[i]).transfer(signers[j].address, amount);
    }
  });

  it("should burn tokens from wallet and total supply", async function () {
    let i = 4;
    let oldBalance = await tokenContract.balanceOf(signers[i].address);
    let oldTotalSupply = await tokenContract.totalSupply();
    let amount = oldBalance.div(2);

    await tokenContract.connect(signers[i]).burn(amount);
    let newBalance = await tokenContract.balanceOf(signers[i].address);
    let newTotalSupply = await tokenContract.totalSupply();

    expect(newBalance).to.equal(oldBalance.sub(amount));
    expect(newTotalSupply).to.equal(oldTotalSupply.sub(amount));
  });
});