// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/// @title ReputationNFT - Soulbound ERC-721 reputation badges for freelancers
/// @notice Minted automatically per 5 completed jobs. Non-transferable (soulbound).
/// @dev On-chain SVG metadata. Tracks job history per freelancer.
contract ReputationNFT is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter;

    // Reputation tiers
    string public constant TIER_BRONZE = "Bronze SRE";
    string public constant TIER_SILVER = "Silver SRE";
    string public constant TIER_GOLD = "Gold SRE";
    string public constant TIER_PLATINUM = "Platinum SRE";
    string public constant TIER_DIAMOND = "Diamond SRE";

    struct FreelancerStats {
        uint256 completedJobs;
        uint256 totalEarned;
        uint256[] tokenIds;
        string[] jobTitles;
    }

    // Authorized minters (FreelanceMarket contract)
    mapping(address => bool) public authorizedMinters;
    mapping(address => FreelancerStats) public freelancerStats;
    mapping(uint256 => address) public tokenFreelancer;

    event ReputationMinted(address indexed freelancer, uint256 tokenId, string tier, uint256 completedJobs);
    event JobRecorded(address indexed freelancer, string jobTitle, uint256 earned);
    event MinterAuthorized(address minter);
    event MinterRevoked(address minter);

    modifier onlyAuthorized() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() ERC721("FreelanceEscrowChain Reputation", "FECR") Ownable(msg.sender) {}

    /// @notice Record a completed job and mint NFT if threshold reached
    function recordCompletedJob(
        address freelancer,
        string calldata jobTitle,
        uint256 earned
    ) external onlyAuthorized {
        require(freelancer != address(0), "Invalid freelancer");

        FreelancerStats storage stats = freelancerStats[freelancer];
        stats.completedJobs++;
        stats.totalEarned += earned;
        stats.jobTitles.push(jobTitle);

        emit JobRecorded(freelancer, jobTitle, earned);

        // Mint NFT every 5 completed jobs
        if (stats.completedJobs % 5 == 0) {
            _mintReputationNFT(freelancer);
        }
    }

    function _mintReputationNFT(address freelancer) internal {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(freelancer, tokenId);

        string memory tier = _getTier(freelancerStats[freelancer].completedJobs);
        string memory tokenURI_ = _generateTokenURI(tokenId, freelancer, tier);
        _setTokenURI(tokenId, tokenURI_);

        tokenFreelancer[tokenId] = freelancer;
        freelancerStats[freelancer].tokenIds.push(tokenId);

        emit ReputationMinted(freelancer, tokenId, tier, freelancerStats[freelancer].completedJobs);
    }

    /// @notice Soulbound: prevent all transfers except minting
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)), block all transfers
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: transfers disabled");
        }
        return super._update(to, tokenId, auth);
    }

    function _getTier(uint256 completedJobs) internal pure returns (string memory) {
        if (completedJobs >= 50) return "Diamond SRE";
        if (completedJobs >= 30) return "Platinum SRE";
        if (completedJobs >= 20) return "Gold SRE";
        if (completedJobs >= 10) return "Silver SRE";
        return "Bronze SRE";
    }

    function _getTierColor(string memory tier) internal pure returns (string memory) {
        if (keccak256(bytes(tier)) == keccak256("Diamond SRE")) return "#b9f2ff";
        if (keccak256(bytes(tier)) == keccak256("Platinum SRE")) return "#e5e4e2";
        if (keccak256(bytes(tier)) == keccak256("Gold SRE")) return "#ffd700";
        if (keccak256(bytes(tier)) == keccak256("Silver SRE")) return "#c0c0c0";
        return "#cd7f32"; // Bronze
    }

    function _generateTokenURI(uint256 tokenId, address freelancer, string memory tier)
        internal
        view
        returns (string memory)
    {
        FreelancerStats storage stats = freelancerStats[freelancer];
        string memory color = _getTierColor(tier);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350" viewBox="0 0 350 350">',
            '<rect width="100%" height="100%" fill="#0a0a0a"/>',
            '<rect x="10" y="10" width="330" height="330" rx="20" fill="none" stroke="', color, '" stroke-width="3"/>',
            '<text x="175" y="60" text-anchor="middle" fill="', color, '" font-size="24" font-family="monospace" font-weight="bold">FECR</text>',
            '<text x="175" y="100" text-anchor="middle" fill="white" font-size="18" font-family="monospace">', tier, '</text>',
            '<text x="175" y="150" text-anchor="middle" fill="#888" font-size="12" font-family="monospace">Jobs: ', stats.completedJobs.toString(), '</text>',
            '<text x="175" y="180" text-anchor="middle" fill="#888" font-size="12" font-family="monospace">Earned: ', (stats.totalEarned / 1e6).toString(), ' USDT</text>',
            '<text x="175" y="220" text-anchor="middle" fill="#666" font-size="10" font-family="monospace">Token #', tokenId.toString(), '</text>',
            '<text x="175" y="310" text-anchor="middle" fill="#444" font-size="8" font-family="monospace">FreelanceEscrowChain</text>',
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"FECR #', tokenId.toString(),
            ' - ', tier,
            '","description":"FreelanceEscrowChain Reputation NFT. Soulbound badge for completing ',
            stats.completedJobs.toString(), ' jobs.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Tier","value":"', tier,
            '"},{"trait_type":"Completed Jobs","value":', stats.completedJobs.toString(),
            '},{"trait_type":"Total Earned (USDT)","value":', (stats.totalEarned / 1e6).toString(),
            '}]}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // --- Admin ---

    function authorizeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }

    function revokeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRevoked(minter);
    }

    // --- Views ---

    function getFreelancerStats(address freelancer) external view returns (
        uint256 completedJobs,
        uint256 totalEarned,
        uint256[] memory tokenIds
    ) {
        FreelancerStats storage s = freelancerStats[freelancer];
        return (s.completedJobs, s.totalEarned, s.tokenIds);
    }

    function getFreelancerJobTitles(address freelancer) external view returns (string[] memory) {
        return freelancerStats[freelancer].jobTitles;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
