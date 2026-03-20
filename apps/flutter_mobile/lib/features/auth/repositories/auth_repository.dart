import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/constants/api_constants.dart';
import '../models/user_profile.dart';

class AuthRepository {
  final ApiClient _api;
  final SecureStorageService _storage;

  AuthRepository(this._api, this._storage);

  Future<UserProfile> login(String email, String password) async {
    final res = await _api.post(Endpoints.login, data: {'email': email, 'password': password});
    final data = res['data'] ?? res;
    await _storage.setAccessToken(data['access_token'] ?? data['session']?['access_token'] ?? '');
    await _storage.setRefreshToken(data['refresh_token'] ?? data['session']?['refresh_token'] ?? '');
    return fetchProfile();
  }

  Future<UserProfile> signup(String name, String email, String password) async {
    final res = await _api.post(Endpoints.signup, data: {'name': name, 'email': email, 'password': password});
    final data = res['data'] ?? res;
    final token = data['access_token'] ?? data['session']?['access_token'];
    if (token != null) {
      await _storage.setAccessToken(token);
      await _storage.setRefreshToken(data['refresh_token'] ?? data['session']?['refresh_token'] ?? '');
    }
    return fetchProfile();
  }

  Future<UserProfile> fetchProfile() async {
    final res = await _api.get(Endpoints.me);
    final data = res['data'] ?? res;
    final user = UserProfile.fromJson(data);
    await _storage.setCachedUser(user.toJsonString());
    if (user.organizations.isNotEmpty) {
      final currentOrgId = await _storage.getOrgId();
      if (currentOrgId == null || currentOrgId.isEmpty) {
        await _storage.setOrgId(user.organizations.first.id);
      }
    }
    return user;
  }

  Future<void> logout() async {
    try {
      await _api.post(Endpoints.logout);
    } catch (_) {}
    await _storage.clearAll();
  }

  Future<UserProfile?> getCachedUser() async {
    final json = await _storage.getCachedUser();
    if (json == null) return null;
    try {
      return UserProfile.fromJsonString(json);
    } catch (_) {
      return null;
    }
  }

  Future<bool> hasToken() async {
    final token = await _storage.getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
