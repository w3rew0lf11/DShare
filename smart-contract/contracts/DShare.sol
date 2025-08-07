// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DShare {
    enum AccessType {
        Private,
        Public,
        Shared
    }

    struct FileMetadata {
        string fileName;
        string author;
        uint256 timestamp;
        string fileType;
        uint256 fileSize;
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
        uint256 timestamp;
        string fileType;
        uint256 fileSize;
        string cid;
        AccessType access;
        address[] sharedWith;
        address uploader;
    }

    address public immutable owner;

    mapping(bytes32 => FileMetadata) public files;
    mapping(address => bool) public isBlocked;
    mapping(address => bytes32[]) private uploadedFiles;
    bytes32[] private publicAndSharedFiles;

    mapping(bytes32 => mapping(address => bool)) private sharedAccess;
    mapping(bytes32 => address[]) private sharedList;

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

    function uploadFile(
        string memory fileName,
        string memory author,
        string memory fileType,
        uint256 fileSize,
        string memory cid,
        AccessType access,
        address[] memory sharedWithList,
        address uploader
    ) public notBlocked returns (bytes32 fileHash) {
        require(bytes(fileName).length > 0, "File name cannot be empty");
        require(bytes(cid).length > 0, "CID cannot be empty");
        require(uploader != address(0), "Invalid uploader address");

        fileHash = keccak256(
            abi.encode(fileName, author, fileType, fileSize, cid, access, uploader, block.timestamp)
        );

        require(files[fileHash].uploader == address(0), "File already exists");

        files[fileHash] = FileMetadata({
            fileName: fileName,
            author: author,
            timestamp: block.timestamp,
            fileType: fileType,
            fileSize: fileSize,
            cid: cid,
            access: access,
            uploader: uploader
        });

        uploadedFiles[uploader].push(fileHash);

        if (access == AccessType.Public || access == AccessType.Shared) {
            publicAndSharedFiles.push(fileHash);
        }

        if (access == AccessType.Shared) {
            require(sharedWithList.length > 0, "Shared list cannot be empty");
            for (uint256 i = 0; i < sharedWithList.length; i++) {
                address user = sharedWithList[i];
                require(user != address(0), "Invalid shared address");
                sharedAccess[fileHash][user] = true;
                sharedList[fileHash].push(user);
                emit FileShared(fileHash, user);
            }
        }

        emit FileUploaded(fileHash, uploader, access);
    }

    function getAllPublicAndSharedFiles() public view returns (FileAccessInfo[] memory) {
        uint256 len = publicAndSharedFiles.length;
        FileAccessInfo[] memory result = new FileAccessInfo[](len);

        for (uint256 i = 0; i < len; i++) {
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

    function getFile(bytes32 fileHash) public view notBlocked returns (FileDetails memory) {
        FileMetadata memory file = files[fileHash];
        require(file.uploader != address(0), "File does not exist");

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

    function getMyUploadedFiles() public view returns (bytes32[] memory) {
        return uploadedFiles[msg.sender];
    }

    function getUploadedFilesByAddress(address user) public view returns (bytes32[] memory) {
        return uploadedFiles[user];
    }

    function isFileSharedWith(bytes32 fileHash, address user) public view returns (bool) {
        return sharedAccess[fileHash][user];
    }

    function changeAccessType(
        bytes32 fileHash,
        AccessType newAccess,
        address[] memory sharedUsers
    ) public notBlocked {
        FileMetadata storage file = files[fileHash];
        require(file.uploader != address(0), "File does not exist");
        require(file.uploader == msg.sender, "Only uploader can change access");

        if (file.access == AccessType.Shared) {
            address[] storage oldSharedUsers = sharedList[fileHash];
            for (uint256 i = 0; i < oldSharedUsers.length; i++) {
                sharedAccess[fileHash][oldSharedUsers[i]] = false;
                emit SharedAccessRevoked(fileHash, oldSharedUsers[i]);
            }
            delete sharedList[fileHash];
        }

        file.access = newAccess;

        if (newAccess == AccessType.Shared) {
            require(sharedUsers.length > 0, "Shared access requires at least one user");
            for (uint256 i = 0; i < sharedUsers.length; i++) {
                address user = sharedUsers[i];
                require(user != address(0), "Invalid shared user address");
                sharedAccess[fileHash][user] = true;
                sharedList[fileHash].push(user);
                emit FileShared(fileHash, user);
            }
        }

        bool inList = false;
        uint256 listLen = publicAndSharedFiles.length;
        for (uint256 i = 0; i < listLen; i++) {
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
                for (uint256 i = 0; i < listLen; i++) {
                    if (publicAndSharedFiles[i] == fileHash) {
                        publicAndSharedFiles[i] = publicAndSharedFiles[listLen - 1];
                        publicAndSharedFiles.pop();
                        break;
                    }
                }
            }
        }

        emit AccessTypeChanged(fileHash, newAccess);
    }

    function blockUser(address user) public onlyOwner {
        isBlocked[user] = true;
        emit UserBlocked(user);
    }

    function unblockUser(address user) public onlyOwner {
        isBlocked[user] = false;
        emit UserUnblocked(user);
    }
}
