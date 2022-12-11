
import { refresh, signIn, updateRefreshToken } from "../../services/auth/auth.service.js";
/**
   * Handle logging in user.
   * @async
   * @method
   * @param {ExpressRequest} httpRequest
   */
async function login(httpRequest) {
    const body = httpRequest.body
    const data = await signIn({username:body.username, password:body.password})
    await updateRefreshToken({token:data.refreshToken,userID:data.userProfile.userID})
    return {
        statusCode: 200,
        body: {
            data: {
                accessToken:data.accessToken,
                userProfile:data.userProfile
            }
        },
        cookie:{
            refreshToken:data.refreshToken,
        }
    }
}

async function refreshToken(httpRequest){
    const body = httpRequest.body
    const data = await refresh({token:body.refreshToken.split(' ')[1]})
    await updateRefreshToken({token:data.refreshToken,userID:data.userID})
    return {
        statusCode: 200,
        body: {
            data: {
                accessToken:data.accessToken
            }
        },
        cookie:{
            refreshToken:data.refreshToken
        }
    }
}

async function getTest(httpRequest) {
    const body = httpRequest.body
    return {
        statusCode: 200,
        body:body
    }
}

export {
    getTest,
    login,
    refreshToken
}