// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ScoreCard is ERC721, Ownable {
    using Strings for uint256;

    uint256 public constant MINT_FEE = 0.00015 ether;

    uint256 private _tokenIdCounter;

    struct ScoreData {
        address wallet;
        uint256 totalScore;
        uint256 txScore;
        uint256 ageScore;
        uint256 volScore;
        uint256 conScore;
        uint256 feeScore;
        uint256 mintedAt;
    }

    mapping(uint256 => ScoreData) public scores;

    constructor() ERC721("Routis Score Card", "RSC") Ownable(msg.sender) {}

    function mint(
        uint256 totalScore,
        uint256 txScore,
        uint256 ageScore,
        uint256 volScore,
        uint256 conScore,
        uint256 feeScore
    ) external payable {
        require(msg.value == MINT_FEE, "Wrong fee");
        require(totalScore <= 100, "Invalid score");

        uint256 tokenId = ++_tokenIdCounter;
        scores[tokenId] = ScoreData({
            wallet:     msg.sender,
            totalScore: totalScore,
            txScore:    txScore,
            ageScore:   ageScore,
            volScore:   volScore,
            conScore:   conScore,
            feeScore:   feeScore,
            mintedAt:   block.timestamp
        });
        _safeMint(msg.sender, tokenId);

        // Forward mint fee directly to owner (deployer wallet)
        (bool ok, ) = owner().call{value: msg.value}("");
        require(ok, "Fee transfer failed");
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        (bool ok, ) = owner().call{value: balance}("");
        require(ok, "Transfer failed");
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        ScoreData memory s = scores[tokenId];
        string memory svg  = _buildSVG(s);
        string memory json = Base64.encode(bytes(string.concat(
            '{"name":"Routis Score Card #', tokenId.toString(), '",',
            '"description":"On-chain wallet score card by Routis",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        )));
        return string.concat("data:application/json;base64,", json);
    }

    function _buildSVG(ScoreData memory s) internal pure returns (string memory) {
        uint256 dashOffset = 188 - (s.totalScore * 188 / 100);
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260">',
            '<rect width="600" height="260" rx="16" fill="#f5efe8" stroke="#e8e2d9" stroke-width="1.5"/>',
            '<text x="24" y="32" font-size="11" fill="#a09890" letter-spacing="3" font-family="sans-serif">WALLET SCORE CARD</text>',
            _buildGauge(s.totalScore, dashOffset),
            _buildTierLabel(s.totalScore),
            _buildBars(s),
            '</svg>'
        );
    }

    function _buildGauge(uint256 totalScore, uint256 dashOffset) internal pure returns (string memory) {
        return string.concat(
            '<path d="M55 195 A75 75 0 1 1 205 195" stroke="#e0d9d0" stroke-width="14" stroke-linecap="round" fill="none"/>',
            '<path d="M55 195 A75 75 0 1 1 205 195" stroke="#c85c1a" stroke-width="14" stroke-linecap="round" fill="none"',
            ' stroke-dasharray="188" stroke-dashoffset="', dashOffset.toString(), '"/>',
            '<text x="130" y="185" text-anchor="middle" font-size="40" font-weight="bold" fill="#1a1612" font-family="sans-serif">',
            totalScore.toString(), '</text>'
        );
    }

    function _buildTierLabel(uint256 totalScore) internal pure returns (string memory) {
        return string.concat(
            '<text x="130" y="215" text-anchor="middle" font-size="11" fill="#a09890" letter-spacing="3" font-family="sans-serif">',
            _getTier(totalScore), '</text>'
        );
    }

    function _buildBars(ScoreData memory s) internal pure returns (string memory) {
        return string.concat(
            _bar("Transactions", s.txScore,  "25%", 80),
            _bar("Wallet Age",   s.ageScore, "20%", 120),
            _bar("Volume",       s.volScore, "25%", 160),
            _bar("Contracts",    s.conScore, "20%", 200),
            _bar("Gas Fees",     s.feeScore, "10%", 240)
        );
    }

    function _bar(
        string memory label,
        uint256 score,
        string memory weight,
        uint256 y
    ) internal pure returns (string memory) {
        uint256 barWidth = score * 220 / 100;
        return string.concat(
            '<text x="240" y="', (y - 10).toString(), '" font-size="13" fill="#7a7268" font-family="sans-serif">', label, '</text>',
            '<text x="520" y="', (y - 10).toString(), '" text-anchor="end" font-size="13" font-weight="bold" fill="#1a1612" font-family="sans-serif">',
            (score / 10).toString(), '.', (score % 10).toString(), '/10</text>',
            '<text x="575" y="', (y - 10).toString(), '" text-anchor="end" font-size="12" fill="#a09890" font-family="sans-serif">', weight, '</text>',
            '<rect x="240" y="', y.toString(), '" width="220" height="6" rx="3" fill="#e0d9d0"/>',
            '<rect x="240" y="', y.toString(), '" width="', barWidth.toString(), '" height="6" rx="3" fill="#c85c1a"/>'
        );
    }

    function _getTier(uint256 score) internal pure returns (string memory) {
        if (score >= 85) return "PLATINUM";
        if (score >= 70) return "GOLD";
        if (score >= 50) return "SILVER";
        if (score >= 30) return "BRONZE";
        return "UNRANKED";
    }
}
