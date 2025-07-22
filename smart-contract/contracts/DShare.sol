// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract DShare {
    enum AccessType {
        Private,
        Public,
        Shared
    }

    struct FileMetadata {
        string fileName;
        string author;
        uint timestamp;
        string fileType;
        uint fileSize;
        string cid;
        AccessType access;
        address uploader;
    }

    struct FileAccessInfo {
        bytes32 fileHash;
        address uploader;
        address[] sharedWith;
    }

    struct FileDetails {
        string fileName;
        string author;
        uint timestamp;
        string fileType;
        uint fileSize;
        string cid;
        AccessType access;
        address[] sharedWith;
        address uploader;
    }

    address public owner;

    mapping(bytes32 => FileMetadata) public files;
    mapping(address => bool) public isBlocked;
    mapping(address => bytes32[]) private uploadedFiles;
    bytes32[] private publicAndSharedFiles;

    // Shared access tracking
    mapping(bytes32 => mapping(address => bool)) private sharedAccess;
    mapping(bytes32 => address[]) private sharedList;

    // Events
    event FileUploaded(bytes32 indexed fileHash, address indexed uploader, AccessType access);
    event FileShared(bytes32 indexed fileHash, address indexed sharedWith);
    event SharedAccessRevoked(bytes32 indexed fileHash, address indexed revokedUser);
    event AccessTypeChanged(bytes32 indexed fileHash, AccessType newAccess);
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

    // ───── Upload File ─────
    function uploadFile(
        string memory _fileName,
        string memory _author,
        string memory _fileType,
        uint _fileSize,
        string memory _cid,
        AccessType _access,
        address[] memory sharedWithList,
        address _uploader
    ) public notBlocked returns (bytes32 fileHash) {
        require(bytes(_fileName).length > 0, "File name cannot be empty");
        require(bytes(_cid).length > 0, "CID cannot be empty");
        require(_uploader != address(0), "Invalid uploader address");

        fileHash = keccak256(
            abi.encodePacked(_fileName, _author, _fileType, _fileSize, _cid, _access, _uploader, block.timestamp)
        );

        require(files[fileHash].timestamp == 0, "File already exists");

        FileMetadata storage file = files[fileHash];
        file.fileName = _fileName;
        file.author = _author;
        file.timestamp = block.timestamp;
        file.fileType = _fileType;
        file.fileSize = _fileSize;
        file.cid = _cid;
        file.access = _access;
        file.uploader = _uploader;

        uploadedFiles[_uploader].push(fileHash);

        if (_access == AccessType.Public || _access == AccessType.Shared) {
            publicAndSharedFiles.push(fileHash);
        }

        if (_access == AccessType.Shared) {
            require(sharedWithList.length > 0, "Shared list cannot be empty");
            for (uint i = 0; i < sharedWithList.length; i++) {
                address user = sharedWithList[i];
                require(user != address(0), "Invalid shared address");
                sharedAccess[fileHash][user] = true;
                sharedList[fileHash].push(user);
                emit FileShared(fileHash, user);
            }
        }

        emit FileUploaded(fileHash, _uploader, _access);
    }

    // ───── Get All Public and Shared Files with Access Info ─────
    function getAllPublicAndSharedFiles() public view returns (FileAccessInfo[] memory) {
        FileAccessInfo[] memory result = new FileAccessInfo[](publicAndSharedFiles.length);

        for (uint i = 0; i < publicAndSharedFiles.length; i++) {
            bytes32 fileHash = publicAndSharedFiles[i];
            FileMetadata storage file = files[fileHash];

            result[i] = FileAccessInfo({
                fileHash: fileHash,
                uploader: file.uploader,
                sharedWith: file.access == AccessType.Shared ? sharedList[fileHash] : new address[](0)
            });
        }

        return result;
    }

    // ───── Get File (with access control) ─────
    function getFile(bytes32 fileHash) public view notBlocked returns (FileDetails memory) {
        FileMetadata memory file = files[fileHash];
        require(file.timestamp != 0, "File does not exist");

        bool hasAccess = false;
        if (file.access == AccessType.Public) {
            hasAccess = true;
        } else if (file.access == AccessType.Private) {
            hasAccess = (file.uploader == msg.sender);
        } else if (file.access == AccessType.Shared) {
            hasAccess = (file.uploader == msg.sender || sharedAccess[fileHash][msg.sender]);
        }

        require(hasAccess, "Access denied");

        return FileDetails({
            fileName: file.fileName,
            author: file.author,
            timestamp: file.timestamp,
            fileType: file.fileType,
            fileSize: file.fileSize,
            cid: file.cid,
            access: file.access,
            sharedWith: file.access == AccessType.Shared ? sharedList[fileHash] : new address[](0),
            uploader: file.uploader
        });
    }

    // ───── Getters ─────
    function getMyUploadedFiles() public view returns (bytes32[] memory) {
        return uploadedFiles[msg.sender];
    }

    function getUploadedFilesByAddress(address user) public view returns (bytes32[] memory) {
        return uploadedFiles[user];
    }

    function isFileSharedWith(bytes32 fileHash, address user) public view returns (bool) {
        return sharedAccess[fileHash][user];
    }

    // ───── Change Access Type (with shared users update) ─────
    function changeAccessType(
        bytes32 fileHash,
        AccessType newAccess,
        address[] memory sharedUsers
    ) public notBlocked {
        FileMetadata storage file = files[fileHash];
        require(file.timestamp != 0, "File does not exist");
        require(file.uploader == msg.sender, "Only uploader can change access");

        // Revoke all old shared access if previous access was Shared
        if (file.access == AccessType.Shared) {
            address[] storage oldSharedUsers = sharedList[fileHash];
            for (uint i = 0; i < oldSharedUsers.length; i++) {
                sharedAccess[fileHash][oldSharedUsers[i]] = false;
                emit SharedAccessRevoked(fileHash, oldSharedUsers[i]);
            }
            delete sharedList[fileHash];
        }

        // Update access type
        file.access = newAccess;

        // If new access is Shared, set new shared users
        if (newAccess == AccessType.Shared) {
            require(sharedUsers.length > 0, "Shared access requires at least one user");
            for (uint i = 0; i < sharedUsers.length; i++) {
                address user = sharedUsers[i];
                require(user != address(0), "Invalid shared user address");
                sharedAccess[fileHash][user] = true;
                sharedList[fileHash].push(user);
                emit FileShared(fileHash, user);
            }
        }

        // Update publicAndSharedFiles list
        bool inList = false;
        for (uint i = 0; i < publicAndSharedFiles.length; i++) {
            if (publicAndSharedFiles[i] == fileHash) {
                inList = true;
                break;
            }
        }

        if (newAccess == AccessType.Public || newAccess == AccessType.Shared) {
            if (!inList) {
                publicAndSharedFiles.push(fileHash);
            }
        } else {
            if (inList) {
                for (uint i = 0; i < publicAndSharedFiles.length; i++) {
                    if (publicAndSharedFiles[i] == fileHash) {
                        publicAndSharedFiles[i] = publicAndSharedFiles[publicAndSharedFiles.length - 1];
                        publicAndSharedFiles.pop();
                        break;
                    }
                }
            }
        }

        emit AccessTypeChanged(fileHash, newAccess);
    }

    // ───── Admin Functions ─────
    function blockUser(address _user) public onlyOwner {
        isBlocked[_user] = true;
        emit UserBlocked(_user);
    }

    function unblockUser(address _user) public onlyOwner {
        isBlocked[_user] = false;
        emit UserUnblocked(_user);
    }
}
