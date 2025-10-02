const mongoose = require("mongoose");

const roomSchema = mongoose.Schema(
  {
    roomName: { type: String, required: true, unique: true },
    participants: [
      {
        userId: {
          type: mongoose.Types.ObjectId,
          required: true,
          ref: "User",
        },
        _id: false,
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

const Rooms = mongoose.model("Room", roomSchema);

module.exports = Rooms;
