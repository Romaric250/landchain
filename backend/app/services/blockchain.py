"""Polygon blockchain integration (§15).

Uses web3.py against the deployed LandRegistry contract when configured
(POLYGON_RPC_URL + LANDREGISTRY_CONTRACT_ADDRESS + DEPLOYER_PRIVATE_KEY).
Only hash references go on-chain — never personal data or documents.

When not configured, on-chain writes are recorded as pending
(blockchain_tx_hash=None) and the record hash is still computed and stored,
so records can be anchored later by a backfill job.
"""

import hashlib
import json
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Minimal ABI for the LandRegistry contract (see backend/contracts/LandRegistry.sol)
LAND_REGISTRY_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "parcelReference", "type": "string"},
            {"internalType": "bytes32", "name": "recordHash", "type": "bytes32"},
        ],
        "name": "registerParcel",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"internalType": "bytes32", "name": "recordHash", "type": "bytes32"},
        ],
        "name": "recordTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


def is_configured() -> bool:
    return bool(
        settings.POLYGON_RPC_URL
        and settings.LANDREGISTRY_CONTRACT_ADDRESS
        and settings.DEPLOYER_PRIVATE_KEY
    )


def compute_record_hash(payload: dict[str, Any]) -> str:
    """Deterministic sha256 hash of the off-chain record — the only thing stored on-chain."""
    canonical = json.dumps(payload, sort_keys=True, default=str)
    return "0x" + hashlib.sha256(canonical.encode()).hexdigest()


def _get_contract():
    from web3 import Web3  # lazy import: web3 is optional in dev

    w3 = Web3(Web3.HTTPProvider(settings.POLYGON_RPC_URL))
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.LANDREGISTRY_CONTRACT_ADDRESS),
        abi=LAND_REGISTRY_ABI,
    )
    return w3, contract


def _send_tx(w3, fn) -> str:
    account = w3.eth.account.from_key(settings.DEPLOYER_PRIVATE_KEY)
    tx = fn.build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    return receipt.transactionHash.hex()


async def mint_parcel(parcel_reference: str, record: dict[str, Any]) -> dict:
    """Mint the parcel token on registration. Returns {tx_hash, token_id, record_hash}."""
    record_hash = compute_record_hash(record)
    if not is_configured():
        logger.info("Blockchain not configured — parcel %s anchored off-chain only (hash=%s)", parcel_reference, record_hash)
        return {"tx_hash": None, "token_id": None, "record_hash": record_hash}
    try:
        w3, contract = _get_contract()
        tx_hash = _send_tx(w3, contract.functions.registerParcel(parcel_reference, bytes.fromhex(record_hash[2:])))
        return {"tx_hash": tx_hash, "token_id": None, "record_hash": record_hash}
    except Exception as exc:  # on-chain failure must not block registration; backfill later
        logger.error("On-chain mint failed for %s: %s", parcel_reference, exc)
        return {"tx_hash": None, "token_id": None, "record_hash": record_hash, "error": str(exc)}


async def record_transfer(token_id: int | None, record: dict[str, Any]) -> dict:
    record_hash = compute_record_hash(record)
    if not is_configured() or token_id is None:
        return {"tx_hash": None, "record_hash": record_hash}
    try:
        w3, contract = _get_contract()
        tx_hash = _send_tx(w3, contract.functions.recordTransfer(token_id, bytes.fromhex(record_hash[2:])))
        return {"tx_hash": tx_hash, "record_hash": record_hash}
    except Exception as exc:
        logger.error("On-chain transfer failed for token %s: %s", token_id, exc)
        return {"tx_hash": None, "record_hash": record_hash, "error": str(exc)}
