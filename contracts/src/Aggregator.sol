// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────
//  Minimal arayüzler  (harici kütüphane gerekmez)
// ─────────────────────────────────────────────────────────────

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/// @dev Return değerini kontrol eden güvenli ERC20 yardımcıları
library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        bool ok = token.transfer(to, amount);
        require(ok, "SafeERC20: transfer failed");
    }
    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        bool ok = token.transferFrom(from, to, amount);
        require(ok, "SafeERC20: transferFrom failed");
    }
}

/// @dev Uniswap V3 SwapRouter02 – exactInputSingle
interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params)
        external returns (uint256 amountOut);
}

/// @dev Aerodrome Router – swapExactTokensForTokens
interface IAerodromeRouter {
    struct Route {
        address from;
        address to;
        bool    stable;
        address factory;
    }
    function swapExactTokensForTokens(
        uint256        amountIn,
        uint256        amountOutMin,
        Route[] calldata routes,
        address        to,
        uint256        deadline
    ) external returns (uint256[] memory amounts);
}

// ─────────────────────────────────────────────────────────────
//  Minimal ReentrancyGuard  (OpenZeppelin'e bağımlılık yok)
// ─────────────────────────────────────────────────────────────
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;
    uint256 private _status;

    constructor() { _status = _NOT_ENTERED; }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// ─────────────────────────────────────────────────────────────
//  Aggregator
// ─────────────────────────────────────────────────────────────

/**
 * @title  Aggregator
 * @notice Base ağı DEX Aggregator.
 *         Uniswap V3 ve Aerodrome üzerinden swap yapar.
 *         Basescan'de bu kontrat adresi işlemlerde görünür.
 * @dev    Platform ücreti kullanıcıdan kesilir ve owner tarafından çekilir.
 */
