import { BadRequestError } from "../../utils/api-errors.js";
import {
  conditionEmptyฺBody,
  encryptPassword,
} from "../../utils/helper.util.js";
import mongoDB from "../../configs/mongo.config.js";

const getUserData = async ({
  page = 1,
  pageSize = 2,
  sortTitle,
  sortType,
  search,
  searchPipeline,
}) => {
  try {
    const db = await mongoDB();
    const ref = db.collection("users");
    let pipeline = [];
    if (sortTitle && sortType) {
      pipeline.push({ $sort: { [sortTitle]: sortType === "desc" ? -1 : 1 } });
    }
    pipeline.push({ $skip: (page - 1) * pageSize });
    pipeline.push({ $limit: pageSize });
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
    if (search) {
      pipeline = [...pipeline, ...searchPipeline];
    }
    pipeline.push({
      $unwind: "$userType",
    });
    pipeline.push({
      $project: {
        userID: "$_id",
        userType: "$userType.name",
        username: 1,
        date: "$createdAt",
      },
    });
    const response = await ref.aggregate(pipeline).toArray();
    // remove name of userType as SuperAdmin
    const result = response.filter((res) => res.userType !== "SuperAdmin");
    return result;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const getUserByIDData = async (key) => {
  try {
    const db = await mongoDB();
    const snapshot = db.collection("users");
    let pipeline = [];
    pipeline.push({ $match: { _id: key, status: { $eq: 1 } } });
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
        userID: "$_id",
        userType: 1,
        date: "$createdAt",
        password: 0,
        refreshToken: 0,
      },
    });
    const result = await snapshot.aggregate(pipeline).next();

    return result;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const addUserData = async (body) => {
  try {
    let data = conditionEmptyฺBody(body);
    if (checkIsUpdateToSuperAdmin(data.userType)) {
      throw new BadRequestError("Can't add Super admin");
    }
    data.password = encryptPassword(data.password);
    data.status = 1;
    const db = await mongoDB();
    const snapshot = db.collection("users");
    const result = await snapshot.insertOne(data);
    if (result.insertedCount === 0) {
      throw new BadRequestError("Can't add user");
    }
    return data;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const updateUserData = async (body, id) => {
  try {
    let data = conditionEmptyฺBody(body);
    if (data.userType && checkIsUpdateToSuperAdmin(data.userType)) {
      throw new BadRequestError("Can't update to Super admin");
    }
    if (data.password) {
      data.password = encryptPassword(data.password);
    }
    const db = await mongoDB();
    const snapshot = db.collection("users");
    const filter = { _id: id };

    const result = await snapshot.updateOne(filter, { $set: data });
    if (result.modifiedCount === 0) {
      throw new BadRequestError("Can't update user");
    }
    return data;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const deleteUserData = async (id, itSelftID) => {
  try {
    if (checkIsAganistItSelf(itSelftID, id)) {
      throw new BadRequestError("Can't delete yourself");
    }
    if (checkIsGodAdmin(id)) {
      throw new BadRequestError("Can't delete Super admin");
    }
    const db = await mongoDB();
    const snapshot = db.collection("users");
    const filter = { _id: id };
    // status to 0
    const result = await snapshot.updateOne(filter, { $set: { status: 0 } });
    if (result.modifiedCount === 0) {
      throw new BadRequestError("Can't delete user");
    }
    return result;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const getAllUserCount = async (search, searchPipeline) => {
  try {
    const db = await mongoDB();
    const snapshot = db.collection("users");
    let pipeline = [];
    pipeline.push({ $match: { status: { $eq: 1 } } });
    if (search) {
      pipeline = [...searchPipeline, ...pipeline];
    }
    pipeline.push({ $count: "total" });
    const total = await snapshot.aggregate(pipeline).next();
    const totalData = total ? total.total : 0;
    return totalData;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const getUserType = async () => {
  try {
    const mongo_DB = await mongoDB();
    const snapshot = mongo_DB.collection("userType");
    let pipeline = [];
    pipeline.push({ $match: { status: { $eq: 1 } } });
    pipeline.push({ $project: { id: "$_id", name: 1 } });
    const query_res = await snapshot.aggregate(pipeline).toArray();
    // remove name of userType as SuperAdmin
    const result = query_res.filter((res) => res.name !== "SuperAdmin");
    return result;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

function checkIsAganistItSelf(requesterID, userid) {
  if (requesterID === userid) {
    return true;
  }
  return false;
}

function checkIsUpdateToSuperAdmin(userType) {
  if (userType === "SuperAdmin") {
    return true;
  }
  return false;
}

const checkIsGodAdmin = async (id) => {
  const db = await mongoDB();
  const snapshot = db.collection("users");
  let pipeline = [];
  pipeline.push({ $match: { _id: id, status: { $eq: 1 } } });
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
  pipeline.push({ $project: { userType: "$userType.name" } });
  const result = await snapshot.aggregate(pipeline).next();
  if (result.userType === "SuperAdmin") {
    return true;
  }
  return false;
};

export {
  getAllUserCount,
  getUserData,
  getUserByIDData,
  addUserData,
  updateUserData,
  deleteUserData,
  getUserType,
};
