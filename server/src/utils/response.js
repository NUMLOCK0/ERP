class Response {
  static success(data = null, message = 'success') {
    return { code: 0, data, message };
  }

  static error(message = 'error', code = -1) {
    return { code, message };
  }

  static paginate(list, total, page, pageSize) {
    return {
      code: 0,
      message: 'success',
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPage: Math.ceil(total / pageSize)
      }
    };
  }
}

module.exports = Response;
