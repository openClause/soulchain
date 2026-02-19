// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SoulRegistry {
    struct DocumentEntry {
        bytes32 contentHash;      // SHA-256 of plaintext (for agent verification)
        bytes32 encryptedHash;    // SHA-256 of ciphertext (for storage verification)
        string storageCid;        // IPFS or Arweave CID
        uint8 docType;            // SoulDocumentType enum value
        uint64 timestamp;         // block timestamp
        uint32 version;           // incrementing version per doc
        bytes32 prevHash;         // previous version's contentHash (chain linking)
        bytes signature;          // Ed25519 signature of contentHash (stored for off-chain verify)
    }

    // agent address => docType => version history
    mapping(address => mapping(uint8 => DocumentEntry[])) private documents;

    // agent address => registered flag
    mapping(address => bool) public registered;

    // agent address => reader address => docType => access granted
    mapping(address => mapping(address => mapping(uint8 => bool))) private accessGrants;

    // Document type constants (match SoulDocumentType enum)
    uint8 constant SOUL = 0;
    uint8 constant MEMORY = 1;
    uint8 constant AGENTS = 2;
    uint8 constant USER = 3;
    uint8 constant DAILY = 4;
    uint8 constant CHAT = 5;
    uint8 constant LOVE_MAP = 6;
    uint8 constant MUSING = 7;
    uint8 constant COACHING = 8;
    uint8 constant TOOLS = 9;
    uint8 constant IDENTITY = 10;

    event SoulRegistered(address indexed agent, uint64 timestamp);
    event DocumentWritten(address indexed agent, uint8 indexed docType, uint32 version, bytes32 contentHash, string storageCid);
    event AccessGranted(address indexed agent, address indexed reader, uint8 docType);
    event AccessRevoked(address indexed agent, address indexed reader, uint8 docType);

    modifier onlyRegistered() {
        require(registered[msg.sender], "Not registered");
        _;
    }

    modifier onlySoulOwner(address agent) {
        require(msg.sender == agent, "Not soul owner");
        _;
    }

    /// @notice Register a new soul (one-time, irreversible)
    function registerSoul() external {
        require(!registered[msg.sender], "Already registered");
        registered[msg.sender] = true;
        emit SoulRegistered(msg.sender, uint64(block.timestamp));
    }

    /// @notice Write a new version of a document
    function writeDocument(
        uint8 docType,
        bytes32 contentHash,
        bytes32 encryptedHash,
        string calldata storageCid,
        bytes calldata signature
    ) external onlyRegistered {
        DocumentEntry[] storage history = documents[msg.sender][docType];
        uint32 version = uint32(history.length);
        bytes32 prevHash = version > 0 ? history[version - 1].contentHash : bytes32(0);

        history.push(DocumentEntry({
            contentHash: contentHash,
            encryptedHash: encryptedHash,
            storageCid: storageCid,
            docType: docType,
            timestamp: uint64(block.timestamp),
            version: version,
            prevHash: prevHash,
            signature: signature
        }));

        emit DocumentWritten(msg.sender, docType, version, contentHash, storageCid);
    }

    /// @notice Get latest version of a document
    function latestDocument(address agent, uint8 docType) external view returns (DocumentEntry memory) {
        DocumentEntry[] storage history = documents[agent][docType];
        require(history.length > 0, "No documents");
        require(
            msg.sender == agent || accessGrants[agent][msg.sender][docType],
            "Access denied"
        );
        return history[history.length - 1];
    }

    /// @notice Get specific version
    function documentAt(address agent, uint8 docType, uint32 version) external view returns (DocumentEntry memory) {
        require(
            msg.sender == agent || accessGrants[agent][msg.sender][docType],
            "Access denied"
        );
        require(version < documents[agent][docType].length, "Version not found");
        return documents[agent][docType][version];
    }

    /// @notice Get total versions for a document type
    function documentCount(address agent, uint8 docType) external view returns (uint32) {
        return uint32(documents[agent][docType].length);
    }

    /// @notice Verify a document's integrity (anyone can verify hash, but not read content)
    function verifyDocument(address agent, uint8 docType, uint32 version, bytes32 expectedHash) external view returns (bool) {
        if (version >= documents[agent][docType].length) return false;
        return documents[agent][docType][version].contentHash == expectedHash;
    }

    /// @notice Grant read access to another address
    function grantAccess(address reader, uint8 docType) external onlyRegistered {
        accessGrants[msg.sender][reader][docType] = true;
        emit AccessGranted(msg.sender, reader, docType);
    }

    /// @notice Revoke read access
    function revokeAccess(address reader, uint8 docType) external onlyRegistered {
        accessGrants[msg.sender][reader][docType] = false;
        emit AccessRevoked(msg.sender, reader, docType);
    }

    /// @notice Check if access is granted
    function hasAccess(address agent, address reader, uint8 docType) external view returns (bool) {
        return agent == reader || accessGrants[agent][reader][docType];
    }
}
