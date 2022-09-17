/* eslint-disable no-underscore-dangle */

class PlaylistsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    this.postPlaylistHandler = this.postPlaylistHandler.bind(this);
    this.getPlaylistsHandler = this.getPlaylistsHandler.bind(this);
    this.deletePlaylistByIdHandler = this.deletePlaylistByIdHandler.bind(this);
    this.postSongToPlaylistHandler = this.postSongToPlaylistHandler.bind(this);
    this.getSongsByPlaylistIdHandler = this.getSongsFromPlaylistIdHandler.bind(this);
    this.deleteSongFromPlaylistHandler = this.deleteSongFromPlaylistHandler.bind(this);
    this.getPlalistActivitiesHandler = this.getPlalistActivitiesHandler.bind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);
    const { name } = request.payload;

    const { id: credentialId } = request.auth.credentials;
    const playlistId = await this._service.addPlaylist({
      name,
      owner: credentialId,
    });

    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil ditambahkan',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const playlists = await this._service.getPlaylists(credentialId);

    return {
      status: 'success',
      data: {
        playlists,
      },
    };
  }

  async deletePlaylistByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistOwner(id, credentialId);
    await this._service.deletePlaylistById(id);

    return {
      status: 'success',
      message: 'Playlist berhasil dihapus',
    };
  }

  async postSongToPlaylistHandler({ payload, auth, params }, h) {
    this._validator.validatePostPlaylistSongsPayload(payload);

    const { songId } = payload;
    const { playlistId } = params;
    const { id: credentialId } = auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    await this._service.addSongToPlaylist(songId, playlistId);
    await this._service.addPlaylistActivities('add', {
      playlistId,
      credentialId,
      songId,
    });

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan ke playlist',
    });

    response.code(201);
    return response;
  }

  async getSongsFromPlaylistIdHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const { playlistId } = request.params;

    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    const playlists = await this._service.getPlaylistById(playlistId);
    const songs = await this._service.getSongsInPlaylist(playlistId);

    return {
      status: 'success',
      data: {
        playlist: {
          ...playlists,
          songs,
        },
      },
    };
  }

  async deleteSongFromPlaylistHandler({ payload, params, auth }) {
    this._validator.validateDeletePlaylistSongsPayload(payload, params);

    const { playlistId } = params;
    const { songId } = payload;
    const { id: credentialId } = auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, credentialId);
    await this._service.deleteSongFromPlaylistBySongId(songId);
    await this._service.addPlaylistActivities('delete', {
      playlistId,
      credentialId,
      songId,
    });

    return {
      status: 'success',
      message: 'Lagu berhasil dihapus dari playlist',
    };
  }

  async getPlalistActivitiesHandler({ params, auth }) {
    const { playlistId } = params;
    const { id: credentialsId } = auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, credentialsId);
    const activities = await this._service.getHistoryByPlaylistId(playlistId);

    return {
      status: 'success',
      data: {
        playlistId,
        activities,
      },
    };
  }
}

module.exports = PlaylistsHandler;
