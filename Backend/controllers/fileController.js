import File from "../models/fileModel.js";


export const allFiles = async (req, res) => {
  try {
    const files = await File.find({ privacy: "public" }).sort({
      uploadedAt: -1,
    });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch all files" });
  }
};

export const uploadFile = async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: "Missing walletAddress in query" });
    }

    const files = await File.find({ walletAddress }).sort({ createdAt: -1 }); // match logged-in user
    res.json(files);
    console.log(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

export const getPublicFiles = async (req, res) => {
  try {
    const publicFiles = await File.find({ privacy: "public" }).sort({
      createdAt: -1,
    });
    res.json(publicFiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch public files" });
  }
};

//To fetch the file for Admin
export const getAdminFile = async (req, res) => {
  try {
    const files = await File.find().sort({ uploadedAt: -1 }); // show newest first
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

export const displayFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });
    res.json(file);
    console.log(file);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error retrieving file" });
  }
};


export const getRecentFiles = async (req, res) => {
  try {
    const recentFiles = await File.find({})
      .sort({ createdAt: -1 })
      .limit(4)
      .select("filename type username createdAt size")
      .exec();

    res.json(recentFiles);
  } catch (error) {
    console.error("Error fetching recent files:", error);
    res.status(500).json({ error: "Failed to fetch recent files" });
  }
};

export const getTotalFilesCount = async (req, res) => {
  try {
    const count = await File.countDocuments();
    res.status(200).json({ totalFiles: count });
  } catch (error) {
    console.error("Error fetching total files count:", error);
    res.status(500).json({ message: "Failed to fetch total files count." });
  }
};

export const updateFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const { privacy, sharedWith } = req.body;

    const updatedFile = await File.findByIdAndUpdate(
      fileId,
      {
        privacy,
        sharedWith: sharedWith || [],
      },
      { new: true }
    );

    res.status(200).json(updatedFile);
  } catch (err) {
    res.status(500).json({ error: "Failed to update file" });
  }
};

export const getSharedFiles = async (req, res) => {
  try {
    const sharedFiles = await File.find({ privacy: "shared" }).sort({
      createdAt: -1,
    });
    res.json(sharedFiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shared files" });
  }
};

export const getPrivateFiles = async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: "Missing walletAddress in query" });
    }

    const privateFiles = await File.find({
      walletAddress,
      privacy: "private",
    }).sort({ createdAt: -1 });

    res.json(privateFiles);
  } catch (err) {
    console.error("Error fetching private files:", err);
    res.status(500).json({ error: "Failed to fetch private files" });
  }
};
