// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ScoreCard.sol";

/**
 * @title  DeployScoreCard
 * @notice ScoreCard kontratını Base mainnet'e deploy eder.
 *
 * Gereksinimler:
 *   - contracts/.env dosyasında PRIVATE_KEY tanımlı olmalı
 *   - Cüzdanda Base mainnet ETH bulunmalı
 *
 * Deploy komutu:
 *   forge script script/DeployScoreCard.s.sol \
 *     --rpc-url base \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract DeployScoreCard is Script {
    function run() external returns (ScoreCard scoreCard) {

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("--------------------------------------------");
        console.log("Deployer adresi :", deployer);
        console.log("Network         : Base Mainnet");
        console.log("--------------------------------------------");

        vm.startBroadcast(deployerPrivateKey);

        scoreCard = new ScoreCard();

        vm.stopBroadcast();

        console.log("--------------------------------------------");
        console.log("ScoreCard deploy edildi!");
        console.log("Kontrat adresi  :", address(scoreCard));
        console.log("Basescan linki  :");
        console.log(
            string.concat(
                "https://basescan.org/address/",
                vm.toString(address(scoreCard))
            )
        );
        console.log("--------------------------------------------");
    }
}
