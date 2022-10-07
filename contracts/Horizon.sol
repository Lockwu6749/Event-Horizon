pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Horizon is ERC20, Ownable, ReentrancyGuard {
    bytes32 private _merkleRoot;
    bool public claimActive;
    bool public launchTransferPause;

    event TokenClaim(address _address, uint256 _amount);

    mapping(address => bool) public addressClaimed;
    mapping(address => bool) public earlyClaimer;

    constructor(bytes32 merkleRoot) ERC20("Event Horizon", "HORIZON") {
        _merkleRoot = merkleRoot;
        launchTransferPause = true;
    }

    function claim(uint256 amount, bytes32[] calldata _merkleProof) public nonReentrant {
        require(!addressClaimed[_msgSender()], "Address has already claimed");
        require(claimActive || isEarlyClaimer(_msgSender()), "Claim not active");

        bytes32 leaf = keccak256(abi.encodePacked(_msgSender(), amount));
        require(MerkleProof.verify(_merkleProof, _merkleRoot, leaf), "Invalid proof");

        addressClaimed[_msgSender()] = true;
        uint256 _amount = amount * 10 ** decimals() / 1000;
        _mint(_msgSender(), _amount);
        
        emit TokenClaim(_msgSender(), _amount);
    }

    function burn(uint256 amount) public returns (bool) {
        address from = _msgSender();
        _burn(from, amount);
        return true;
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(!launchTransferPause || isEarlyClaimer(_msgSender()), "Launch Transfer Pause still active");
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        require(!launchTransferPause || earlyClaimer[_msgSender()], "Launch Transfer Pause still active");
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function setClaimActive() public onlyOwner {
        claimActive = !claimActive;
    }

    function addEarlyClaimer(address _address) public onlyOwner {
        earlyClaimer[_address] = true;
    }

    function removeEarlyClaimer(address _address) public onlyOwner {
        earlyClaimer[_address] = false;
    }

    function isEarlyClaimer(address _address) public view returns (bool) {
        return earlyClaimer[_address];
    }

    function removeLaunchTransferPause() public onlyOwner {
        launchTransferPause = false;
    }
}