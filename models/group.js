const mongoose = require("mongoose");

const groupSchema = mongoose.Schema(
  {
    groupName: { type: String, required: true},
    groupId: { type: String, required: true, unique: true },
    participants: [
      {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "User",
        required: true,
      },
    ],
    createdBy: { type: mongoose.Types.ObjectId, required: true },
  },
  {
    timestamps: {
      createdAt: "addedAt",
      updatedAt: "modifiedAt",
    },
    versionKey: false,
  }
);

const Groups = mongoose.model("Group", groupSchema);

module.exports = Groups;
