// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract DShare {
    enum AccessType { Private, Public, Shared }

    struct FileMetadata {
        string fileName;
        string author;
        uint timestamp;
        string fileType;
        uint fileSize;
        string cid;
        AccessType access;
        address sharedWith;
        address uploader;
    }

    address public owner;

    mapping(bytes32 => FileMetadata) public files;
    mapping(address => bool) public isBlocked;
    mapping(string => bool) private cidExists; // New mapping to track used CIDs

    event FileUploaded(bytes32 indexed fileHash, address indexed uploader, AccessType access);
    event UserBlocked(address indexed user);
    event UserUnblocked(address indexed user);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    modifier notBlocked() {
        require(!isBlocked[msg.sender], "You are blocked from using this contract");
        _;
    }

    function uploadFile(
        string memory _fileName,
        string memory _author,
        string memory _fileType,
        uint _fileSize,
        string memory _cid,
        AccessType _access,
        address _sharedWith
    ) public notBlocked returns (bytes32 fileHash) {
        require(!cidExists[_cid], "CID already exists"); //  Prevent duplicate CID

        fileHash = keccak256(abi.encodePacked(
            _fileName, _author, block.timestamp, _fileType, _fileSize, _cid
        ));

        require(files[fileHash].timestamp == 0, "File already exists");

        FileMetadata storage file = files[fileHash];
        file.fileName = _fileName;
        file.author = _author;
        file.timestamp = block.timestamp;
        file.fileType = _fileType;
        file.fileSize = _fileSize;
        file.cid = _cid;
        file.access = _access;
        file.uploader = msg.sender;

        if (_access == AccessType.Shared) {
            file.sharedWith = _sharedWith;
        }

        cidExists[_cid] = true; //  Mark this CID as used
        emit FileUploaded(fileHash, msg.sender, _access);
    }

    function getFile(bytes32 fileHash) public view notBlocked returns (
        string memory, string memory, uint, string memory, uint, string memory
    ) {
        FileMetadata memory file = files[fileHash];

        require(
            file.access == AccessType.Public ||
            (file.access == AccessType.Private && file.uploader == msg.sender) ||
            (file.access == AccessType.Shared &&
                (file.uploader == msg.sender || file.sharedWith == msg.sender)),
            "You don't have access to this file"
        );

        return (
            file.fileName,
            file.author,
            file.timestamp,
            file.fileType,
            file.fileSize,
            file.cid
        );
    }

    function generateFileHash(
        string memory _fileName,
        string memory _author,
        string memory _fileType,
        uint _fileSize,
        string memory _cid
    ) public view notBlocked returns (bytes32) {
        return keccak256(abi.encodePacked(
            _fileName, _author, block.timestamp, _fileType, _fileSize, _cid
        ));
    }

    function blockUser(address _user) public onlyOwner {
        isBlocked[_user] = true;
        emit UserBlocked(_user);
    }

    function unblockUser(address _user) public onlyOwner {
        isBlocked[_user] = false;
        emit UserUnblocked(_user);
    }
}

