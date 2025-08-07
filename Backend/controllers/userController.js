import User from "../models/userModel.js";
import generateTokenAndSetCookie from "../utils/generateToken.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;

    const filteredUsers = await User.find({
      _id: { $ne: userId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const userData = async (req, res) => {
  try {
    const { username, gender, walletAddress } = req.body;

    if (!username || !walletAddress) {
      console.log(`all field required`);
      return res.status(400).json({
        error: "All fields are required: username, walletAddress",
      });
    }

    const boyProfilePic = `https://avatar.iran.liara.run/public/boy?username=${username}`;
    const girlProfilePic = `https://avatar.iran.liara.run/public/girl?username=${username}`;

    const newUser = new User({
      username,
      gender,
      walletAddress,
      profilePic: gender === "male" ? boyProfilePic : girlProfilePic,
    });

    if (newUser) {
      generateTokenAndSetCookie(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        username: newUser.username,
        walletAddress: newUser.walletAddress,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("our_cookie", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "strict",
    path: "/",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// POST /api/users/check
export const checkUser = async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ message: "Wallet address required" });
  }

  try {
    const user = await User.findOne({ walletAddress });
    const token = generateTokenAndSetCookie(user._id, res);

    if (user) {
      return res.status(200).json({
        id: user._id,
        username: user.username,
        gender: user.gender,
        walletAddress: user.walletAddress,
        profilePic: user.profilePic,
        token,
        blockStatus: user.block,
      });
      console.log("User found:", token);
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const excludeId = req.query.exclude;
    // console.log(excludeId)
    const users = await User.find({ _id: { $ne: excludeId } }).select(
      "-password"
    );
    // console.log(users)
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/users/:id/block
export const updateBlockedStatus = async (req, res) => {
  const { id } = req.params;
  const { block } = req.body;

  try {
    const user = await User.findByIdAndUpdate(id, { block }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update block status" });
  }
};

export const updateUserProfile = async (req, res) => {
  const { walletAddress, username, gender } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ message: "Wallet address is required." });
  }

  try {
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update fields only if changed
    if (username) user.username = username;
    if (gender) user.gender = gender;

    const updatedUser = await user.save();

    return res.status(200).json({
      username: updatedUser.username,
      gender: updatedUser.gender,
      walletAddress: updatedUser.walletAddress,
      profilePic: updatedUser.profilePic,
      _id: updatedUser._id,
    });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};


export const getUsernameById = async (req, res) => {
  try {
    const userId = req.params.id

    const user = await User.findById(userId).select('username')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.status(200).json({ username: user.username })
  } catch (error) {
    console.error('Error fetching username:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}