/* eslint-disable no-underscore-dangle */
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor({ pool, collaborationsService, songsService }) {
    this._pool = pool;
    this._collaborationsService = collaborationsService;
    this._songsService = songsService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `
        SELECT playlists.id, playlists.name, users.username
        FROM playlists
        LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
        INNER JOIN users ON playlists.owner = users.id
        WHERE playlists.owner = $1 OR collaborations.user_id = $1
        GROUP BY playlists.id, users.id
      `,
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async getPlaylistById(id) {
    const query = {
      text: `
        SELECT playlists.id, playlists.name, users.username FROM playlists
        LEFT JOIN users ON users.id = playlists.owner
        WHERE playlists.id = $1
      `,
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return result.rows[0];
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }

  async addSongToPlaylist(songId, playlistId) {
    await this._songsService.verifyExistingSongById(songId);

    const id = nanoid(16);
    const query = {
      text: 'INSERT INTO playlistsongs VALUES ($1, $2, $3)',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Gagal menambahkan lagu ke playlist');
    }
  }

  async getSongsInPlaylist(playlistId) {
    const query = {
      text: `
        SELECT songs.id, songs.title, songs.performer FROM songs
        LEFT JOIN playlistsongs ON songs.id = playlistsongs.song_id
        WHERE playlistsongs.playlist_id = $1
        GROUP BY songs.id
      `,
      values: [playlistId],
    };
    const result = await this._pool.query(query);

    return result.rows;
  }

  async deleteSongFromPlaylistBySongId(songId) {
    const query = {
      text: 'DELETE FROM playlistsongs WHERE song_id = $1',
      values: [songId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError(
        'Gagal menghapus lagu dari playlist. Id song tidak ditemukan',
      );
    }
  }

  async addPlaylistActivities(type, { playlistId, credentialId, songId }) {
    const id = `history-${nanoid(16)}`;
    const timeNow = new Date().toISOString();

    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES ($1, $2, $3, $4, $5, $6)',
      values: [id, playlistId, songId, credentialId, type, timeNow],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new InvariantError('Gagal menambahkan aktifitas playlist');
    }
  }

  async getHistoryByPlaylistId(playlistId) {
    const query = {
      text: `
        SELECT users.username, songs.title, playlist_song_activities.action, playlist_song_activities.time FROM playlist_song_activities
        INNER JOIN users ON users.id = playlist_song_activities.user_id
        INNER JOIN songs ON songs.id = playlist_song_activities.song_id
        WHERE playlist_song_activities.playlist_id = $1
      `,
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Id playlist tidak ditemukan');
    }

    return result.rows;
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];
    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationsService.verifyCollaborator(
          playlistId,
          userId,
        );
      } catch {
        throw error;
      }
    }
  }
}

module.exports = PlaylistsService;
