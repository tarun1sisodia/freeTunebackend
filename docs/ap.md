# 🎵 FreeTune Flutter App - Complete Structure & Implementation Guide

**Based on:** MEMO.md + MEMO_IMPROVEMENTS.md + Backend API Documentation  
**Target:** Ultra-performance music streaming with <1s load times  
**Architecture:** Offline-first, aggressive caching, adaptive bitrate streaming

---

## 📋 Table of Contents

1. [Project Structure](#project-structure)
2. [Dependencies & Setup](#dependencies--setup)
3. [Core Architecture](#core-architecture)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [Caching Strategy](#caching-strategy)
7. [Audio Player Implementation](#audio-player-implementation)
8. [UI/UX Components](#uiux-components)
9. [Screens & Navigation](#screens--navigation)
10. [Performance Optimizations](#performance-optimizations)
11. [Testing Strategy](#testing-strategy)

---

## 📁 Project Structure

```
lib/
├── main.dart                          # App entry point
├── app.dart                           # Root widget with providers
│
├── config/
│   ├── app_config.dart                # App-wide configuration
│   ├── api_config.dart                # API endpoints & base URLs
│   ├── cache_config.dart              # Cache settings (500MB limit)
│   └── theme_config.dart              # Light/dark theme
│
├── core/
│   ├── constants/
│   │   ├── api_endpoints.dart         # All API endpoint constants
│   │   ├── cache_keys.dart            # Cache key constants
│   │   └── app_constants.dart         # App-wide constants
│   │
│   ├── utils/
│   │   ├── logger.dart                # Logging utility
│   │   ├── validators.dart            # Form validation
│   │   ├── formatters.dart            # Date, time, duration formatters
│   │   ├── network_utils.dart         # Network detection, quality selection
│   │   └── file_utils.dart            # File operations
│   │
│   ├── exceptions/
│   │   ├── api_exception.dart         # API error handling
│   │   ├── cache_exception.dart       # Cache error handling
│   │   └── network_exception.dart     # Network error handling
│   │
│   └── mixins/
│       ├── loading_mixin.dart         # Loading state mixin
│       └── error_handler_mixin.dart   # Error handling mixin
│
├── data/
│   ├── models/
│   │   ├── user/
│   │   │   ├── user_model.dart        # User data model
│   │   │   └── auth_response.dart      # Login/register response
│   │   │
│   │   ├── song/
│   │   │   ├── song_model.dart        # Song data model
│   │   │   ├── song_metadata.dart     # Extended metadata
│   │   │   └── playback_state.dart    # Playback state model
│   │   │
│   │   ├── playlist/
│   │   │   └── playlist_model.dart    # Playlist model
│   │   │
│   │   ├── recommendation/
│   │   │   └── recommendation_model.dart
│   │   │
│   │   └── analytics/
│   │       └── analytics_model.dart   # Analytics data models
│   │
│   ├── repositories/
│   │   ├── auth_repository.dart       # Authentication operations
│   │   ├── song_repository.dart       # Song CRUD operations
│   │   ├── playlist_repository.dart    # Playlist operations
│   │   ├── recommendation_repository.dart
│   │   └── analytics_repository.dart  # Analytics tracking
│   │
│   ├── datasources/
│   │   ├── remote/
│   │   │   ├── api_client.dart        # Dio HTTP client setup
│   │   │   ├── auth_api.dart          # Auth API calls
│   │   │   ├── songs_api.dart         # Songs API calls
│   │   │   ├── playlists_api.dart     # Playlists API calls
│   │   │   ├── recommendations_api.dart
│   │   │   └── analytics_api.dart     # Analytics API calls
│   │   │
│   │   └── local/
│   │       ├── isar_database.dart     # Isar DB setup
│   │       ├── cache_manager.dart     # Cache operations (Isar)
│   │       ├── preferences_storage.dart # SharedPreferences for settings
│   │       └── audio_cache.dart       # Audio file cache manager
│   │
│   └── mappers/
│       ├── song_mapper.dart           # API response → Model
│       └── playlist_mapper.dart       # API response → Model
│
├── domain/
│   ├── entities/
│   │   ├── user_entity.dart           # User entity
│   │   ├── song_entity.dart           # Song entity
│   │   └── playlist_entity.dart       # Playlist entity
│   │
│   └── usecases/
│       ├── auth/
│       │   ├── login_usecase.dart
│       │   ├── register_usecase.dart
│       │   └── logout_usecase.dart
│       │
│       ├── songs/
│       │   ├── get_songs_usecase.dart
│       │   ├── search_songs_usecase.dart
│       │   ├── get_song_stream_url_usecase.dart
│       │   └── toggle_favorite_usecase.dart
│       │
│       └── playlists/
│           ├── create_playlist_usecase.dart
│           └── add_song_to_playlist_usecase.dart
│
├── presentation/
│   ├── providers/                     # Riverpod providers
│   │   ├── auth_provider.dart         # Auth state management
│   │   ├── audio_player_provider.dart # Audio playback state
│   │   ├── songs_provider.dart        # Songs list state
│   │   ├── playlist_provider.dart     # Playlists state
│   │   ├── recommendations_provider.dart
│   │   ├── cache_provider.dart        # Cache management state
│   │   └── network_provider.dart      # Network status
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   ├── register_screen.dart
│   │   │   └── forgot_password_screen.dart
│   │   │
│   │   ├── home/
│   │   │   ├── home_screen.dart       # Main dashboard
│   │   │   └── widgets/
│   │   │       ├── trending_section.dart
│   │   │       ├── recently_played_section.dart
│   │   │       └── recommendations_section.dart
│   │   │
│   │   ├── songs/
│   │   │   ├── songs_list_screen.dart
│   │   │   ├── song_detail_screen.dart
│   │   │   ├── search_screen.dart
│   │   │   └── favorites_screen.dart
│   │   │
│   │   ├── playlists/
│   │   │   ├── playlists_screen.dart
│   │   │   ├── playlist_detail_screen.dart
│   │   │   └── create_playlist_screen.dart
│   │   │
│   │   ├── player/
│   │   │   ├── player_screen.dart     # Full-screen player
│   │   │   └── mini_player.dart       # Bottom mini player
│   │   │
│   │   ├── profile/
│   │   │   ├── profile_screen.dart
│   │   │   ├── settings_screen.dart
│   │   │   └── analytics_screen.dart
│   │   │
│   │   └── offline/
│   │       └── offline_songs_screen.dart
│   │
│   ├── widgets/
│   │   ├── common/
│   │   │   ├── loading_indicator.dart
│   │   │   ├── error_widget.dart
│   │   │   ├── empty_state.dart
│   │   │   └── retry_button.dart
│   │   │
│   │   ├── song/
│   │   │   ├── song_tile.dart         # List item
│   │   │   ├── song_card.dart         # Grid item
│   │   │   └── song_metadata_widget.dart
│   │   │
│   │   ├── playlist/
│   │   │   ├── playlist_tile.dart
│   │   │   └── playlist_card.dart
│   │   │
│   │   └── player/
│   │       ├── play_pause_button.dart
│   │       ├── seek_bar.dart
│   │       ├── quality_selector.dart
│   │       └── volume_control.dart
│   │
│   └── theme/
│       ├── app_theme.dart             # Theme configuration
│       ├── colors.dart                 # Color palette
│       └── text_styles.dart            # Typography
│
└── services/
    ├── audio/
    │   ├── audio_player_service.dart   # just_audio wrapper
    │   ├── audio_cache_service.dart    # Cache management
    │   ├── prefetch_service.dart       # Smart prefetching
    │   └── quality_selector_service.dart # Adaptive bitrate
    │
    ├── network/
    │   ├── network_service.dart        # Connectivity monitoring
    │   └── download_service.dart       # Background downloads
    │
    └── analytics/
        └── analytics_service.dart      # Event tracking
```

---

## 📦 Dependencies & Setup

### `pubspec.yaml`

```yaml
name: freetune
description: Ultra-performance music streaming app
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.4.9
  riverpod_annotation: ^2.3.3

  # Local Database (Faster than Hive)
  isar: ^3.1.0+1
  isar_flutter_libs: ^3.1.0+1

  # Audio Player
  just_audio: ^0.9.36
  audio_service: ^0.18.11 # Background playback
  audio_session: ^0.1.18 # Audio session management

  # HTTP Client
  dio: ^5.4.0
  pretty_dio_logger: ^1.3.1 # Dev only

  # Caching
  flutter_cache_manager: ^3.3.1
  path_provider: ^2.1.1

  # Storage
  shared_preferences: ^2.2.2

  # Network Detection
  connectivity_plus: ^5.0.2
  network_info_plus: ^4.0.2

  # UI Components
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0
  pull_to_refresh: ^2.0.0

  # Utils
  intl: ^0.18.1
  uuid: ^4.2.1
  equatable: ^2.0.5

  # Code Generation
  build_runner: ^2.4.7
  riverpod_generator: ^2.3.9
  isar_generator: ^3.1.0+1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
```

### Setup Commands

```bash
# Install dependencies
flutter pub get

# Generate code (Riverpod, Isar)
flutter pub run build_runner build --delete-conflicting-outputs

# Watch mode for development
flutter pub run build_runner watch
```

---

## 🏗️ Core Architecture

### 1. **API Client Setup** (`data/datasources/remote/api_client.dart`)

```dart
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/api_config.dart';

class ApiClient {
  late Dio _dio;
  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Request interceptor - Add auth token
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        // Handle 401 - Refresh token
        if (error.response?.statusCode == 401) {
          final refreshed = await _refreshToken();
          if (refreshed) {
            return handler.resolve(await _retry(error.requestOptions));
          }
        }
        return handler.next(error);
      },
    ));

    // Logging interceptor (dev only)
    if (ApiConfig.isDevelopment) {
      _dio.interceptors.add(PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        error: true,
      ));
    }
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<bool> _refreshToken() async {
    // Implement token refresh logic
    return false;
  }

  Future<Response> _retry(RequestOptions requestOptions) async {
    final token = await _getToken();
    requestOptions.headers['Authorization'] = 'Bearer $token';
    return _dio.request(
      requestOptions.path,
      options: Options(
        method: requestOptions.method,
        headers: requestOptions.headers,
      ),
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
    );
  }

  Dio get dio => _dio;
}
```

### 2. **Isar Database Setup** (`data/datasources/local/isar_database.dart`)

```dart
import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import '../../models/song/song_model.dart';
import '../../models/playlist/playlist_model.dart';
import '../../models/user/user_model.dart';

class IsarDatabase {
  static Isar? _isar;

  static Future<Isar> getInstance() async {
    if (_isar != null) return _isar!;

    final dir = await getApplicationDocumentsDirectory();
    _isar = await Isar.open(
      [
        SongModelSchema,
        PlaylistModelSchema,
        UserModelSchema,
      ],
      directory: dir.path,
      inspector: true, // Enable inspector in debug mode
    );

    return _isar!;
  }

  static Future<void> close() async {
    await _isar?.close();
    _isar = null;
  }
}
```

---

## 🔄 State Management (Riverpod)

### Auth Provider (`presentation/providers/auth_provider.dart`)

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/models/user/user_model.dart';

part 'auth_provider.g.dart';

@riverpod
class Auth extends _$Auth {
  @override
  FutureOr<UserModel?> build() async {
    return await ref.read(authRepositoryProvider).getCurrentUser();
  }

  Future<bool> login(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final user = await ref.read(authRepositoryProvider).login(email, password);
      return user;
    });
    return state.hasValue && state.value != null;
  }

  Future<bool> register(String email, String password, String name) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final user = await ref.read(authRepositoryProvider).register(email, password, name);
      return user;
    });
    return state.hasValue && state.value != null;
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncValue.data(null);
  }
}
```

### Audio Player Provider (`presentation/providers/audio_player_provider.dart`)

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:just_audio/just_audio.dart';
import '../../services/audio/audio_player_service.dart';
import '../../data/models/song/song_model.dart';

part 'audio_player_provider.g.dart';

@riverpod
class AudioPlayerState extends _$AudioPlayerState {
  AudioPlayerService? _audioService;

  @override
  FutureOr<AudioPlayerStateModel> build() {
    _audioService = ref.read(audioPlayerServiceProvider);
    return AudioPlayerStateModel(
      currentSong: null,
      isPlaying: false,
      position: Duration.zero,
      duration: Duration.zero,
      queue: [],
      currentIndex: 0,
    );
  }

  Future<void> playSong(SongModel song) async {
    await _audioService?.play(song);
    state = AsyncValue.data(state.value!.copyWith(
      currentSong: song,
      isPlaying: true,
    ));
  }

  Future<void> pause() async {
    await _audioService?.pause();
    state = AsyncValue.data(state.value!.copyWith(isPlaying: false));
  }

  Future<void> resume() async {
    await _audioService?.resume();
    state = AsyncValue.data(state.value!.copyWith(isPlaying: true));
  }

  Future<void> seek(Duration position) async {
    await _audioService?.seek(position);
  }

  Future<void> playNext() async {
    await _audioService?.playNext();
  }

  Future<void> playPrevious() async {
    await _audioService?.playPrevious();
  }
}
```

---

## 🌐 API Integration

### Complete API Endpoints Mapping

#### **Authentication APIs** (`data/datasources/remote/auth_api.dart`)

```dart
class AuthApi {
  final Dio _dio;

  AuthApi(this._dio);

  // POST /api/v1/auth/register
  Future<AuthResponse> register({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await _dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      'name': name,
    });
    return AuthResponse.fromJson(response.data['data']);
  }

  // POST /api/v1/auth/login
  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return AuthResponse.fromJson(response.data['data']);
  }

  // GET /api/v1/auth/me
  Future<UserModel> getCurrentUser() async {
    final response = await _dio.get('/auth/me');
    return UserModel.fromJson(response.data['data']);
  }

  // PATCH /api/v1/auth/profile
  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    final response = await _dio.patch('/auth/profile', data: data);
    return UserModel.fromJson(response.data['data']);
  }

  // POST /api/v1/auth/change-password
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _dio.post('/auth/change-password', data: {
      'current_password': currentPassword,
      'new_password': newPassword,
    });
  }

  // POST /api/v1/auth/logout
  Future<void> logout() async {
    await _dio.post('/auth/logout');
  }

  // POST /api/v1/auth/refresh-token
  Future<AuthResponse> refreshToken(String refreshToken) async {
    final response = await _dio.post('/auth/refresh-token', data: {
      'refresh_token': refreshToken,
    });
    return AuthResponse.fromJson(response.data['data']);
  }

  // POST /api/v1/auth/forgot-password
  Future<void> forgotPassword(String email) async {
    await _dio.post('/auth/forgot-password', data: {'email': email});
  }

  // POST /api/v1/auth/reset-password
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _dio.post('/auth/reset-password', data: {
      'token': token,
      'new_password': newPassword,
    });
  }

  // POST /api/v1/auth/verify-email
  Future<void> verifyEmail(String token) async {
    await _dio.post('/auth/verify-email', data: {'token': token});
  }

  // POST /api/v1/auth/resend-verification
  Future<void> resendVerification(String email) async {
    await _dio.post('/auth/resend-verification', data: {'email': email});
  }
}
```

#### **Songs APIs** (`data/datasources/remote/songs_api.dart`)

```dart
class SongsApi {
  final Dio _dio;

  SongsApi(this._dio);

  // GET /api/v1/songs
  Future<PaginatedResponse<SongModel>> getSongs({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get('/songs', queryParameters: {
      'page': page,
      'limit': limit,
    });
    return PaginatedResponse.fromJson(
      response.data,
      (json) => SongModel.fromJson(json),
    );
  }

  // GET /api/v1/songs/search
  Future<PaginatedResponse<SongModel>> searchSongs({
    required String query,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get('/songs/search', queryParameters: {
      'q': query,
      'page': page,
      'limit': limit,
    });
    return PaginatedResponse.fromJson(
      response.data,
      (json) => SongModel.fromJson(json),
    );
  }

  // GET /api/v1/songs/popular
  Future<List<SongModel>> getPopularSongs({int limit = 20}) async {
    final response = await _dio.get('/songs/popular', queryParameters: {
      'limit': limit,
    });
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }

  // GET /api/v1/songs/recently-played
  Future<List<SongModel>> getRecentlyPlayed({int limit = 20}) async {
    final response = await _dio.get('/songs/recently-played', queryParameters: {
      'limit': limit,
    });
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }

  // GET /api/v1/songs/favorites
  Future<List<SongModel>> getFavorites({int limit = 20}) async {
    final response = await _dio.get('/songs/favorites', queryParameters: {
      'limit': limit,
    });
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }

  // GET /api/v1/songs/:id
  Future<SongModel> getSongById(String id) async {
    final response = await _dio.get('/songs/$id');
    return SongModel.fromJson(response.data['data']);
  }

  // GET /api/v1/songs/:id/stream-url
  Future<StreamUrlResponse> getStreamUrl({
    required String songId,
    String quality = 'high', // high, medium, low
  }) async {
    final response = await _dio.get('/songs/$songId/stream-url', queryParameters: {
      'quality': quality,
    });
    return StreamUrlResponse.fromJson(response.data['data']);
  }

  // POST /api/v1/songs/:id/favorite
  Future<bool> toggleFavorite(String songId) async {
    final response = await _dio.post('/songs/$songId/favorite');
    return response.data['data']['is_favorite'] as bool;
  }

  // POST /api/v1/songs/:id/play
  Future<void> trackPlay({
    required String songId,
    String? sessionId,
  }) async {
    await _dio.post('/songs/$songId/play', data: {
      'session_id': sessionId,
    });
  }

  // POST /api/v1/songs/:id/playback
  Future<void> trackPlayback({
    required String songId,
    required int positionMs,
    required int durationMs,
    double? progress, // 0.0 to 1.0
  }) async {
    await _dio.post('/songs/$songId/playback', data: {
      'position_ms': positionMs,
      'duration_ms': durationMs,
      'progress': progress,
    });
  }

  // POST /api/v1/songs/upload
  Future<SongModel> uploadSong({
    required String filePath,
    required String title,
    required String artist,
    String? album,
    required int durationMs,
  }) async {
    final formData = FormData.fromMap({
      'audio': await MultipartFile.fromFile(filePath),
      'title': title,
      'artist': artist,
      'album': album,
      'duration_ms': durationMs,
    });

    final response = await _dio.post('/songs/upload', data: formData);
    return SongModel.fromJson(response.data['data']);
  }

  // PATCH /api/v1/songs/:id/metadata
  Future<SongModel> updateMetadata({
    required String songId,
    Map<String, dynamic> metadata,
  }) async {
    final response = await _dio.patch('/songs/$songId/metadata', data: metadata);
    return SongModel.fromJson(response.data['data']);
  }

  // DELETE /api/v1/songs/:id
  Future<void> deleteSong(String songId) async {
    await _dio.delete('/songs/$songId');
  }
}
```

#### **Playlists APIs** (`data/datasources/remote/playlists_api.dart`)

```dart
class PlaylistsApi {
  final Dio _dio;

  PlaylistsApi(this._dio);

  // GET /api/v1/playlists
  Future<List<PlaylistModel>> getPlaylists() async {
    final response = await _dio.get('/playlists');
    return (response.data['data'] as List)
        .map((json) => PlaylistModel.fromJson(json))
        .toList();
  }

  // POST /api/v1/playlists
  Future<PlaylistModel> createPlaylist({
    required String name,
    String? description,
    bool isPublic = false,
  }) async {
    final response = await _dio.post('/playlists', data: {
      'name': name,
      'description': description,
      'is_public': isPublic,
    });
    return PlaylistModel.fromJson(response.data['data']);
  }
// GET /api/v1/playlists/:id
  Future<PlaylistModel> getPlaylistById(String id) async {
    final response = await _dio.get('/playlists/$id');
    return PlaylistModel.fromJson(response.data['data']);
  }

  // PATCH /api/v1/playlists/:id
  Future<PlaylistModel> updatePlaylist({
    required String id,
    String? name,
    String? description,
    bool? isPublic,
  }) async {
    final response = await _dio.patch('/playlists/$id', data: {
      if (name != null) 'name': name,
      if (description != null) 'description': description,
      if (isPublic != null) 'is_public': isPublic,
    });
    return PlaylistModel.fromJson(response.data['data']);
  }

  // DELETE /api/v1/playlists/:id
  Future<void> deletePlaylist(String id) async {
    await _dio.delete('/playlists/$id');
  }

  // POST /api/v1/playlists/:id/songs
  Future<void> addSongToPlaylist({
    required String playlistId,
    required String songId,
  }) async {
    await _dio.post('/playlists/$playlistId/songs', data: {
      'song_id': songId,
    });
  }

  // DELETE /api/v1/playlists/:id/songs/:songId
  Future<void> removeSongFromPlaylist({
    required String playlistId,
    required String songId,
  }) async {
    await _dio.delete('/playlists/$playlistId/songs/$songId');
  }
}
```

#### **Recommendations APIs** (`data/datasources/remote/recommendations_api.dart`)

```dart
class RecommendationsApi {
  final Dio _dio;

  RecommendationsApi(this._dio);

  // GET /api/v1/recommendations
  Future<List<SongModel>> getRecommendations({int limit = 20}) async {
    final response = await _dio.get('/recommendations', queryParameters: {
      'limit': limit,
    });
    return (response.data['data']['recommendations'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }

  // GET /api/v1/recommendations/similar/:songId
  Future<List<SongModel>> getSimilarSongs(String songId) async {
    final response = await _dio.get('/recommendations/similar/$songId');
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }

  // GET /api/v1/recommendations/mood/:mood
  Future<List<SongModel>> getMoodRecommendations(String mood) async {
    final response = await _dio.get('/recommendations/mood/$mood');
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }

  // GET /api/v1/recommendations/trending
  Future<List<SongModel>> getTrendingSongs({int limit = 20}) async {
    final response = await _dio.get('/recommendations/trending', queryParameters: {
      'limit': limit,
    });
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }

  // GET /api/v1/recommendations/stats
  Future<Map<String, dynamic>> getUserStats() async {
    final response = await _dio.get('/recommendations/stats');
    return response.data['data'] as Map<String, dynamic>;
  }

  // GET /api/v1/recommendations/top
  Future<List<SongModel>> getUserTopSongs({int limit = 20}) async {
    final response = await _dio.get('/recommendations/top', queryParameters: {
      'limit': limit,
    });
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }
}
```

#### **Analytics APIs** (`data/datasources/remote/analytics_api.dart`)

```dart
class AnalyticsApi {
  final Dio _dio;

  AnalyticsApi(this._dio);

  // POST /api/v1/analytics/track
  Future<void> trackListening({
    required String songId,
    required String action, // play, skip, complete, like, dislike
    int? positionMs,
    int? durationMs,
    String? sessionId,
  }) async {
    await _dio.post('/analytics/track', data: {
      'song_id': songId,
      'action': action,
      'position_ms': positionMs,
      'duration_ms': durationMs,
      'session_id': sessionId,
    });
  }

  // GET /api/v1/analytics/stats
  Future<Map<String, dynamic>> getUserStats() async {
    final response = await _dio.get('/analytics/stats');
    return response.data['data'] as Map<String, dynamic>;
  }

  // GET /api/v1/analytics/top-songs
  Future<List<SongModel>> getTopSongs({int limit = 20}) async {
    final response = await _dio.get('/analytics/top-songs', queryParameters: {
      'limit': limit,
    });
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }

  // GET /api/v1/analytics/time-patterns
  Future<Map<String, dynamic>> getTimePatterns() async {
    final response = await _dio.get('/analytics/time-patterns');
    return response.data['data'] as Map<String, dynamic>;
  }

  // GET /api/v1/analytics/genre-preferences
  Future<Map<String, dynamic>> getGenrePreferences() async {
    final response = await _dio.get('/analytics/genre-preferences');
    return response.data['data'] as Map<String, dynamic>;
  }

  // GET /api/v1/analytics/mood-preferences
  Future<Map<String, dynamic>> getMoodPreferences() async {
    final response = await _dio.get('/analytics/mood-preferences');
    return response.data['data'] as Map<String, dynamic>;
  }

  // GET /api/v1/analytics/trending
  Future<List<SongModel>> getTrendingSongs({int limit = 20}) async {
    final response = await _dio.get('/analytics/trending', queryParameters: {
      'limit': limit,
    });
    return (response.data['data'] as List)
        .map((json) => SongModel.fromJson(json))
        .toList();
  }
}
```

---

## 💾 Caching Strategy

### Cache Manager (`data/datasources/local/cache_manager.dart`)

```dart
import 'package:isar/isar.dart';
import '../../models/song/song_model.dart';
import '../isar_database.dart';

class CacheManager {
  static const int maxCacheSizeMB = 500;
  static const int targetCacheSizeMB = 400; // 20% buffer

  // Auto-cache top 100 most played songs
  Future<void> autoCacheTopSongs(List<SongModel> songs) async {
    final isar = await IsarDatabase.getInstance();
    final top100 = songs.take(100).toList();

    await isar.writeTxn(() async {
      await isar.songModels.putAll(top100);
    });
  }

  // LRU Eviction Policy
  Future<void> evictIfNeeded() async {
    final isar = await IsarDatabase.getInstance();
    final cachedSongs = await isar.songModels.where().findAll();

    // Calculate current cache size (simplified)
    final currentSizeMB = cachedSongs.length * 3.6; // ~3.6MB per song (medium quality)

    if (currentSizeMB > maxCacheSizeMB) {
      // Sort by: play_count (desc) → cached_at (desc)
      cachedSongs.sort((a, b) {
        final playCountCompare = b.playCount.compareTo(a.playCount);
        if (playCountCompare != 0) return playCountCompare;
        return b.cachedAt.compareTo(a.cachedAt);
      });

      // Remove oldest/least played songs
      final toRemove = cachedSongs.length - (targetCacheSizeMB ~/ 3.6).toInt();
      final songsToDelete = cachedSongs.sublist(cachedSongs.length - toRemove);

      await isar.writeTxn(() async {
        await isar.songModels.deleteAll(songsToDelete.map((s) => s.id).toList());
      });
    }
  }

  // Check if song is cached
  Future<bool> isCached(String songId) async {
    final isar = await IsarDatabase.getInstance();
    return await isar.songModels.get(songId) != null;
  }

  // Get cached song
  Future<SongModel?> getCachedSong(String songId) async {
    final isar = await IsarDatabase.getInstance();
    return await isar.songModels.get(songId);
  }

  // Cache song
  Future<void> cacheSong(SongModel song) async {
    final isar = await IsarDatabase.getInstance();
    await isar.writeTxn(() async {
      await isar.songModels.put(song.copyWith(cachedAt: DateTime.now()));
    });
  }
}
```

---

## 🎵 Audio Player Implementation

### Audio Player Service (`services/audio/audio_player_service.dart`)

```dart
import 'package:just_audio/just_audio.dart';
import 'package:audio_session/audio_session.dart';
import '../../data/models/song/song_model.dart';
import '../../data/repositories/song_repository.dart';
import 'quality_selector_service.dart';
import 'prefetch_service.dart';

class AudioPlayerService {
  final AudioPlayer _player = AudioPlayer();
  final QualitySelectorService _qualitySelector;
  final PrefetchService _prefetchService;
  final SongRepository _songRepository;

  List<SongModel> _queue = [];
  int _currentIndex = 0;
  SongModel? _currentSong;

  AudioPlayerService(
    this._qualitySelector,
    this._prefetchService,
    this._songRepository,
  ) {
    _initAudioSession();
    _setupPlayerListeners();
  }

  Future<void> _initAudioSession() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
  }

  void _setupPlayerListeners() {
    _player.playerStateStream.listen((state) {
      if (state.processingState == ProcessingState.completed) {
        playNext();
      }
    });

    _player.positionStream.listen((position) {
      // Track playback progress
      if (_currentSong != null) {
        _trackPlaybackProgress(position);
      }
    });
  }

  Future<void> play(SongModel song) async {
    _currentSong = song;

    // Check local cache first
    final cachedPath = await _getCachedPath(song.id);
    if (cachedPath != null) {
      await _player.setFilePath(cachedPath);
      await _player.play();
      return;
    }

    // Get stream URL with adaptive quality
    final quality = await _qualitySelector.selectQuality();
    final streamUrl = await _songRepository.getStreamUrl(
      songId: song.id,
      quality: quality,
    );

    await _player.setUrl(streamUrl);
    await _player.play();

    // Track play event
    await _songRepository.trackPlay(songId: song.id);

    // Prefetch next songs
    _prefetchService.prefetchNext(_queue, _currentIndex);
  }

  Future<String?> _getCachedPath(String songId) async {
    // Check Isar cache for local file path
    return null; // Implement based on your cache structure
  }

  Future<void> _trackPlaybackProgress(Duration position) async {
    if (_currentSong == null) return;

    final duration = _player.duration ?? Duration.zero;
    final progress = duration.inMilliseconds > 0
        ? position.inMilliseconds / duration.inMilliseconds
        : 0.0;

    // Batch send every 10 seconds
    if (position.inSeconds % 10 == 0) {
      await _songRepository.trackPlayback(
        songId: _currentSong!.id,
        positionMs: position.inMilliseconds,
        durationMs: duration.inMilliseconds,
        progress: progress,
      );
    }
  }

  Future<void> pause() => _player.pause();
  Future<void> resume() => _player.play();
  Future<void> stop() => _player.stop();
  Future<void> seek(Duration position) => _player.seek(position);

  Future<void> playNext() async {
    if (_currentIndex < _queue.length - 1) {
      _currentIndex++;
      await play(_queue[_currentIndex]);
    }
  }

  Future<void> playPrevious() async {
    if (_currentIndex > 0) {
      _currentIndex--;
      await play(_queue[_currentIndex]);
    }
  }

  void setQueue(List<SongModel> queue, {int startIndex = 0}) {
    _queue = queue;
    _currentIndex = startIndex;
  }

  // Getters
  Stream<Duration> get positionStream => _player.positionStream;
  Stream<Duration?> get durationStream => _player.durationStream;
  Stream<bool> get playingStream => _player.playingStream;
  Stream<PlayerState> get playerStateStream => _player.playerStateStream;

  Duration get position => _player.position;
  Duration? get duration => _player.duration;
  bool get playing => _player.playing;
  SongModel? get currentSong => _currentSong;
  List<SongModel> get queue => _queue;
  int get currentIndex => _currentIndex;
}
```

### Quality Selector Service (`services/audio/quality_selector_service.dart`)

```dart
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:network_info_plus/network_info_plus.dart';

enum AudioQuality { high, medium, low }


class QualitySelectorService {
  final Connectivity _connectivity = Connectivity();
  final NetworkInfo _networkInfo = NetworkInfo();

  Future<AudioQuality> selectQuality() async {
    final connectivityResult = await _connectivity.checkConnectivity();

    if (connectivityResult.contains(ConnectivityResult.wifi)) {
      return AudioQuality.high; // 320kbps
    } else if (connectivityResult.contains(ConnectivityResult.mobile)) {
      // Check actual speed
      final speed = await _getNetworkSpeed();
      if (speed > 5.0) {
        return AudioQuality.medium; // 128kbps
      } else {
        return AudioQuality.low; // 64kbps
      }
    } else {
      return AudioQuality.low; // 64kbps for slow connections
    }
  }

  Future<double> _getNetworkSpeed() async {
    // Simplified speed detection
    // In production, use actual speed test or bandwidth estimation
    return 10.0; // Placeholder
  }

  String qualityToString(AudioQuality quality) {
    switch (quality) {
      case AudioQuality.high:
        return 'high';
      case AudioQuality.medium:
        return 'medium';
      case AudioQuality.low:
        return 'low';
    }
  }
}
```

### Prefetch Service (`services/audio/prefetch_service.dart`)

```dart
import '../../data/models/song/song_model.dart';
import '../../data/repositories/song_repository.dart';
import 'quality_selector_service.dart';

class PrefetchService {
  final SongRepository _songRepository;
  final QualitySelectorService _qualitySelector;

  PrefetchService(this._songRepository, this._qualitySelector);

  // Prefetch first 30 seconds of next 3 songs
  Future<void> prefetchNext(List<SongModel> queue, int currentIndex) async {
    final nextSongs = queue.skip(currentIndex + 1).take(3).toList();

    for (final song in nextSongs) {
      final quality = await _qualitySelector.selectQuality();
      // Prefetch only first 256KB (~30 seconds @ 64kbps)
      await _prefetchSongPartial(song.id, quality);
    }
  }

  Future<void> _prefetchSongPartial(String songId, AudioQuality quality) async {
    // Implement partial download (first 256KB)
    // Store in temp cache
    // Full download happens only if song actually plays
  }
}
```

---

## 🎨 UI/UX Components

### Song Tile Widget (`presentation/widgets/song/song_tile.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/song/song_model.dart';
import '../../providers/audio_player_provider.dart';

class SongTile extends ConsumerWidget {
  final SongModel song;
  final VoidCallback? onTap;

  const SongTile({
    Key? key,
    required this.song,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final audioPlayer = ref.watch(audioPlayerProvider);
    final isCurrentSong = audioPlayer.currentSong?.id == song.id;

    return ListTile(
      leading: CircleAvatar(
        backgroundImage: song.albumArt != null
            ? NetworkImage(song.albumArt!)
            : null,
        child: song.albumArt == null
            ? const Icon(Icons.music_note)
            : null,
      ),
      title: Text(
        song.title,
        style: TextStyle(
          fontWeight: isCurrentSong ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      subtitle: Text(song.artist),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
children: [
          IconButton(
            icon: Icon(
              song.isFavorite ? Icons.favorite : Icons.favorite_border,
              color: song.isFavorite ? Colors.red : null,
            ),
            onPressed: () {
              // Toggle favorite
            },
          ),
          if (isCurrentSong)
            const Icon(Icons.equalizer, color: Colors.blue),
        ],
      ),
      onTap: onTap ?? () {
        ref.read(audioPlayerProvider.notifier).playSong(song);
      },
    );
  }
}
```

### Mini Player Widget (`presentation/widgets/player/mini_player.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/audio_player_provider.dart';

class MiniPlayer extends ConsumerWidget {
  const MiniPlayer({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final audioState = ref.watch(audioPlayerProvider);
    final audioNotifier = ref.read(audioPlayerProvider.notifier);

    if (audioState.currentSong == null) {
      return const SizedBox.shrink();
    }

    final song = audioState.currentSong!;

    return Container(
      height: 70,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Album Art
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              image: song.albumArt != null
                  ? DecorationImage(
                      image: NetworkImage(song.albumArt!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
        child: song.albumArt == null
                ? const Icon(Icons.music_note)
                : null,
          ),
          // Song Info
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    song.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    song.artist,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          // Play/Pause Button
          IconButton(
            icon: Icon(
              audioState.isPlaying ? Icons.pause : Icons.play_arrow,
            ),
            onPressed: () {
              if (audioState.isPlaying) {
                audioNotifier.pause();
              } else {
                audioNotifier.resume();
              }
            },
          ),
          // Expand Button
          IconButton(
            icon: const Icon(Icons.expand_less),
            onPressed: () {
              Navigator.pushNamed(context, '/player');
            },
          ),
        ],
      ),
    );
  }
}
```

### Full Player Screen (`presentation/screens/player/player_screen.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/audio_player_provider.dart';
import '../../widgets/player/seek_bar.dart';
import '../../widgets/player/play_pause_button.dart';
import '../../widgets/player/quality_selector.dart';

class PlayerScreen extends ConsumerWidget {
  const PlayerScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final audioState = ref.watch(audioPlayerProvider);
    final audioNotifier = ref.read(audioPlayerProvider.notifier);

    if (audioState.currentSong == null) {
      return const Scaffold(
        body: Center(child: Text('No song playing')),
      );
    }

    final song = audioState.currentSong!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // App Bar
            AppBar(
              leading: IconButton(
                icon: const Icon(Icons.expand_more),
                onPressed: () => Navigator.pop(context),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.more_vert),
                  onPressed: () {
                    // Show options menu
                  },
                ),
              ],
            ),
            // Album Art
            Expanded(
              child: Center(
                child: Container(
                  width: MediaQuery.of(context).size.width * 0.8,
                  height: MediaQuery.of(context).size.width * 0.8,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 20,
                        spreadRadius: 5,
                      ),
                    ],
                    image: song.albumArt != null
                        ? DecorationImage(
                            image: NetworkImage(song.albumArt!),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: song.albumArt == null
                      ? const Icon(Icons.music_note, size: 100)
                      : null,
                ),
              ),
            ),
            // Song Info
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  Text(
                    song.title,
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    song.artist,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  // Seek Bar
                  SeekBar(
                    position: audioState.position,
                    duration: audioState.duration,
                    onSeek: (position) => audioNotifier.seek(position),
                  ),
                  const SizedBox(height: 24),
                  // Controls
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.shuffle),
                        iconSize: 28,
                        onPressed: () {
                          // Toggle shuffle
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.skip_previous),
                        iconSize: 36,
                        onPressed: () => audioNotifier.playPrevious(),
                      ),
                      PlayPauseButton(
                        isPlaying: audioState.isPlaying,
                        onPressed: () {
                          if (audioState.isPlaying) {
                            audioNotifier.pause();
                          } else {
                            audioNotifier.resume();
                          }
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.skip_next),
                        iconSize: 36,
                        onPressed: () => audioNotifier.playNext(),
                      ),
                      IconButton(
                        icon: const Icon(Icons.repeat),
                        iconSize: 28,
                        onPressed: () {
                          // Toggle repeat
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Quality Selector
                  QualitySelector(
                    currentQuality: 'high',
                    onQualityChanged: (quality) {
                      // Change quality
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 📱 Screens & Navigation

### Main App Structure (`lib/app.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/home/home_screen.dart';
import 'presentation/providers/auth_provider.dart';

class FreeTuneApp extends ConsumerWidget {
  const FreeTuneApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'FreeTune',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: authState.when(
        data: (user) => user != null ? const HomeScreen() : const LoginScreen(),
        loading: () => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
        error: (error, stack) => const LoginScreen(),
      ),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const HomeScreen(),
        '/player': (context) => const PlayerScreen(),
      },
    );
  }
}
```

### Home Screen (`presentation/screens/home/home_screen.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../songs/songs_list_screen.dart';
import '../playlists/playlists_screen.dart';
import '../profile/profile_screen.dart';
import '../../widgets/player/mini_player.dart';
import '../../providers/songs_provider.dart';
import '../../providers/recommendations_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeTab(),
    const SongsListScreen(),
    const PlaylistsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          _screens[_currentIndex],
          const Align(
            alignment: Alignment.bottomCenter,
            child: MiniPlayer(),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.music_note), label: 'Songs'),
          BottomNavigationBarItem(icon: Icon(Icons.playlist_play), label: 'Playlists'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class HomeTab extends ConsumerWidget {
  const HomeTab({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recommendations = ref.watch(recommendationsProvider);
    final popularSongs = ref.watch(popularSongsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(recommendationsProvider);
        ref.invalidate(popularSongsProvider);
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Trending Section
            _buildSection(
              context,
              title: 'Trending Now',
              songs: popularSongs.when(
                data: (songs) => songs,
                loading: () => [],
                error: (_, __) => [],
              ),
            ),
            const SizedBox(height: 24),
            // Recommendations Section
            _buildSection(
              context,
              title: 'For You',
              songs: recommendations.when(
                data: (songs) => songs,
                loading: () => [],
                error: (_, __) => [],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(BuildContext context, {required String title, required List songs}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 200,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: songs.length,
            itemBuilder: (context, index) {
              // Song card widget
              return Container(
                width: 150,
                margin: const EdgeInsets.only(right: 12),
                child: Card(
                  child: Column(
                    children: [
                      // Album art
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            image: songs[index].albumArt != null
                                ? DecorationImage(
                                    image: NetworkImage(songs[index].albumArt!),
                                    fit: BoxFit.cover,
                                  )
                                : null,
                          ),
                        ),
                      ),
                      // Song info
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              songs[index].title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            Text(
                              songs[index].artist,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
```

### Login Screen (`presentation/screens/auth/login_screen.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../core/utils/validators.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
        );

    if (success && mounted) {
      Navigator.pushReplacementNamed(context, '/home');
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Login failed. Please check your credentials.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo
                  const Icon(Icons.music_note, size: 80, color: Colors.blue),
                  const SizedBox(height: 32),
                  // Title
                  Text(
                    'FreeTune',
                    style: Theme.of(context).textTheme.headlineMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 48),
                  // Email Field
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email),
                    ),
                    validator: Validators.email,
                  ),
                  const SizedBox(height: 16),
                  // Password Field
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() => _obscurePassword = !_obscurePassword);
                        },
                      ),
                    ),
                    validator: Validators.required,
                  ),
                  const SizedBox(height: 24),
                  // Login Button
                  ElevatedButton(
                    onPressed: authState.isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: authState.isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Login'),
                  ),
                  const SizedBox(height: 16),
                  // Register Link
                  TextButton(
                    onPressed: () {
                      Navigator.pushNamed(context, '/register');
                    },
                    child: const Text('Don\'t have an account? Register'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## ⚡ Performance Optimizations

### 1. **Lazy Loading & Pagination**

```dart
// Infinite scroll implementation
class SongsListScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<SongsListScreen> createState() => _SongsListScreenState();
}

class _SongsListScreenState extends ConsumerState<SongsListScreen> {
  final ScrollController _scrollController = ScrollController();
  int _currentPage = 1;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.8) {
      if (_hasMore) {
        _loadMore();
      }
    }
  }

  Future<void> _loadMore() async {
    _currentPage++;
    await ref.read(songsProvider.notifier).loadMore(_currentPage);
    setState(() {
      _hasMore = ref.read(songsProvider).hasMore;
    });
  }

  @override
  Widget build(BuildContext context) {
    final songsState = ref.watch(songsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Songs')),
      body: songsState.when(
        data: (songs) => ListView.builder(
          controller: _scrollController,
          itemCount: songs.length + (_hasMore ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == songs.length) {
              return const Center(child: CircularProgressIndicator());
            }
            return SongTile(song: songs[index]);
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
```

### 2. **Image Caching**

```dart
// Use cached_network_image for album art
CachedNetworkImage(
  imageUrl: song.albumArt ?? '',
  placeholder: (context, url) => const CircularProgressIndicator(),
  errorWidget: (context, url, error) => const Icon(Icons.music_note),
  fit: BoxFit.cover,
)
```

### 3. **Debounced Search**

```dart
import 'package:flutter/material.dart';
import 'dart:async';

class DebouncedSearch extends StatefulWidget {
  final Function(String) onSearch;

  const DebouncedSearch({required this.onSearch});

  @override
  State<DebouncedSearch> createState() => _DebouncedSearchState();
}

class _DebouncedSearchState extends State<DebouncedSearch> {
  Timer? _debounce;
  final _controller = TextEditingController();

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      widget.onSearch(query);
    });
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      decoration: const InputDecoration(
        hintText: 'Search songs...',
        prefixIcon: Icon(Icons.search),
      ),
      onChanged: _onSearchChanged,
    );
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests Example

```dart
// test/domain/usecases/auth/login_usecase_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:freetune/domain/usecases/auth/login_usecase.dart';
import 'package:freetune/data/repositories/auth_repository.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late LoginUseCase loginUseCase;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    loginUseCase = LoginUseCase(mockRepository);
  });

  test('should return user when login is successful', () async {
    // Arrange
    when(mockRepository.login('test@example.com', 'password'))
        .thenAnswer((_) async => UserModel(id: '1', email: 'test@example.com'));

    // Act
    final result = await loginUseCase('test@example.com', 'password');

    // Assert
    expect(result, isA<UserModel>());
    expect(result.email, 'test@example.com');
  });
}
```

---

## 📝 Implementation Checklist

### Phase 1: Core Setup (Week 1)

- [ ] Initialize Flutter project
- [ ] Setup dependencies (Getx, Isar, just_audio, Dio)
- [ ] Configure API client with interceptors
- [ ] Setup Isar database
- [ ] Create base models (User, Song, Playlist)
- [ ] Implement authentication flow

### Phase 2: Audio Player (Week 2)

- [ ] Implement AudioPlayerService
- [ ] Setup quality selector
- [ ] Implement prefetch service
- [ ] Create mini player widget
- [ ] Create full player screen
- [ ] Test playback with backend

### Phase 3: Core Features (Week 3)

- [ ] Songs list screen with pagination
- [ ] Search functionality
- [ ] Playlists management
- [ ] Favorites functionality
- [ ] Recently played
- [ ] Recommendations integration

### Phase 4: Caching & Optimization (Week 4)

- [ ] Implement cache manager
- [ ] Setup LRU eviction
- [ ] Implement offline mode
- [ ] Add network detection
- [ ] Optimize image loading
- [ ] Performance profiling

### Phase 5: Polish & Testing (Week 5)

- [ ] UI/UX improvements
- [ ] Error handling
- [ ] Loading states
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance testing

---

## 🔗 Backend API Integration Summary

### Base URL Configuration

```dart
// config/api_config.dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:3000/api/v1';
  // Production: 'https://your-domain.vercel.app/api/v1'

  static const bool isDevelopment = true;
}
```

### All API Endpoints Mapped

✅ **Authentication** (11 endpoints)

- Register, Login, Logout
- Get Current User, Update Profile
- Change Password, Refresh Token
- Forgot Password, Reset Password
- Verify Email, Resend Verification

✅ **Songs** (15 endpoints)

- List, Search, Popular, Recently Played, Favorites
- Get by ID, Upload, Update Metadata, Delete
- Stream URL, Stream, File Info
- Toggle Favorite, Track Play, Track Playback

✅ **Playlists** (7 endpoints)

- List, Create, Get by ID, Update, Delete
- Add Song, Remove Song

✅ **Recommendations** (6 endpoints)

- Get Personalized, Similar Songs, Mood-based
- Trending, Stats, Top Songs

✅ **Analytics** (7 endpoints)

- Track Listening, Get Stats, Top Songs
- Time Patterns, Genre Preferences, Mood Preferences, Trending

---

## 🎯 Key Performance Targets

| Metric                 | Target | Implementation                 |
| ---------------------- | ------ | ------------------------------ |
| **Time to First Play** | <800ms | Cache-first + Prefetch         |
| **Search Latency**     | <100ms | Debounced + Cached results     |
| **App Start Time**     | <2s    | Lazy loading + Code splitting  |
| **Data Usage (1hr)**   | <50MB  | Adaptive bitrate (avg 128kbps) |
| **Cache Hit Rate**     | >70%   | Aggressive caching + LRU       |

---

## 📚 Additional Resources

### Code Generation Commands

```bash
# Generate Riverpod providers
flutter pub run build_runner build --delete-conflicting-outputs

# Generate Isar database code
flutter pub run build_runner build

# Watch mode for development
flutter pub run build_runner watch
```

### Environment Setup

```dart
// lib/config/app_config.dart
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );

  static const bool enableLogging = bool.fromEnvironment(
    'ENABLE_LOGGING',
    defaultValue: true,
  );
}
```

---

**This structure provides a complete foundation for building the FreeTune Flutter app that integrates seamlessly with your backend API. Follow the implementation checklist to build it step by step!** 🚀🎵
