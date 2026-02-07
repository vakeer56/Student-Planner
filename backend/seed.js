const mongoose = require("mongoose");
require("dotenv").config({ path: "backend/.env" });
const Category = require("./models/category.model");

const seed = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error("MONGO_URI not found in .env");
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const userId = "000000000000000000000001";
        const categoryName = "General Study";

        let category = await Category.findOne({ userId, name: categoryName });

        if (!category) {
            category = await Category.create({
                userId,
                name: categoryName,
                color: "#4f46e5",
                icon: "book",
            });
            console.log("Created category:", category);
        } else {
            console.log("Category already exists:", category);
        }

        console.log(`CATEGORY_ID=${category._id}`);
        process.exit(0);
    } catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    }
};

seed();
