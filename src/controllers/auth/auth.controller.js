import {
  refreshTokenDB,
  loginDB,
  updateRefreshToken,
  removeRefreshToken,
  fetchUserData,
  changePasswordData,
} from "../../services/auth/auth.service.js";
import { verifyJWT } from "../../services/auth/jwt.service.js";
import { prePermission } from "../../services/userTypeManagement/userTypeManagement.service.js";
import { AccessDeniedError } from "../../utils/api-errors.js";
/**
 * Handle logging in user.
 * @async
 * @method
 * @param {ExpressRequest} httpRequest
 */
async function loginController(httpRequest) {
  const body = httpRequest.body;
  const data = await loginDB({
    username: body.username,
    password: body.password,
  });
  await updateRefreshToken({
    token: data.refreshToken,
    userID: data.userProfile.userID,
  });
  data.userProfile.userType.permission = {
    ...prePermission,
    ...data.userProfile.userType.permission,
  };
  data.userProfile.prePermission = prePermission;
  return {
    statusCode: 200,
    body: {
      data: {
        accessToken: data.accessToken,
        userProfile: data.userProfile,
        refreshToken: data.refreshToken,
      },
    },
  };
}

async function refreshTokenController(httpRequest) {
  const body = httpRequest.body;
  if (!body.refreshToken) {
    throw new AccessDeniedError("refreshToken is required");
  }
  const data = await refreshTokenDB({ token: body.refreshToken.split(" ")[1] });
  await updateRefreshToken({ token: data.refreshToken, userID: data.userID });
  return {
    statusCode: 200,
    body: {
      data: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    },
  };
}

async function fetchUserController(httpRequest) {
  const query = httpRequest.query;
  let data = await fetchUserData({ userID: query.userID });
  data.userType.permission = {
    ...prePermission,
    ...data.userType.permission,
  };
  return {
    statusCode: 200,
    body: {
      data: {
        userData: data,
        prePermission: prePermission,
      },
    },
  };
}

async function logout(httpRequest) {
  const body = httpRequest.body;
  await removeRefreshToken({ userID: body.userID });
  return {
    statusCode: 200,
    body: {
      message: "success",
    },
  };
}

async function changePasswordController(httpRequest) {
  const body = httpRequest.body;
  const userData = await verifyJWT({
    token: httpRequest.headers.Authorization.split(" ")[1],
  });
  await changePasswordData({
    userID: userData.data.userID,
    data: body,
  });
  return {
    statusCode: 200,
    body: {
      message: "success",
    },
  };
}
export {
  loginController as login,
  refreshTokenController as refreshToken,
  logout as logout,
  fetchUserController as fetchUser,
  changePasswordController as changePassword,
};
