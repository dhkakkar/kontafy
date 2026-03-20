import 'user_profile.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final UserProfile? user;
  final UserOrganization? currentOrg;
  final bool isLoading;
  final String? error;

  const AuthState({this.status = AuthStatus.unknown, this.user, this.currentOrg, this.isLoading = false, this.error});

  AuthState copyWith({AuthStatus? status, UserProfile? user, UserOrganization? currentOrg, bool? isLoading, String? error}) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      currentOrg: currentOrg ?? this.currentOrg,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated;
}
