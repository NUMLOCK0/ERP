class Response {
  static success(data = null, message = 'success') {
    return { code: 0, data, message };
  }

  static error(message = 'error') {
    return { code: -1, message };
  }

  static paginate(list, total, page, pageSize) {
    return {
      code: 0,
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      message: 'success'
    };
  }
}

module.exports = Response;
