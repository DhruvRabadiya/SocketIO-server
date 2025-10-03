const mongoose = require("mongoose");

const messagesSchema = mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Room",
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
