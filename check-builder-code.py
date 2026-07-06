import requests

tx_hash = "0x046927c4b92941deff7eda78059774264a1d024fdcfd1b896b65e236e9036be1"

# Base RPC endpoint
rpc_url = "https://mainnet.base.org"

# Get transaction data
payload = {
    "jsonrpc": "2.0",
    "method": "eth_getTransactionByHash",
    "params": [tx_hash],
    "id": 1
}

response = requests.post(rpc_url, json=payload)
data = response.json()

if "result" in data and data["result"]:
    tx = data["result"]
    input_data = tx.get("input", "")
    
    print(f"Transaction Hash: {tx_hash}")
    print(f"Input Data Length: {len(input_data)} characters")
    print(f"\nLast 100 characters of input data:")
    print(input_data[-100:] if len(input_data) > 100 else input_data)
    
    # Check for builder code pattern (8021 repeated)
    if len(input_data) >= 32:
        last_32_chars = input_data[-32:]
        print(f"\nLast 32 characters (16 bytes): {last_32_chars}")
        
        if last_32_chars == "80218021802180218021802180218021":
            print("✅ BUILDER CODE DETECTED! Transaction has ERC-8021 attribution suffix")
        else:
            print("❌ NO BUILDER CODE! Last 32 characters don't match the 8021 pattern")
            
            # Try to decode if there's a builder code
            if "62635f" in input_data:  # "bc_" in hex
                print("\n⚠️  Found 'bc_' pattern in the data, but not at the end")
    else:
        print("❌ Input data too short to contain builder code")
else:
    print("❌ Failed to fetch transaction data")
