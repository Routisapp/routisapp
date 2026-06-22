// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Aggregator.sol";

/**
 * @title  DeployAggregator
 * @notice Aggregator kontratını Base Sepolia test ağına deploy eder.
 *
 * Gereksinimler:
 *   - contracts/.env dosyasında PRIVATE_KEY tanımlı olmalı
 *   - Cüzdanda Base Sepolia ETH bulunmalı (faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
 *
 * Deploy komutu:
 *   forge script script/Deploy.s.sol \
 *     --rpc-url base_sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract DeployAggregator is Script {

    function run() external returns (Aggregator aggregator) {

        // .env'den private key oku
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Deployer adresini hesapla ve konsola yaz
        address deployer = vm.addr(deployerPrivateKey);
        console.log("--------------------------------------------");
        console.log("Deployer adresi :", deployer);
        console.log("Network         : Base Sepolia");
        console.log("--------------------------------------------");

        // Broadcast: bundan sonraki tx'ler zincire gönderilir
        vm.startBroadcast(deployerPrivateKey);

        aggregator = new Aggregator();

        vm.stopBroadcast();

        // Deploy edilen adresi konsola yaz
        console.log("--------------------------------------------");
        console.log("Aggregator deploy edildi!");
        console.log("Kontrat adresi  :", address(aggregator));
        console.log("Basescan linki  :");
        console.log(
            string.concat(
                "https://sepolia.basescan.org/address/",
                vm.toString(address(aggregator))
            )
        );
        console.log("--------------------------------------------");
    }
}
