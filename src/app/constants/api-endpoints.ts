export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/v1/user/login',
    REGISTER_PHONE: '/v1/user/register/phone',
    VERIFY_PHONE: '/v1/user/phone/verify',
    REGISTER: '/v1/user/register',
    LOGOUT: '/v1/user/logout',
    FORGOT_PASSWORD_PHONE: '/v1/user/forgotPassword/phone',
    FORGOT_PASSWORD_PHONE_VERIFY: '/v1/user/forgotPassword/phone/verify',
    RESET_PASSWORD_PHONE: '/v1/user/resetPassword/phone',
    CHECK_USERNAME: '/v1/user/username/check'

  },
  USER: {
    DETAILS: '/v1/user/details',
    GET_ALL: '/v1/user',
    UPDATE: '/v1/user/register'
  },
  POST : {
    GET_ALL: '/v2/post',
    LIKE_TOGGLE: '/v1/post/like',
    VIEW: '/v1/post/view',
    CREATE: '/v1/post',
    UPDATE: '/v1/post', 
    DELETE: '/v1/post', 
    SAVE: '/v1/post/save'
  },
  COMMENT: {
  GET_ALL: '/v1/comment',
  CREATE: '/v1/comment',
  UPDATE: '/v1/comment',
  DELETE: '/v1/comment',
  LIKE_TOGGLE: '/v1/comment/like'
},
  FILE:{
    UPLOAD: '/v1/file/upload',
    UPLOAD_MANY: '/v1/file/uploadMany'
  },

  SEARCH: {
  BASE: '/v1/search'
}
};
