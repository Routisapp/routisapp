// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AggregatorSwap
 * @notice Base ağı DEX Aggregator - Uniswap V3 ve Aerodrome üzerinden swap yapar
 * @dev Basescan'de bu kontrat adresi görünecek
 */
contract AggregatorSwap {
    address public owner;

    // Uniswap V3 Router (Base mainnet)
    address public constant UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;

    // Aerodrome Router (Base mainnet)
    address public constant AERODROME_ROUTER = 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;

    event SwapExecuted(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        string dex
    );

    constructor() {
        owner = msg.sender;
    }

    // Sonraki adımda swap fonksiyonları eklenecek
}
