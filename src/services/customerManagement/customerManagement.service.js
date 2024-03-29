import { BadRequestError } from "../../utils/api-errors.js";
import mongoDB from "../../configs/mongo.config.js";
import { ObjectId } from "mongodb";

const getCustomers = async ({
  page = 1,
  pageSize = 5,
  sortTitle,
  sortType,
  search,
  searchPipeline,
}) => {
  try {
    const offset = pageSize * (page - 1);
    const db = await mongoDB();
    const snapshot = db.collection("customers");
    let pipeline = [];
    if (sortTitle && sortType) {
      pipeline.push({ $sort: { [sortTitle]: sortType === "desc" ? -1 : 1 } });
    }
    if (search) {
      //merge searchPipeline with pipeline
      pipeline = [...searchPipeline, ...pipeline];
    }

    pipeline.push({ $skip: offset });
    pipeline.push({ $limit: pageSize });
    // get only customerID and name and address and taxID
    pipeline.push({
      $project: {
        customerID: "$_id",
        name: 1,
        address: 1,
        taxID: 1,
      },
    });
    const total = await snapshot.aggregate(pipeline).toArray();
    return total;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const getCustomerByID = async ({ customerID }) => {
  try {
    const db = await mongoDB();
    const snapshot = db.collection("customers");
    let pipeline = [];
    pipeline.push({
      $match: { _id: new ObjectId(customerID), status: { $eq: 1 } },
    });
    // get only customerID and name and address and taxID
    pipeline.push({
      $project: {
        customerID: "$_id",
        name: 1,
        address: 1,
        taxID: 1,
        emails: 1,
        phones: 1,
      },
    });
    const res = await snapshot.aggregate(pipeline).next();
    return res;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const addCustomer = async ({
  name,
  address = "",
  taxID = "",
  phones = [],
  emails = [],
}) => {
  try {
    const db = await mongoDB();
    const snapshot = db.collection("customers");
    const customerQuery = await snapshot.insertOne({
      name,
      address,
      taxID,
      phones,
      emails,
      status: 1,
    });
    return customerQuery.insertedId;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const updateCustomer = async ({
  customerID,
  name,
  address = "",
  taxID = "",
  addPhones = [],
  addEmails = [],
  removePhones = [],
  removeEmails = [],
}) => {
  try {
    const db = await mongoDB();
    const snapshot = db.collection("customers");
    await snapshot.updateOne(
      { _id: new ObjectId(customerID) },
      {
        $set: {
          name,
          address,
          taxID,
        },
      }
    );
    if (addPhones.length > 0) {
      await snapshot.updateOne(
        { _id: new ObjectId(customerID) },
        {
          $push: {
            phones: { $each: addPhones },
          },
        }
      );
    }
    if (addEmails.length > 0) {
      await snapshot.updateOne(
        { _id: new ObjectId(customerID) },
        {
          $push: {
            emails: { $each: addEmails },
          },
        }
      );
    }
    if (removePhones.length > 0) {
      await snapshot.updateOne(
        { _id: new ObjectId(customerID) },
        {
          $pull: {
            phones: { $in: removePhones },
          },
        }
      );
    }
    if (removeEmails.length > 0) {
      await snapshot.updateOne(
        { _id: new ObjectId(customerID) },
        {
          $pull: {
            emails: { $in: removeEmails },
          },
        }
      );
    }

    return customerID;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const deleteCustomer = async ({ customerID }) => {
  try {
    const isHasBeenRef = await checkIsHasBeenRef(customerID);
    if (isHasBeenRef) {
      throw new BadRequestError("รายการนี้กำลังถูกใช้อ้างอิงอยู่");
    }

    const db = await mongoDB();
    const snapshot = db.collection("customers");
    await snapshot.updateOne(
      { _id: new ObjectId(customerID) },
      {
        $set: { status: 0 },
      }
    );
    return true;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const checkIsHasBeenRef = async (customerID) => {
  try {
    const db = await mongoDB();
    const worksnapshot = db.collection("works");
    const pipeline = [];
    // match in ref
    pipeline.push({
      $match: {
        "customer.$id": { $eq: new ObjectId(customerID) },
        status: { $eq: 1 },
      },
    });
    pipeline.push({
      $lookup: {
        from: "customers",
        localField: "customer.$id",
        foreignField: "_id",
        as: "customer",
      },
    });
    pipeline.push({ $count: "total" });
    const total = await worksnapshot.aggregate(pipeline).next();
    const totalData = total ? total.total : 0;
    if (totalData > 0) {
      return true;
    }

    // match in ref expense
    const expensesnapshot = db.collection("expenses");
    const expensePipeline = [];
    expensePipeline.push({
      $match: {
        "customer.$id": { $eq: new ObjectId(customerID) },
        status: { $eq: 1 },
      },
    });
    expensePipeline.push({
      $lookup: {
        from: "customers",
        localField: "customer.$id",
        foreignField: "_id",
        as: "customer",
      },
    });
    expensePipeline.push({ $count: "total" });
    const expenseTotal = await expensesnapshot
      .aggregate(expensePipeline)
      .next();
    const expenseTotalData = expenseTotal ? expenseTotal.total : 0;
    if (expenseTotalData > 0) {
      return true;
    }

    return false;
  } catch (error) {
    throw new BadRequestError(error.message);
  }
};

const getCustomersCount = async (search, searchPipeline) => {
  try {
    const db = await mongoDB();
    const snapshot = db.collection("customers");
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

export {
  getCustomersCount,
  getCustomers,
  getCustomerByID,
  addCustomer,
  updateCustomer,
  deleteCustomer,
};
