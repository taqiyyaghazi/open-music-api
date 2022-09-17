/* eslint-disable no-underscore-dangle */

class CollaborationsHandler {
  constructor({
    collaborationsService,
    playlistsService,
    usersService,
    validator,
  }) {
    this._collaborationsService = collaborationsService;
    this._playlistsService = playlistsService;
    this._usersServices = usersService;
    this._validator = validator;

    this.postCollaborationHandler = this.postCollaborationHandler.bind(this);
    this.deleteCollaborationByIdHandler = this.deleteCollaborationByIdHandler.bind(this);
  }

  async postCollaborationHandler(request, h) {
    this._validator.validatePostCollaborationsPayload(request.payload);

    const { id: credentialId } = request.auth.credentials;
    const { playlistId, userId } = request.payload;

    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId);
    await this._usersServices.verifyExistingUserById(userId);
    const collaborationId = await this._collaborationsService.addCollaboration(
      playlistId,
      userId,
    );

    const response = h.response({
      status: 'success',
      message: 'Kolaborasi berhasil ditambahkan',
      data: {
        collaborationId,
      },
    });
    response.code(201);
    return response;
  }

  async deleteCollaborationByIdHandler(request) {
    this._validator.validateDeleteCollaborationsPayload(request.payload);

    const { id: credentialId } = request.auth.credentials;
    const { playlistId, userId } = request.payload;

    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId);
    await this._collaborationsService.deleteCollaboration(playlistId, userId);

    return {
      status: 'success',
      message: 'Kolaborasi berhasil dihapus',
    };
  }
}

module.exports = CollaborationsHandler;
