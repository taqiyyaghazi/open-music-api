/* eslint-disable no-underscore-dangle */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class AlbumLikesService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbumLike({ userId, albumId }) {
    const id = `likes-${nanoid(16)}`;

    const isLiked = await this.verifyIsLiked(userId, albumId);

    if (!isLiked) {
      const query = {
        text: 'INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id',
        values: [id, userId, albumId],
      };

      const result = await this._pool.query(query);

      if (!result.rows[0].id) {
        throw new InvariantError('Like gagal ditambahkan');
      }

      await this._cacheService.delete(`album-likes:${albumId}`);

      return 'Like berhasil ditambahkan';
    }
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Like gagal dihapus. Id tidak ditemukan');
    }

    await this._cacheService.delete(`album-likes:${albumId}`);

    return 'Like berhasil dihapus';
  }

  async verifyExistingAlbumById(id) {
    const query = {
      text: 'SELECT id FROM albums WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Album tidak ditemukan');
    }
  }

  async getAlbumLikes(albumId) {
    try {
      const result = await this._cacheService.get(`album-likes:${albumId}`);

      return {
        isCache: true,
        likes: JSON.parse(result),
      };
    } catch (error) {
      const query = {
        text: 'SELECT COUNT(album_id) AS likes FROM user_album_likes WHERE album_id = $1 GROUP BY album_id;',
        values: [albumId],
      };
      const result = await this._pool.query(query);

      const likes = parseInt(result.rows[0].likes, 10);

      await this._cacheService.set(
        `album-likes:${albumId}`,
        JSON.stringify(likes),
      );

      return {
        isCache: false,
        likes,
      };
    }
  }

  async verifyIsLiked(userId, albumId) {
    const query = {
      text: 'SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    const isLiked = !!result.rowCount;

    return isLiked;
  }
}

module.exports = AlbumLikesService;
