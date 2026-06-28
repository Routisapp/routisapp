// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Aggregator.sol";

/**
 * @notice Temel birim testleri (Foundry ile çalıştırılır: forge test)
 */
contract AggregatorTest is Test {

    Aggregator public aggregator;
    address    public owner = address(this);

    // Test kurulumu
    function setUp() public {
        aggregator = new Aggregator();
    }

    // Owner doğru set edilmeli
    function test_ownerIsDeployer() public view {
        assertEq(aggregator.owner(), owner);
    }

    // Sabit adresler doğru olmalı
    function test_routerAddresses() public view {
        assertEq(aggregator.UNISWAP_ROUTER(),   0x2626664c2603336E57B271c5C0b26F421741e481);
        assertEq(aggregator.AERODROME_ROUTER(),  0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43);
        assertEq(aggregator.AERODROME_FACTORY(), 0x420DD381b31aEf6683db6B902084cB0FFECe40Da);
    }

    // Platform ücreti hesabı doğru olmalı: 1_000_000 * 5 / 10_000 = 500
    function test_calculateFee() public view {
        (uint256 fee, uint256 swapAmount) = aggregator.calculateFee(1_000_000);
        assertEq(fee,        500);
        assertEq(swapAmount, 999_500);
    }

    // Birikmiş ücret başlangıçta sıfır olmalı
    function test_initialFeesZero() public view {
        uint256 fees = aggregator.getPendingFees(
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 // USDC
        );
        assertEq(fees, 0);
    }

    // Owner olmayan biri ücret çekememeli
    function test_withdrawFees_notOwner() public {
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert("Aggregator: caller is not owner");
        aggregator.withdrawFees(
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            attacker
        );
    }

    // Owner sıfır adrese sahiplik devredemez
    function test_transferOwnership_zeroAddress() public {
        vm.expectRevert("Aggregator: zero address");
        aggregator.transferOwnership(address(0));
    }

    // Sahiplik devri doğru çalışmalı
    function test_transferOwnership() public {
        address newOwner = makeAddr("newOwner");
        aggregator.transferOwnership(newOwner);
        assertEq(aggregator.owner(), newOwner);
    }

    // amountIn = 0 ile swap revert etmeli
    function test_swapUniswap_zeroAmount() public {
        vm.expectRevert("Aggregator: amountIn is zero");
        aggregator.swapOnUniswap(
            0x4200000000000000000000000000000000000006, // WETH
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, // USDC
            0,   // amountIn = 0
            0,
            500
        );
    }

    // Aynı token ile swap revert etmeli
    function test_swapUniswap_identicalTokens() public {
        address weth = 0x4200000000000000000000000000000000000006;
        vm.expectRevert("Aggregator: identical tokens");
        aggregator.swapOnUniswap(weth, weth, 1 ether, 0, 500);
    }

    // Geçersiz fee tier revert etmeli
    function test_swapUniswap_invalidFeeTier() public {
        vm.expectRevert("Aggregator: invalid fee tier");
        aggregator.swapOnUniswap(
            0x4200000000000000000000000000000000000006,
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            1 ether,
            0,
            1234  // geçersiz fee
        );
    }

    // Aerodrome: amountIn = 0 ile swap revert etmeli
    function test_swapAerodrome_zeroAmount() public {
        vm.expectRevert("Aggregator: amountIn is zero");
        aggregator.swapOnAerodrome(
            0x4200000000000000000000000000000000000006,
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            0,
            0,
            false
        );
    }

    // ETH gönderimi revert etmeli
    function test_receiveEth_reverts() public {
        vm.expectRevert("Aggregator: ETH not accepted");
        (bool ok, ) = address(aggregator).call{value: 1 ether}("");
        // expectRevert zaten yakalar, ama derleyici ok kullanılmamış uyarısı vermesin
        assertTrue(!ok || ok); // no-op assertion
    }

    // calculateFee fuzz testi: her zaman fee + swapAmount == amountIn olmalı
    function testFuzz_calculateFee(uint256 amountIn) public view {
        vm.assume(amountIn <= type(uint128).max); // overflow önle
        (uint256 fee, uint256 swapAmount) = aggregator.calculateFee(amountIn);
        assertEq(fee + swapAmount, amountIn);
    }
}
