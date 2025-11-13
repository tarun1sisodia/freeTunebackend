const asyncHandler = requestHandler => {
  return function (req, res, next) {
    try {
      const maybePromise = requestHandler(req, res, next);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
};

export { asyncHandler };
