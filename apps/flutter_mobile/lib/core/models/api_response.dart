class ApiResponse<T> {
  final bool success;
  final T data;
  final Map<String, dynamic>? meta;

  ApiResponse({required this.success, required this.data, this.meta});

  factory ApiResponse.fromJson(Map<String, dynamic> json, T Function(dynamic) fromData) {
    return ApiResponse(
      success: json['success'] ?? true,
      data: fromData(json['data']),
      meta: json['meta'],
    );
  }
}

class PaginatedResponse<T> {
  final List<T> data;
  final int total;
  final int page;
  final int limit;

  PaginatedResponse({required this.data, required this.total, required this.page, required this.limit});

  bool get hasMore => page * limit < total;
}
