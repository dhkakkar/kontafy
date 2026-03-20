import 'dart:convert';

class UserProfile {
  final String id;
  final String email;
  final String? name;
  final String? phone;
  final String? avatarUrl;
  final List<UserOrganization> organizations;

  UserProfile({required this.id, required this.email, this.name, this.phone, this.avatarUrl, this.organizations = const []});

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? json['fullName'],
      phone: json['phone'],
      avatarUrl: json['avatar_url'] ?? json['avatarUrl'],
      organizations: (json['organizations'] as List<dynamic>?)?.map((o) => UserOrganization.fromJson(o)).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id, 'email': email, 'name': name, 'phone': phone,
    'avatar_url': avatarUrl, 'organizations': organizations.map((o) => o.toJson()).toList(),
  };

  String toJsonString() => jsonEncode(toJson());
  static UserProfile fromJsonString(String json) => UserProfile.fromJson(jsonDecode(json));

  String get initials {
    if (name != null && name!.isNotEmpty) {
      return name!.split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase();
    }
    return email.isNotEmpty ? email[0].toUpperCase() : 'U';
  }
}

class UserOrganization {
  final String id;
  final String name;
  final String? gstin;
  final String? logoUrl;
  final int financialYearStart;

  UserOrganization({required this.id, required this.name, this.gstin, this.logoUrl, this.financialYearStart = 4});

  factory UserOrganization.fromJson(Map<String, dynamic> json) {
    return UserOrganization(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      gstin: json['gstin'],
      logoUrl: json['logo_url'] ?? json['logoUrl'],
      financialYearStart: json['financial_year_start'] ?? json['financialYearStart'] ?? 4,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'gstin': gstin, 'logo_url': logoUrl, 'financial_year_start': financialYearStart};
}
