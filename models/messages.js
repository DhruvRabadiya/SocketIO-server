const mongoose = require("mongoose");

const messagesSchema = mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Types.ObjectId,
      required: true,
      refPath: "onModel",
    },
    onModel: {
      type: String,
      required: true,
      enum: ["Room", "Group"],
    },
    senderId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    },
    senderUsername: { type: String },
    text: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    tempId: {
      type: String,
      unique: true,
    },
    deliveredTo: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: {
      createdAt: "addedAt",
      updatedAt: "modifiedAt",
    },
    versionKey: false,
  }
);

const Messages = mongoose.model("Messages", messagesSchema);

module.exports = Messages;
