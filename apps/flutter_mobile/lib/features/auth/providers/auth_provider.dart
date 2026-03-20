import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../models/auth_state.dart';
import '../models/user_profile.dart';
import '../repositories/auth_repository.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) => SecureStorageService());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.watch(secureStorageProvider)));
final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(ref.watch(apiClientProvider), ref.watch(secureStorageProvider)));

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider), ref.watch(secureStorageProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;
  final SecureStorageService _storage;

  AuthNotifier(this._repo, this._storage) : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    state = state.copyWith(isLoading: true);
    final hasToken = await _repo.hasToken();
    if (!hasToken) {
      state = state.copyWith(status: AuthStatus.unauthenticated, isLoading: false);
      return;
    }
    // Load cached user immediately
    final cached = await _repo.getCachedUser();
    if (cached != null) {
      final orgId = await _storage.getOrgId();
      final org = cached.organizations.where((o) => o.id == orgId).firstOrNull ?? cached.organizations.firstOrNull;
      state = state.copyWith(status: AuthStatus.authenticated, user: cached, currentOrg: org, isLoading: false);
    }
    // Refresh in background
    try {
      final user = await _repo.fetchProfile();
      final orgId = await _storage.getOrgId();
      final org = user.organizations.where((o) => o.id == orgId).firstOrNull ?? user.organizations.firstOrNull;
      state = state.copyWith(status: AuthStatus.authenticated, user: user, currentOrg: org, isLoading: false);
    } catch (_) {
      if (cached == null) {
        state = state.copyWith(status: AuthStatus.unauthenticated, isLoading: false);
      }
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _repo.login(email, password);
      final orgId = await _storage.getOrgId();
      final org = user.organizations.where((o) => o.id == orgId).firstOrNull ?? user.organizations.firstOrNull;
      state = state.copyWith(status: AuthStatus.authenticated, user: user, currentOrg: org, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> signup(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _repo.signup(name, email, password);
      final orgId = await _storage.getOrgId();
      final org = user.organizations.where((o) => o.id == orgId).firstOrNull ?? user.organizations.firstOrNull;
      state = state.copyWith(status: AuthStatus.authenticated, user: user, currentOrg: org, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> switchOrganization(String orgId) async {
    await _storage.setOrgId(orgId);
    final org = state.user?.organizations.where((o) => o.id == orgId).firstOrNull;
    state = state.copyWith(currentOrg: org);
  }

  Future<void> refreshProfile() async {
    try {
      final user = await _repo.fetchProfile();
      final orgId = await _storage.getOrgId();
      final org = user.organizations.where((o) => o.id == orgId).firstOrNull ?? user.organizations.firstOrNull;
      state = state.copyWith(user: user, currentOrg: org ?? state.currentOrg);
    } catch (_) {}
  }
}
