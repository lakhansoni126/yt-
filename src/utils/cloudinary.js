import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_APIKEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloud = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const reponse = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // console.log("FILE UPLOADED", reponse.url);
    fs.unlinkSync(localFilePath);
    return reponse;
  } catch (error) {
    fs.unlinkSync(localFilePath); // delete local file
  }
};

export { uploadOnCloud };
