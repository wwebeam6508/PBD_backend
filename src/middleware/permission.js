import jwt from "jsonwebtoken";
import { createRequire } from "module";
import mongoDB from "../configs/mongo.config.js";
import { ObjectId } from "mongodb";
const require = createRequire(import.meta.url);
const dotenv = require("dotenv");
const env = dotenv.config().parsed;

export default (permission_group, permission_name) =>
  async (req, res, next) => {
    try {
      const token = req.header("Authorization").split(" ")[1];
      const decoded = jwt.verify(token, env.JWT_ACCESS_TOKEN_SECRET, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expiresIn: env.JWT_ACCESS_TOKEN_EXPIRE,
      });
      req.user = decoded;
      const userID = req.user.data.userID;

      const user = await getUserByID(userID);
      if (!user) {
        throw {
          status: 401,
          message: "ไม่พบผู้ใช้",
        };
      }
      const userTypeID = req.user.data.userType.userTypeID;
      if (user.userType.userTypeID.toString() !== userTypeID) {
        throw {
          status: 403,
          message: "มีการดัดแปลง token ไม่ถูกต้อง",
        };
      }

      if (permission_group === "SuperAdmin") {
        if (user.userType.name === "SuperAdmin") {
          next();
        } else {
          throw {
            status: 403,
            message: "ไม่มีสิทธิ์ในการเข้าถึง",
          };
        }
      } else {
        const permissions = user.userType.permission;
        if (permissions[permission_group][permission_name]) {
          next();
        } else {
          throw {
            status: 403,
            message: "ไม่มีสิทธิ์ในการเข้าถึง",
          };
        }
      }
    } catch (error) {
      const error_code = error.code ? error.code : 500;
      return res.status(error_code).send({
        error: {
          message: error.message,
          code: error_code ? error_code : 500,
        },
      });
    }
  };

async function getUserByID(userID) {
  const db = await mongoDB();
  let pipeline = [];
  pipeline.push({
    $match: {
      _id: new ObjectId(userID),
      status: {
        $eq: 1,
      },
    },
  });
  pipeline.push({
    $addFields: {
      userTypeID: { $toObjectId: "$userTypeID.$id" },
    },
  });
  pipeline.push({
    $lookup: {
      from: "userType",
      localField: "userTypeID",
      foreignField: "_id",
      as: "userType",
    },
  });
  pipeline.push({
    $unwind: "$userType",
  });
  pipeline.push({
    $project: {
      userType: {
        userTypeID: "$userType._id",
        name: "$userType.name",
        permission: "$userType.permission",
      },
    },
  });
  const ref = db.collection("users");
  return await ref.aggregate(pipeline).next();
}
