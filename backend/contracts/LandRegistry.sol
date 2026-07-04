// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LandChain LandRegistry
/// @notice Minimal, auditable registry of parcel registrations and transfers.
///         Only hash references to off-chain records are stored — never
///         personal data or documents (LandChain spec §15.2).
contract LandRegistry is ERC721, Ownable {
    uint256 private _nextTokenId = 1;

    /// parcelReference (e.g. official title number) → tokenId. A parcel can
    /// never be re-minted — second line of defense behind the backend's
    /// duplicate-sale check.
    mapping(string => uint256) public parcelToken;

    /// tokenId → latest off-chain record hash (sha256 of the MongoDB record)
    mapping(uint256 => bytes32) public recordHash;

    event ParcelRegistered(uint256 indexed tokenId, string parcelReference, bytes32 recordHash);
    event OwnershipRecordUpdated(uint256 indexed tokenId, bytes32 recordHash);

    constructor() ERC721("LandChain Parcel", "LCP") Ownable(msg.sender) {}

    function registerParcel(string calldata parcelReference, bytes32 hash)
        external
        onlyOwner
        returns (uint256)
    {
        require(parcelToken[parcelReference] == 0, "LandRegistry: parcel already registered");
        uint256 tokenId = _nextTokenId++;
        parcelToken[parcelReference] = tokenId;
        recordHash[tokenId] = hash;
        _safeMint(msg.sender, tokenId);
        emit ParcelRegistered(tokenId, parcelReference, hash);
        return tokenId;
    }

    function recordTransfer(uint256 tokenId, bytes32 hash) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "LandRegistry: unknown token");
        recordHash[tokenId] = hash;
        emit OwnershipRecordUpdated(tokenId, hash);
    }
}
