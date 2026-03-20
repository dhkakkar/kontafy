import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final _storage = const FlutterSecureStorage();

  static const _keyAccessToken = 'kontafy_access_token';
  static const _keyRefreshToken = 'kontafy_refresh_token';
  static const _keyOrgId = 'kontafy_org_id';
  static const _keyUser = 'kontafy_user';

  Future<String?> getAccessToken() => _storage.read(key: _keyAccessToken);
  Future<void> setAccessToken(String token) => _storage.write(key: _keyAccessToken, value: token);

  Future<String?> getRefreshToken() => _storage.read(key: _keyRefreshToken);
  Future<void> setRefreshToken(String token) => _storage.write(key: _keyRefreshToken, value: token);

  Future<String?> getOrgId() => _storage.read(key: _keyOrgId);
  Future<void> setOrgId(String id) => _storage.write(key: _keyOrgId, value: id);

  Future<String?> getCachedUser() => _storage.read(key: _keyUser);
  Future<void> setCachedUser(String json) => _storage.write(key: _keyUser, value: json);

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
