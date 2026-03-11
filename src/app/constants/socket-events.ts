export const SOCKET_EVENTS = {

  // connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // room
  CREATE_ROOM: 'createRoom',
  UPDATE_ROOM: 'updateRoom',
  DELETE_ROOM: 'deleteRoom',
  LEAVE_ROOM: 'leaveRoom',

  // conversation
  SEND_MESSAGE: 'sendMessage',
  NEW_MESSAGE: 'newMessage',

  UPDATE_MESSAGE: 'updateMessage',
  MESSAGE_UPDATED: 'messageUpdated',

  MESSAGE_DELETE: 'deleteMessage',
  MESSAGE_DELETED_FOR_EVERYONE: 'deleteMessageForEveryone',

  MESSAGE_SEEN: 'messageSeen',
  MESSAGE_SEEN_BY_USER: 'messageSeenByUser',

  MESSAGE_TYPING: 'messageTyping',
  MESSAGE_TYPING_BY_USER: 'messageTypingByUser'

};