contract Aggregator is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Sabitler ──────────────────────────────────────────────

    /// @notice Uniswap V3 SwapRouter02 (Base mainnet)
    address public constant UNISWAP_ROUTER =
        0x2626664c2603336E57B271c5C0b26F421741e481;

    /// @notice Aerodrome Router (Base mainnet)
    address public constant AERODROME_ROUTER =
        0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;

    /// @notice Aerodrome Factory (Base mainnet)
    address public constant AERODROME_FACTORY =
        0x420DD381b31aEf6683db6B902084cB0FFECe40Da;

    /// @notice Platform ücreti: 5 / 10_000 = %0.05
    uint256 public constant PLATFORM_FEE_BPS = 5;
    uint256 public constant BPS_DENOMINATOR   = 10_000;

    // ── Durum değişkenleri ────────────────────────────────────

    address public owner;

    /// @notice token → birikmiş ücret miktarı
    mapping(address => uint256) public accumulatedFees;

    // ── Olaylar ───────────────────────────────────────────────

    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        string  dex
    );

    event FeeWithdrawn(address indexed token, uint256 amount, address to);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ── Modifier'lar ──────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Aggregator: caller is not owner");
        _;
    }

    // ── Yapıcı ───────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────
    //  Dışa açık swap fonksiyonları
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Uniswap V3 üzerinden swap yap.
     * @param tokenIn          Gönderilecek token adresi
     * @param tokenOut         Alınacak token adresi
     * @param amountIn         Gönderilecek miktar (tokenIn ondalıklarında)
     * @param amountOutMinimum Slippage koruması: minimum alınacak miktar
     * @param fee              Uniswap havuz ücreti (500 / 3000 / 10000)
     * @return amountOut       Kullanıcının aldığı net miktar
     */
    function swapOnUniswap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24  fee
    )
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        require(amountIn > 0,          "Aggregator: amountIn is zero");
        require(tokenIn  != tokenOut,  "Aggregator: identical tokens");
        require(fee == 500 || fee == 3000 || fee == 10000, "Aggregator: invalid fee tier");

        // 1. Kullanıcıdan tokenları al
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // 2. Platform ücretini hesapla ve ayır
        uint256 platformFee  = (amountIn * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 swapAmount   = amountIn - platformFee;
        accumulatedFees[tokenIn] += platformFee;

        // 3. Router'a onay ver
        _approveIfNeeded(tokenIn, UNISWAP_ROUTER, swapAmount);

        // 4. Swap yap
        IUniswapV3Router.ExactInputSingleParams memory params =
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          tokenOut,
                fee:               fee,
                recipient:         msg.sender,
                amountIn:          swapAmount,
                amountOutMinimum:  amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        amountOut = IUniswapV3Router(UNISWAP_ROUTER).exactInputSingle(params);

        require(amountOut >= amountOutMinimum, "Aggregator: slippage exceeded");

        emit SwapExecuted(
            msg.sender, tokenIn, tokenOut,
            amountIn, amountOut, platformFee, "Uniswap V3"
        );
    }

    /**
     * @notice Aerodrome üzerinden swap yap.
     * @param tokenIn          Gönderilecek token adresi
     * @param tokenOut         Alınacak token adresi
     * @param amountIn         Gönderilecek miktar
     * @param amountOutMinimum Slippage koruması: minimum alınacak miktar
     * @param stable           true = stable havuz, false = volatile havuz
     * @return amountOut       Kullanıcının aldığı net miktar
     */
    function swapOnAerodrome(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        bool    stable
    )
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        require(amountIn > 0,         "Aggregator: amountIn is zero");
        require(tokenIn != tokenOut,  "Aggregator: identical tokens");

        // 1. Kullanıcıdan tokenları al
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // 2. Platform ücretini hesapla ve ayır
        uint256 platformFee = (amountIn * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 swapAmount  = amountIn - platformFee;
        accumulatedFees[tokenIn] += platformFee;

        // 3. Router'a onay ver
        _approveIfNeeded(tokenIn, AERODROME_ROUTER, swapAmount);

        // 4. Route oluştur
        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](1);
        routes[0] = IAerodromeRouter.Route({
            from:    tokenIn,
            to:      tokenOut,
            stable:  stable,
            factory: AERODROME_FACTORY
        });

        // 5. Swap yap
        uint256[] memory amounts = IAerodromeRouter(AERODROME_ROUTER)
            .swapExactTokensForTokens(
                swapAmount,
                amountOutMinimum,
                routes,
                msg.sender,
                block.timestamp + 300   // 5 dakika deadline
            );

        amountOut = amounts[amounts.length - 1];

        require(amountOut >= amountOutMinimum, "Aggregator: slippage exceeded");

        emit SwapExecuted(
            msg.sender, tokenIn, tokenOut,
            amountIn, amountOut, platformFee, "Aerodrome"
        );
    }

    // ─────────────────────────────────────────────────────────
    //  Owner fonksiyonları
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Birikmiş platform ücretlerini çek.
     * @dev    Yalnızca owner çağırabilir.
     * @param token  Çekilecek token adresi
     * @param to     Ücretin gönderileceği adres
     */
    function withdrawFees(address token, address to) external onlyOwner {
        require(to != address(0), "Aggregator: zero address");
        uint256 amount = accumulatedFees[token];
        require(amount > 0, "Aggregator: no fees to withdraw");

        accumulatedFees[token] = 0;
        IERC20(token).safeTransfer(to, amount);

        emit FeeWithdrawn(token, amount, to);
    }

    /**
     * @notice Kontrat sahipliğini devret.
     * @param newOwner Yeni owner adresi
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Aggregator: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─────────────────────────────────────────────────────────
    //  Yardımcı fonksiyonlar
    // ─────────────────────────────────────────────────────────

    /**
     * @dev Mevcut allowance yetersizse sıfırla ve tekrar onayla.
     *      Bazı token'lar (USDT gibi) sıfırlamadan onay değiştirmeye izin vermez.
     */
    function _approveIfNeeded(
        address token,
        address spender,
        uint256 amount
    ) internal {
        uint256 current = IERC20(token).allowance(address(this), spender);
        if (current < amount) {
            if (current > 0) {
                IERC20(token).approve(spender, 0);
            }
            IERC20(token).approve(spender, type(uint256).max);
        }
    }

    // ─────────────────────────────────────────────────────────
    //  Görünüm fonksiyonları
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Belirli bir token için birikmiş ücreti döndürür.
     */
    function getPendingFees(address token) external view returns (uint256) {
        return accumulatedFees[token];
    }

    /**
     * @notice Verilen amountIn için platform ücretini ve net swap miktarını döndürür.
     */
    function calculateFee(uint256 amountIn)
        external
        pure
        returns (uint256 platformFee, uint256 swapAmount)
    {
        platformFee = (amountIn * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        swapAmount  = amountIn - platformFee;
    }

    /// @dev Yanlışlıkla gönderilen ETH'i reddet
    receive() external payable { revert("Aggregator: ETH not accepted"); }
}
