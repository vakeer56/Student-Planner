const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
    {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    name: {
        type: String,
        required: true,
        trim: true,
    },

    color: {
      type: String, // for UI & heatmap
        default: "#4f46e5",
    },

    icon: {
        type: String,
        default: null,
    },

    isArchived: {
        type: Boolean,
        default: false,
    },
    },
    { timestamps: true }
);

// To prevent duplicates (it is by varun not by ai)
CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Category", CategorySchema);
