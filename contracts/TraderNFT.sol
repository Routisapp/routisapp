// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title  TraderNFT
 * @notice ERC-721 multi-tier trader NFTs for the Agex DEX Aggregator.
 *         Tiers: 0=Bronze (500pts), 1=Silver (1000pts),
 *                2=Gold (1500pts), 3=Diamond (2000pts)
 *
 * Fixes applied:
 *  1. tokenURI: tier-based metadata URI per token.
 *  2. Mint bonus: +100 score added on-chain after successful mint.
 *  3. Score sync: updateScore / updateScoreBatch callable by owner
 *     (backend should call this after each swap via Supabase webhook).
 *
 * Rules:
 *  - Only OpenZeppelin libraries.
 *  - No ETH/token transfer functions (no receive, no fallback, no withdraw).
 *  - Mint requires: valid tier + not already minted + sufficient score.
 */
contract TraderNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // ─── Tier constants ───────────────────────────────────────────────────────
    uint256 public constant BRONZE   = 0;
    uint256 public constant SILVER   = 1;
    uint256 public constant GOLD     = 2;
    uint256 public constant DIAMOND  = 3;
    uint256 public constant MAX_TIER = 3;

    /// @notice Minimum score required to mint each tier
    uint256[4] public requiredScores = [500, 1000, 1500, 2000];

    /// @notice Points awarded on mint (on-chain score bonus)
    uint256 public constant MINT_BONUS = 100;

    // ─── State ────────────────────────────────────────────────────────────────
    /// @dev user address → accumulated score (synced by owner/oracle on each swap)
    mapping(address => uint256) public userScores;

    /// @dev user address → tierId → already minted?
    mapping(address => mapping(uint256 => bool)) private _hasMinted;

    /// @dev tokenId → tierId (needed for tier-based tokenURI)
    mapping(uint256 => uint256) private _tokenTier;

    /// @dev auto-incrementing token ID
    uint256 private _nextTokenId;

    /// @dev base metadata URI — tier folder appended in tokenURI()
    string private _baseTokenURI;

    // ─── Events ───────────────────────────────────────────────────────────────
    event ScoreUpdated(address indexed user, uint256 newScore);
    event TierMinted(address indexed user, uint256 indexed tierId, uint256 tokenId);

    // ─── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param baseURI_  Base metadata URI, e.g. "https://agex.app/api/nft/"
     *                  Final URI will be: baseURI + tierId + "/" + tokenId + ".json"
     */
    constructor(string memory baseURI_)
        ERC721("Agex Trader NFT", "AGEX")
        Ownable(msg.sender)
    {
        _baseTokenURI = baseURI_;
    }

    // ─── Owner-only: score management ────────────────────────────────────────
    /**
     * @notice Update score for a single user.
     *         Must be called by owner after each swap (Supabase webhook → backend → this).
     */
    function updateScore(address user, uint256 score) external onlyOwner {
        require(user != address(0), "TraderNFT: zero address");
        userScores[user] = score;
        emit ScoreUpdated(user, score);
    }

    /**
     * @notice Batch-update scores — gas-efficient for syncing many users at once.
     */
    function updateScoreBatch(
        address[] calldata users,
        uint256[] calldata scores
    ) external onlyOwner {
        require(users.length == scores.length, "TraderNFT: length mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "TraderNFT: zero address");
            userScores[users[i]] = scores[i];
            emit ScoreUpdated(users[i], scores[i]);
        }
    }

    /// @notice Update base metadata URI.
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    // ─── User: mint ───────────────────────────────────────────────────────────
    /**
     * @notice Mint a tier NFT. Three checks enforced with require():
     *   1. tierId must be 0–3
     *   2. Caller must NOT have minted this tier before
     *   3. Caller's score must be >= requiredScores[tierId]
     *
     * After mint: +100 bonus score added on-chain.
     *
     * @param tierId  0=Bronze, 1=Silver, 2=Gold, 3=Diamond
     */
    function mint(uint256 tierId) external nonReentrant {
        // Check 1: valid tier
        require(tierId <= MAX_TIER, "TraderNFT: invalid tier");

        // Check 2: not already minted this tier
        require(!_hasMinted[msg.sender][tierId], "TraderNFT: already minted this tier");

        // Check 3: sufficient score
        require(
            userScores[msg.sender] >= requiredScores[tierId],
            "TraderNFT: score too low"
        );

        // Mark minted
        _hasMinted[msg.sender][tierId] = true;

        // Mint NFT
        uint256 tokenId = _nextTokenId++;
        _tokenTier[tokenId] = tierId;
        _safeMint(msg.sender, tokenId);

        // +100 on-chain score bonus
        userScores[msg.sender] += MINT_BONUS;
        emit ScoreUpdated(msg.sender, userScores[msg.sender]);

        emit TierMinted(msg.sender, tierId, tokenId);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /**
     * @notice Tier-based tokenURI.
     *         Returns: baseURI + tierId + "/" + tokenId + ".json"
     *         e.g.   : "https://agex.app/api/nft/0/42.json"  (Bronze, token #42)
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "TraderNFT: nonexistent token");
        uint256 tierId = _tokenTier[tokenId];
        return string(
            abi.encodePacked(
                _baseTokenURI,
                tierId.toString(),
                "/",
                tokenId.toString(),
                ".json"
            )
        );
    }

    /// @notice Returns whether a user has minted a specific tier.
    function hasMinted(address user, uint256 tierId) external view returns (bool) {
        return _hasMinted[user][tierId];
    }

    /// @notice Returns all 4 tier mint statuses for a user: [bronze, silver, gold, diamond]
    function mintedTiers(address user) external view returns (bool[4] memory) {
        return [
            _hasMinted[user][BRONZE],
            _hasMinted[user][SILVER],
            _hasMinted[user][GOLD],
            _hasMinted[user][DIAMOND]
        ];
    }

    /// @notice Returns the highest tier the user qualifies for, or -1 if none.
    function highestTier(address user) external view returns (int256) {
        uint256 score = userScores[user];
        for (int256 i = int256(MAX_TIER); i >= 0; i--) {
            if (score >= requiredScores[uint256(i)]) return i;
        }
        return -1;
    }

    /// @notice Returns the tier of a given tokenId.
    function tokenTier(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "TraderNFT: nonexistent token");
        return _tokenTier[tokenId];
    }

    // ─── No ETH acceptance ────────────────────────────────────────────────────
    // receive() and fallback() are intentionally NOT defined.
    // This contract cannot receive ETH.
}
