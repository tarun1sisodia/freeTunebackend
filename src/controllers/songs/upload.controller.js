/**
 * Upload Controller
 * Handles song upload, metadata updates, and deletion using Cloudflare R2
 */

import { successResponse, errorResponse } from "../../utils/apiResponse.js";
import { HTTP_STATUS, ERROR_MESSAGES, CACHE_TTL } from "../../utils/constants.js";
import { getSupabaseClient, getSupabaseAdmin } from "../../database/connections/supabase.js";
import ApiError from "../../utils/apiError.js";
import { logger } from "../../utils/logger.js";
import { transformSong } from "../../utils/modelTransformers.js";
import fileUploadHelper from "../../services/audioUpload.js";
import cacheHelper from "../../utils/cacheHelper.js";
import { addTranscodeJob } from "../../queues/transcode.queue.js";

/**
 * @description Upload song to Cloudflare R2 and save metadata to database
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const uploadSong = async (req, res) => {
  // Use admin client to bypass RLS for song insertion
  const supabase = getSupabaseAdmin();
  const supabaseClient = getSupabaseClient(); // Use standard client for storage if needed, or admin

  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase admin client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  // Handle req.files for multiple files
  const audioFiles = req.files?.audio;
  const imageFiles = req.files?.image;

  if (!audioFiles || audioFiles.length === 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Audio file is required",
    );
  }

  const audioFile = audioFiles[0];
  const imageFile = imageFiles ? imageFiles[0] : null;

  const { title, artist, album, duration_ms } = req.body;

  if (!title || !artist) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "Title and artist are required",
    );
  }

  let fileKey = null;
  let imageKey = null;

  try {
    // 1. Validate and Upload Audio to R2
    fileUploadHelper.validateFile(audioFile.mimetype, audioFile.size);

    // Extract actual duration
    const actualDuration = await fileUploadHelper.extractDuration(
      audioFile.buffer,
      audioFile.mimetype
    );

    const finalDuration = actualDuration || parseInt(duration_ms, 10) || 180000;

    fileKey = fileUploadHelper.generateFileKey(audioFile.originalname);

    const uploadResult = await fileUploadHelper.uploadFile(
      audioFile.buffer,
      fileKey,
      audioFile.mimetype,
      {
        uploadedBy: userId,
        title,
        artist,
        album: album || null,
        duration: finalDuration,
      }
    );

    // 2. Validate and Upload Image to Supabase Storage (if present)
    let albumArtUrl = null;
    if (imageFile) {
      fileUploadHelper.validateImage(imageFile.mimetype, imageFile.size);

      // Generate unique path: user_id/timestamp_filename
      const fileExt = imageFile.originalname.split('.').pop();
      const fileName = `${Date.now()}_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
      imageKey = `${userId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('song-covers')
        .upload(imageKey, imageFile.buffer, {
          contentType: imageFile.mimetype,
          upsert: true
        });

      if (uploadError) {
        logger.error('Failed to upload cover image:', uploadError);
        // Don't fail the whole request, just log it. Or should we fail?
        // Let's log it and proceed without image for now, but ideally we warn or fail.
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('song-covers')
          .getPublicUrl(imageKey);

        albumArtUrl = publicUrlData.publicUrl;
      }
    }

    // 3. Insert Song Metadata into Database
    // Using admin client to bypass RLS
    const { data, error } = await supabase
      .from("songs")
      .insert({
        title: title.trim(),
        artist: artist.trim(),
        album: album?.trim() || null,
        album_art_url: albumArtUrl,
        duration_ms: finalDuration,
        r2_key: fileKey,
        file_sizes: {
          original: uploadResult.size,
        },
        play_count: 0,
        popularity_score: 0,
        metadata: {
          uploaded_by: userId,
          original_filename: audioFile.originalname,
          extracted_duration: actualDuration !== null,
        },
      })
      .select()
      .single();

    if (error) {
      logger.error("Error saving song metadata:", error);
      await fileUploadHelper.deleteFile(fileKey);
      // Cleanup image if uploaded?
      if (imageKey) {
        await supabase.storage.from('song-covers').remove([imageKey]);
      }
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    // Cache the new song immediately (so it's available for getSongById/playing)
    const transformedSong = transformSong(data);
    await cacheHelper.set(
      `song:${data.id}`,
      JSON.stringify(transformedSong),
      CACHE_TTL.HOT_SONGS
    );
    logger.debug(`Cache SET: song:${data.id} (TTL: ${CACHE_TTL.HOT_SONGS}s)`);

    // Dispatch background transcoding job
    await addTranscodeJob({
      songId: data.id,
      fileKey: fileKey,
      source: 'r2' // Indicate that the source file is in R2
    });
    logger.info(`Transcode job dispatched for song: ${data.id}`);

    return successResponse(
      res,
      {
        song: data,
        upload: {
          size: uploadResult.size,
          key: fileKey,
          url: uploadResult.url,
          coverUrl: albumArtUrl
        },
      },
      "Song uploaded successfully",
      HTTP_STATUS.CREATED,
    );
  } catch (error) {
    logger.error("Error in uploadSong controller:", error);
    // Cleanup R2 file if it was uploaded but process failed later
    if (fileKey && !error.message.includes('metadata')) {
      // Only delete if we are unsure if DB insert happened, or if we know it failed before DB insert
      // Simplification: if error caught here, we can try to cleanup
      try {
        await fileUploadHelper.deleteFile(fileKey);
      } catch (cleanupError) {
        logger.error('Failed to cleanup R2 file after error:', cleanupError);
      }
    }

    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

/**
 * @description Update song metadata
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updateSongMetadata = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  const { id } = req.params;
  const { title, artist, album, duration_ms, metadata } = req.body;

  try {
    const { data: existing, error: checkError } = await supabase
      .from("songs")
      .select("id, metadata")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (artist !== undefined) updates.artist = artist.trim();
    if (album !== undefined) updates.album = album?.trim() || null;
    if (duration_ms !== undefined) updates.duration_ms = parseInt(duration_ms, 10);
    if (metadata !== undefined) {
      updates.metadata = {
        ...existing.metadata,
        ...metadata,
      };
    }

    const { data, error } = await supabase
      .from("songs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating song metadata:", error);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [error.message],
      );
    }

    // Invalidate song cache after update
    await cacheHelper.del(`song:${id}`);
    logger.debug(`Cache invalidated for updated song: ${id}`);

    return successResponse(
      res,
      data,
      "Song metadata updated successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in updateSongMetadata controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

/**
 * @description Delete song and its file from R2
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const deleteSong = async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.OPERATION_FAILED,
      ["Supabase client not initialized"],
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED,
    );
  }

  const { id } = req.params;

  try {
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, r2_key, metadata")
      .eq("id", id)
      .single();

    if (songError || !song) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.SONG_NOT_FOUND);
    }

    const { error: deleteError } = await supabase
      .from("songs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("Error deleting song from database:", deleteError);
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_MESSAGES.OPERATION_FAILED,
        [deleteError.message],
      );
    }

    const fileDeleted = await fileUploadHelper.deleteFile(song.r2_key);
    if (!fileDeleted) {
      logger.warn(`Failed to delete file from R2: ${song.r2_key}`);
    }

    // Invalidate all caches related to this song
    await cacheHelper.del(`song:${id}`);
    await cacheHelper.del(`cdn:url:${id}:high`);
    await cacheHelper.del(`cdn:url:${id}:medium`);
    await cacheHelper.del(`cdn:url:${id}:low`);
    logger.debug(`All caches invalidated for deleted song: ${id}`);

    return successResponse(
      res,
      null,
      "Song deleted successfully",
      HTTP_STATUS.OK,
    );
  } catch (error) {
    logger.error("Error in deleteSong controller:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_ERROR,
    );
  }
};

export { uploadSong, updateSongMetadata, deleteSong };
