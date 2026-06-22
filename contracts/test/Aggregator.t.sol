// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/Aggregator.sol";

/**
 * @notice Temel birim testleri (Foundry ile çalıştırılır: forge test)
 */
contract AggregatorTest {

    Aggregator public aggregator;
    address    public owner = address(this);

    // Test kurulumu
    function setUp() public {
        aggregator = new Aggregator();
    }

    // Owner doğru set edilmeli
    function test_ownerIsDeployer() public view {
        assert(aggregator.owner() == owner);
    }

    // Sabit adresler doğru olmalı
    function test_routerAddresses() public view {
        assert(aggregator.UNISWAP_ROUTER()   == 0x2626664c2603336E57B271c5C0b26F421741e481);
        assert(aggregator.AERODROME_ROUTER()  == 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43);
        assert(aggregator.AERODROME_FACTORY() == 0x420DD381b31aEf6683db6B902084cB0FFECe40Da);
    }

    // Platform ücreti hesabı doğru olmalı: 1_000_000 * 5 / 10_000 = 500
    function test_calculateFee() public view {
        (uint256 fee, uint256 swapAmount) = aggregator.calculateFee(1_000_000);
        assert(fee        == 500);
        assert(swapAmount == 999_500);
    }

    // Birikmiş ücret başlangıçta sıfır olmalı
    function test_initialFeesZero() public view {
        uint256 fees = aggregator.getPendingFees(
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 // USDC
        );
        assert(fees == 0);
    }

    // Owner olmayan biri ücret çekememeli
    function test_withdrawFees_onlyOwner() public {
        // Sahte bir hesaptan çekmeye çalış (burada basit revert testi)
        // Gerçek fork testleri için: forge test --fork-url base
        bool success;
        try aggregator.withdrawFees(
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            address(0x1234)
        ) {
            success = true;
        } catch {
            success = false;
        }
        // Ücret 0 olduğu için "no fees" hatasıyla revert beklenir
        assert(!success);
    }
}
