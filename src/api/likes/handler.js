/* eslint-disable no-underscore-dangle */

class LikesHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    this.addAlbumLikeHandler = this.addAlbumLikeHandler.bind(this);
    this.getAlbumLikesHandler = this.getAlbumLikesHandler.bind(this);
  }

  async addAlbumLikeHandler(request, h) {
    const { id: userId } = request.auth.credentials;
    const { id: albumId } = request.params;

    await this._service.verifyExistingAlbumById(albumId);

    const message = await this._service.addAlbumLike({
      userId,
      albumId,
    });

    const response = h.response({
      status: 'success',
      message,
    });
    response.code(201);
    return response;
  }

  async getAlbumLikesHandler(request, h) {
    const { id: albumId } = request.params;

    const { isCache, likes } = await this._service.getAlbumLikes(albumId);

    const response = h.response({
      status: 'success',
      data: { likes },
    });

    response.header('X-Data-Source', isCache ? 'cache' : 'database');

    return response;
  }
}

module.exports = LikesHandler;
